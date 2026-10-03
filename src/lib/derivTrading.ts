import { DERIV_WS_URL } from '@/lib/derivConfig';
import { fetchAuthenticatedWsUrl, isBearerAccessToken } from '@/lib/derivOAuth';

export const VERIFY_STAKE = 0.35;
export const VERIFY_SYMBOL = 'R_10';
export const VERIFY_CONTRACT = 'DIGITODD' as const;

export type DigitContractType =
  | 'DIGITODD'
  | 'DIGITEVEN'
  | 'DIGITOVER'
  | 'DIGITUNDER'
  | 'DIGITMATCH'
  | 'DIGITDIFF'
  | 'CALL'
  | 'PUT'
  | 'ACCU';

export interface AuthorizeInfo {
  loginid: string;
  balance: number;
  currency: string;
  email?: string;
  fullname?: string;
}

export interface ProposalResult {
  id: string;
  askPrice: number;
  payout: number;
  spot?: number;
}

export interface BuyResult {
  contractId: number;
  buyPrice: number;
  payout: number;
  transactionId: number;
  longcode?: string;
}

export interface VerificationResult {
  ok: boolean;
  message: string;
  authorize?: AuthorizeInfo;
  buy?: BuyResult;
}

type Pending = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

let reqId = 1;

/** Low-level Deriv WS client — legacy authorize token OR OAuth2 Bearer via OTP URL */
export class DerivTradingClient {
  private ws: WebSocket | null = null;
  private socketUrl: string | null = null;
  private pending = new Map<number, Pending>();
  private authorized: AuthorizeInfo | null = null;
  private token: string | null = null;
  private accountId: string | null = null;
  private connectPromise: Promise<void> | null = null;
  private authMode: 'legacy' | 'oauth2' = 'legacy';

  get account() {
    return this.authorized;
  }

  get isAuthorized() {
    return !!this.authorized;
  }

  get mode() {
    return this.authMode;
  }

  async connect(url = DERIV_WS_URL): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN && this.socketUrl === url) return;
    if (this.connectPromise && this.socketUrl === url) return this.connectPromise;

    const previous = this.ws;
    this.ws = null;
    if (previous) {
      previous.onopen = null;
      previous.onerror = null;
      previous.onclose = null;
      previous.onmessage = null;
      previous.close();
    }

    this.socketUrl = url;
    this.connectPromise = new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        if (this.ws === ws) resolve();
      };
      ws.onerror = () => {
        if (this.ws === ws) reject(new Error('Deriv WebSocket connection failed'));
      };
      ws.onclose = () => {
        // Ignore the close from a socket we already replaced.
        if (this.ws !== ws) return;
        this.ws = null;
        this.connectPromise = null;
        this.rejectAll(new Error('Deriv WebSocket closed'));
      };
      ws.onmessage = (event) => {
        if (this.ws === ws) this.handleMessage(event.data);
      };
    }).finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  disconnect() {
    this.token = null;
    this.accountId = null;
    this.authorized = null;
    this.authMode = 'legacy';
    this.socketUrl = null;
    const previous = this.ws;
    this.ws = null;
    if (previous) {
      previous.onopen = null;
      previous.onerror = null;
      previous.onclose = null;
      previous.onmessage = null;
      previous.close();
    }
    this.rejectAll(new Error('Disconnected'));
  }

  /** Legacy API token (a1-…) authorize on public WS */
  async authorize(token: string): Promise<AuthorizeInfo> {
    if (isBearerAccessToken(token)) {
      throw new Error('Bearer token requires authorizeOAuth2(accessToken, accountId)');
    }
    await this.connect(DERIV_WS_URL);
    this.token = token;
    this.authMode = 'legacy';
    const data = (await this.send({ authorize: token })) as {
      error?: { message?: string };
      authorize?: {
        loginid: string;
        balance: number;
        currency: string;
        email?: string;
        fullname?: string;
      };
    };

    if (data.error || !data.authorize) {
      throw new Error(data.error?.message || 'Authorization failed');
    }

    this.accountId = data.authorize.loginid;
    this.authorized = {
      loginid: data.authorize.loginid,
      balance: Number(data.authorize.balance),
      currency: data.authorize.currency || 'USD',
      email: data.authorize.email,
      fullname: data.authorize.fullname,
    };
    return this.authorized;
  }

  /** OAuth2 session only. The trading socket is opened later, once per order. */
  async authorizeOAuth2(
    accessToken: string,
    accountId: string,
    meta?: { currency?: string; balance?: number }
  ): Promise<AuthorizeInfo> {
    this.token = accessToken;
    this.accountId = accountId;
    this.authMode = 'oauth2';
    this.authorized = {
      loginid: accountId,
      balance: meta?.balance ?? 0,
      currency: meta?.currency || 'USD',
    };
    return this.authorized;
  }

  /** Auto-pick legacy vs OAuth2 */
  async authorizeSmart(
    token: string,
    opts?: { accountId?: string; currency?: string; balance?: number }
  ): Promise<AuthorizeInfo> {
    if (isBearerAccessToken(token)) {
      if (!opts?.accountId) throw new Error('OAuth2 login needs an account id');
      return this.authorizeOAuth2(token, opts.accountId, {
        currency: opts.currency,
        balance: opts.balance,
      });
    }
    return this.authorize(token);
  }

  async getBalance(): Promise<number> {
    const data = (await this.send({ balance: 1 })) as {
      error?: { message?: string };
      balance?: { balance: number };
    };
    if (data.error) throw new Error(data.error.message || 'Balance failed');
    const bal = Number(data.balance?.balance ?? 0);
    if (this.authorized) this.authorized = { ...this.authorized, balance: bal };
    return bal;
  }

  async propose(params: {
    contractType: DigitContractType;
    symbol: string;
    amount: number;
    currency?: string;
    duration?: number;
    durationUnit?: 't' | 's' | 'm';
    barrier?: string | number;
    growthRate?: number;
  }): Promise<ProposalResult> {
    const currency = params.currency || this.authorized?.currency || 'USD';
    const payload: Record<string, unknown> = {
      proposal: 1,
      amount: params.amount,
      basis: 'stake',
      contract_type: params.contractType,
      currency,
    };
    // New OAuth OTP socket uses underlying_symbol. Legacy public socket uses symbol.
    if (this.authMode === 'oauth2') payload.underlying_symbol = params.symbol;
    else payload.symbol = params.symbol;

    if (params.contractType === 'ACCU') {
      payload.growth_rate = params.growthRate ?? 0.01;
    } else {
      payload.duration = params.duration ?? 1;
      payload.duration_unit = params.durationUnit ?? 't';
    }

    if (params.barrier !== undefined && params.barrier !== '') {
      payload.barrier = String(params.barrier);
    }

    const data = (await this.send(payload)) as {
      error?: { message?: string };
      proposal?: { id: string; ask_price: number; payout: number; spot?: number };
    };

    if (data.error || !data.proposal) {
      throw new Error(data.error?.message || 'Proposal failed');
    }

    return {
      id: data.proposal.id,
      askPrice: Number(data.proposal.ask_price),
      payout: Number(data.proposal.payout),
      spot: data.proposal.spot,
    };
  }

  async buy(proposalId: string, price: number): Promise<BuyResult> {
    const data = (await this.send({ buy: proposalId, price })) as {
      error?: { message?: string };
      buy?: {
        contract_id: number;
        buy_price: number;
        payout: number;
        transaction_id: number;
        longcode?: string;
      };
    };

    if (data.error || !data.buy) {
      throw new Error(data.error?.message || 'Buy failed');
    }

    return {
      contractId: data.buy.contract_id,
      buyPrice: Number(data.buy.buy_price),
      payout: Number(data.buy.payout),
      transactionId: data.buy.transaction_id,
      longcode: data.buy.longcode,
    };
  }

  async placeTrade(params: {
    contractType: DigitContractType;
    symbol: string;
    amount: number;
    duration?: number;
    durationUnit?: 't' | 's' | 'm';
    barrier?: string | number;
    growthRate?: number;
  }): Promise<BuyResult> {
    if (!this.token || !this.authorized) {
      throw new Error('Not authorized — connect a Deriv token first');
    }

    const oauth = this.authMode === 'oauth2';
    const url = oauth
      ? await fetchAuthenticatedWsUrl(this.token, this.accountId || this.authorized.loginid)
      : DERIV_WS_URL;

    return this.orderOnFreshSocket(url, params, oauth);
  }

  /** One OTP (or public) socket per order. Proposal is sent only after onopen; buy stays on that socket. */
  private orderOnFreshSocket(
    url: string,
    params: {
      contractType: DigitContractType;
      symbol: string;
      amount: number;
      duration?: number;
      durationUnit?: 't' | 's' | 'm';
      barrier?: string | number;
      growthRate?: number;
    },
    oauth: boolean
  ): Promise<BuyResult> {
    const token = this.token;
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const pending = new Map<number, Pending>();
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const closeSocket = () => {
        ws.onopen = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.onmessage = null;
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        pending.forEach((item) => item.reject(error));
        pending.clear();
        closeSocket();
        reject(error);
      };

      const succeed = (buy: BuyResult) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        closeSocket();
        resolve(buy);
      };

      const send = (payload: Record<string, unknown>) =>
        new Promise<Record<string, unknown>>((res, rej) => {
          if (ws.readyState !== WebSocket.OPEN) {
            rej(new Error('WebSocket not connected'));
            return;
          }
          const id = reqId++;
          pending.set(id, {
            resolve: (value) => res(value as Record<string, unknown>),
            reject: rej,
          });
          ws.send(JSON.stringify({ ...payload, req_id: id }));
        });

      timer = setTimeout(() => fail(new Error('Deriv request timed out')), 20000);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as { req_id?: number };
          if (data.req_id == null) return;
          const waiter = pending.get(data.req_id);
          if (!waiter) return;
          pending.delete(data.req_id);
          waiter.resolve(data);
        } catch {
          /* ignore malformed */
        }
      };
      ws.onerror = () => fail(new Error('Deriv WebSocket connection failed'));
      ws.onclose = () => {
        if (!settled) fail(new Error('Deriv WebSocket closed'));
      };
      ws.onopen = () => {
        void (async () => {
          try {
            if (!oauth) {
              const auth = (await send({ authorize: token })) as {
                error?: { message?: string };
                authorize?: { balance?: number; currency?: string };
              };
              if (auth.error || !auth.authorize) {
                throw new Error(auth.error?.message || 'Authorization failed');
              }
            }

            const currency = this.authorized?.currency || 'USD';
            const proposalPayload: Record<string, unknown> = {
              proposal: 1,
              amount: params.amount,
              basis: 'stake',
              contract_type: params.contractType,
              currency,
            };
            if (oauth) proposalPayload.underlying_symbol = params.symbol;
            else proposalPayload.symbol = params.symbol;
            if (params.contractType === 'ACCU') {
              proposalPayload.growth_rate = params.growthRate ?? 0.01;
            } else {
              proposalPayload.duration = params.duration ?? 1;
              proposalPayload.duration_unit = params.durationUnit ?? 't';
            }
            if (params.barrier !== undefined && params.barrier !== '') {
              proposalPayload.barrier = String(params.barrier);
            }

            const proposal = (await send(proposalPayload)) as {
              error?: { message?: string };
              proposal?: { id: string; ask_price: number };
            };
            if (proposal.error || !proposal.proposal?.id) {
              throw new Error(proposal.error?.message || 'Proposal failed');
            }

            const price = Number(proposal.proposal.ask_price);
            const bought = (await send({ buy: proposal.proposal.id, price })) as {
              error?: { message?: string };
              buy?: {
                contract_id: number;
                buy_price: number;
                payout: number;
                transaction_id: number;
                longcode?: string;
              };
            };
            if (bought.error || !bought.buy) {
              throw new Error(bought.error?.message || 'Buy failed');
            }

            succeed({
              contractId: bought.buy.contract_id,
              buyPrice: Number(bought.buy.buy_price),
              payout: Number(bought.buy.payout),
              transactionId: bought.buy.transaction_id,
              longcode: bought.buy.longcode,
            });
          } catch (err) {
            fail(err instanceof Error ? err : new Error('Trade failed'));
          }
        })();
      };
    });
  }

  async runVerificationTrade(
    token: string,
    opts?: { accountId?: string; currency?: string }
  ): Promise<VerificationResult> {
    try {
      const authorize = await this.authorizeSmart(token, opts);
      const buy = await this.placeTrade({
        contractType: VERIFY_CONTRACT,
        symbol: VERIFY_SYMBOL,
        amount: VERIFY_STAKE,
        duration: 1,
        durationUnit: 't',
      });
      return {
        ok: true,
        message: `Verified ${authorize.loginid} — DIGITODD $${VERIFY_STAKE} on ${VERIFY_SYMBOL} (#${buy.contractId})`,
        authorize,
        buy,
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Verification trade failed',
        authorize: this.authorized ?? undefined,
      };
    }
  }

  private handleMessage(raw: string) {
    try {
      const data = JSON.parse(raw) as { req_id?: number; msg_type?: string; error?: unknown };
      const id = data.req_id;
      if (id == null) return;
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      pending.resolve(data);
    } catch {
      // ignore malformed
    }
  }

  private async send(payload: Record<string, unknown>): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (!this.socketUrl) throw new Error('WebSocket not connected');
      await this.connect(this.socketUrl);
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      const id = reqId++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ ...payload, req_id: id }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('Deriv request timed out'));
        }
      }, 20000);
    });
  }

  private rejectAll(error: Error) {
    this.pending.forEach((p) => p.reject(error));
    this.pending.clear();
  }
}

export const tradingClient = new DerivTradingClient();
