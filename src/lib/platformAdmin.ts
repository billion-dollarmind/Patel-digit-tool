/** Hub-style admin + connected-apps model (local persistence until a real API exists) */

export type FeatureKey =
  | 'even_odd'
  | 'over_under'
  | 'digit_match'
  | 'engine_monitor'
  | 'signal_dispatch'
  | 'speedbot'
  | 'accumulators'
  | 'bot_builder';

export type SubscriberStatus = 'pending' | 'approved' | 'revoked';

export interface FeatureDef {
  id: FeatureKey;
  label: string;
  description: string;
  route?: string;
}

export interface ConnectedApplication {
  id: string;
  name: string;
  description: string;
  /** Feature keys this app exposes / can receive */
  featureKeys: FeatureKey[];
  /** Optional external URL / webhook for signal push */
  webhookUrl: string;
  /** Allowed hostnames (Hub-style domain binding) */
  allowedDomains: string[];
  active: boolean;
  ownerCapability: Array<'engineMonitor' | 'signalDispatch'>;
  createdAt: number;
  updatedAt: number;
}

export interface AccessPlan {
  id: string;
  name: string;
  priceLabel: string;
  featureKeys: FeatureKey[];
  enabled: boolean;
}

export interface SubscriberRecord {
  id: string;
  email: string;
  fullName: string;
  planId: string;
  status: SubscriberStatus;
  /** Overrides / granted feature keys */
  featureKeys: FeatureKey[];
  notes: string;
  createdAt: number;
  approvedAt?: number;
}

export interface PlatformState {
  applications: ConnectedApplication[];
  plans: AccessPlan[];
  subscribers: SubscriberRecord[];
}

export const FEATURE_CATALOG: FeatureDef[] = [
  { id: 'even_odd', label: 'Even / Odd Signals', description: 'Scanner tab for even/odd', route: '/signals/even-odd' },
  { id: 'over_under', label: 'Over / Under Signals', description: 'Scanner tab for over/under', route: '/signals/over-under' },
  { id: 'digit_match', label: 'Digit Match Signals', description: 'Scanner tab for digit match', route: '/signals/digit-match' },
  { id: 'engine_monitor', label: 'Auto Engine', description: 'Start/stop signal engine', route: '/engine' },
  { id: 'signal_dispatch', label: 'Signal Dispatcher', description: 'Push signals to connected apps' },
  { id: 'speedbot', label: 'Speed Bot', description: 'Connected trading app', route: '/apps/speedbot' },
  { id: 'accumulators', label: 'Accumulators', description: 'Connected trading app', route: '/apps/accumulators' },
  { id: 'bot_builder', label: 'Bot Builder', description: 'Connected trading app', route: '/apps/bot-builder' },
];

const STORAGE_KEY = 'patel-platform-admin-v1';

const now = () => Date.now();

const uid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

export const createDefaultPlatformState = (): PlatformState => {
  const t = now();
  return {
    applications: [
      {
        id: 'app_speedbot',
        name: 'Speed Bot',
        description: 'Fast Even/Odd entries from dispatcher',
        featureKeys: ['speedbot', 'even_odd', 'signal_dispatch'],
        webhookUrl: '',
        allowedDomains: ['www.dukehub.site', 'dukehub.site', 'localhost'],
        active: true,
        ownerCapability: ['signalDispatch'],
        createdAt: t,
        updatedAt: t,
      },
      {
        id: 'app_accumulators',
        name: 'Accumulators',
        description: 'ACCU entries on high-confidence signals',
        featureKeys: ['accumulators', 'signal_dispatch'],
        webhookUrl: '',
        allowedDomains: ['www.dukehub.site', 'dukehub.site', 'localhost'],
        active: true,
        ownerCapability: ['signalDispatch'],
        createdAt: t,
        updatedAt: t,
      },
      {
        id: 'app_bot_builder',
        name: 'Bot Builder',
        description: 'Map signal kinds to contracts',
        featureKeys: ['bot_builder', 'even_odd', 'over_under', 'digit_match', 'signal_dispatch'],
        webhookUrl: '',
        allowedDomains: ['www.dukehub.site', 'dukehub.site', 'localhost'],
        active: true,
        ownerCapability: ['signalDispatch', 'engineMonitor'],
        createdAt: t,
        updatedAt: t,
      },
      {
        id: 'app_digit_desk',
        name: 'Digit Signal Desk',
        description: 'Core scanner surface (Even/Odd, Over/Under, Digit Match)',
        featureKeys: ['even_odd', 'over_under', 'digit_match', 'engine_monitor', 'signal_dispatch'],
        webhookUrl: '',
        allowedDomains: ['www.dukehub.site', 'dukehub.site', 'localhost'],
        active: true,
        ownerCapability: ['engineMonitor', 'signalDispatch'],
        createdAt: t,
        updatedAt: t,
      },
    ],
    plans: [
      {
        id: 'plan_scanner',
        name: 'Scanner Access',
        priceLabel: 'Signals only',
        featureKeys: ['even_odd', 'over_under', 'digit_match'],
        enabled: true,
      },
      {
        id: 'plan_pro',
        name: 'Pro Desk',
        priceLabel: 'Signals + Engine',
        featureKeys: ['even_odd', 'over_under', 'digit_match', 'engine_monitor', 'signal_dispatch'],
        enabled: true,
      },
      {
        id: 'plan_full',
        name: 'Full Suite',
        priceLabel: 'All connected apps',
        featureKeys: FEATURE_CATALOG.map((f) => f.id),
        enabled: true,
      },
    ],
    subscribers: [
      {
        id: 'sub_owner',
        email: 'admin@dukehub.site',
        fullName: 'Platform Owner',
        planId: 'plan_full',
        status: 'approved',
        featureKeys: FEATURE_CATALOG.map((f) => f.id),
        notes: 'Default full access',
        createdAt: t,
        approvedAt: t,
      },
    ],
  };
};

export const loadPlatformState = (): PlatformState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = createDefaultPlatformState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw) as PlatformState;
    return {
      applications: parsed.applications?.length ? parsed.applications : createDefaultPlatformState().applications,
      plans: parsed.plans?.length ? parsed.plans : createDefaultPlatformState().plans,
      subscribers: parsed.subscribers?.length ? parsed.subscribers : createDefaultPlatformState().subscribers,
    };
  } catch {
    return createDefaultPlatformState();
  }
};

export const savePlatformState = (state: PlatformState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const newApplication = (partial?: Partial<ConnectedApplication>): ConnectedApplication => {
  const t = now();
  return {
    id: uid('app'),
    name: partial?.name || 'New App',
    description: partial?.description || '',
    featureKeys: partial?.featureKeys || ['signal_dispatch'],
    webhookUrl: partial?.webhookUrl || '',
    allowedDomains: partial?.allowedDomains || ['www.dukehub.site'],
    active: partial?.active ?? true,
    ownerCapability: partial?.ownerCapability || ['signalDispatch'],
    createdAt: t,
    updatedAt: t,
  };
};

export const newSubscriber = (partial?: Partial<SubscriberRecord>): SubscriberRecord => {
  const t = now();
  return {
    id: uid('sub'),
    email: partial?.email || '',
    fullName: partial?.fullName || '',
    planId: partial?.planId || 'plan_scanner',
    status: partial?.status || 'pending',
    featureKeys: partial?.featureKeys || [],
    notes: partial?.notes || '',
    createdAt: t,
    approvedAt: partial?.approvedAt,
  };
};

export const featuresForSubscriber = (
  state: PlatformState,
  subscriberId: string
): FeatureKey[] => {
  const sub = state.subscribers.find((s) => s.id === subscriberId);
  if (!sub || sub.status !== 'approved') return [];
  const plan = state.plans.find((p) => p.id === sub.planId);
  const fromPlan = plan?.enabled ? plan.featureKeys : [];
  return Array.from(new Set([...fromPlan, ...sub.featureKeys]));
};

/** Active applications that include a feature key (for dispatcher targets) */
export const activeAppsForFeature = (state: PlatformState, feature: FeatureKey) =>
  state.applications.filter((a) => a.active && a.featureKeys.includes(feature));

export const dispatchWebhook = async (
  app: ConnectedApplication,
  payload: unknown
): Promise<{ ok: boolean; message: string }> => {
  if (!app.webhookUrl.trim()) {
    return { ok: false, message: 'No webhook URL configured' };
  }
  try {
    const res = await fetch(app.webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'patel-digit-tool',
        appId: app.id,
        appName: app.name,
        sentAt: new Date().toISOString(),
        payload,
      }),
    });
    if (!res.ok) return { ok: false, message: `Webhook HTTP ${res.status}` };
    return { ok: true, message: `Pushed to ${app.name}` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Webhook failed' };
  }
};
