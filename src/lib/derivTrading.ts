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
  private pending = new Map<number, Pending>();
  private authorized: AuthorizeInfo | null = null;
  private token: string | null = null;
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
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Reconnect if URL changed
      if ((this.ws as WebSocket & { _patelUrl?: string })._patelUrl === url) return;
      this.ws.close();
      this.ws = null;
    }
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise((resolve, reject) => {
      const ws = new WebSocket(url) as WebSocket & { _patelUrl?: string };
      ws._patelUrl = url;
      this.ws = ws;

      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error('Deriv WebSocket connection failed'));
      ws.onclose = () => {
        this.ws = null;
        this.connectPromise = null;
        this.rejectAll(new Error('Deriv WebSocket closed'));
      };
      ws.onmessage = (event) => this.handleMessage(event.data);
    }).finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  disconnect() {
    this.token = null;
    this.authorized = null;
    this.authMode = 'legacy';
    if (this.ws) {
      this.ws.close();
      this.ws = null;
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

    this.authorized = {
      loginid: data.authorize.loginid,
      balance: Number(data.authorize.balance),
      currency: data.authorize.currency || 'USD',
      email: data.authorize.email,
      fullname: data.authorize.fullname,
    };
    return this.authorized;
  }

  /** OAuth2: OTP → authenticated WS (no legacy authorize message) */
  async authorizeOAuth2(
    accessToken: string,
    accountId: string,
    meta?: { currency?: string; balance?: number }
  ): Promise<AuthorizeInfo> {
    const wsUrl = await fetchAuthenticatedWsUrl(accessToken, accountId);
    await this.connect(wsUrl);
    this.token = accessToken;
    this.authMode = 'oauth2';

    let balance = meta?.balance ?? 0;
    try {
      balance = await this.getBalance();
    } catch {
      // Some OTP sockets are already authed; balance may still work later
    }

    this.authorized = {
      loginid: accountId,
      balance,
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
      symbol: params.symbol,
    };

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
    if (!this.authorized) throw new Error('Not authorized — connect a Deriv token first');
    const proposal = await this.propose(params);
    return this.buy(proposal.id, proposal.askPrice);
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
      await this.getBalance().catch(() => undefined);
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

  private send(payload: Record<string, unknown>): Promise<unknown> {
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
