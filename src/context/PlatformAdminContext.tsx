import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  activeAppsForFeature,
  dispatchWebhook,
  featuresForSubscriber,
  loadPlatformState,
  newApplication,
  newSubscriber,
  savePlatformState,
  type AccessPlan,
  type ConnectedApplication,
  type FeatureKey,
  type PlatformState,
  type SubscriberRecord,
  type SubscriberStatus,
} from '@/lib/platformAdmin';

const ACTIVE_SUB_KEY = 'patel-active-subscriber-id';

interface PlatformAdminContextValue {
  state: PlatformState;
  activeSubscriberId: string;
  activeFeatures: FeatureKey[];
  hasFeature: (key: FeatureKey) => boolean;
  setActiveSubscriber: (id: string) => void;
  upsertApplication: (app: ConnectedApplication) => void;
  removeApplication: (id: string) => void;
  createApplication: (partial?: Partial<ConnectedApplication>) => ConnectedApplication;
  upsertPlan: (plan: AccessPlan) => void;
  upsertSubscriber: (sub: SubscriberRecord) => void;
  removeSubscriber: (id: string) => void;
  createSubscriber: (partial?: Partial<SubscriberRecord>) => SubscriberRecord;
  setSubscriberStatus: (id: string, status: SubscriberStatus, featureKeys?: FeatureKey[]) => void;
  grantFeatures: (subscriberId: string, keys: FeatureKey[]) => void;
  resetPlatform: () => void;
  pushSignalToConnectedApps: (payload: unknown, featureHint?: FeatureKey) => Promise<string[]>;
}

const PlatformAdminContext = createContext<PlatformAdminContextValue | null>(null);

export const PlatformAdminProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<PlatformState>(() => loadPlatformState());
  const [activeSubscriberId, setActiveSubscriberId] = useState(
    () => localStorage.getItem(ACTIVE_SUB_KEY) || state.subscribers[0]?.id || ''
  );

  useEffect(() => {
    savePlatformState(state);
  }, [state]);

  useEffect(() => {
    if (activeSubscriberId) localStorage.setItem(ACTIVE_SUB_KEY, activeSubscriberId);
  }, [activeSubscriberId]);

  const activeFeatures = useMemo(
    () => featuresForSubscriber(state, activeSubscriberId),
    [state, activeSubscriberId]
  );

  const hasFeature = useCallback(
    (key: FeatureKey) => activeFeatures.includes(key),
    [activeFeatures]
  );

  const setActiveSubscriber = useCallback((id: string) => setActiveSubscriberId(id), []);

  const upsertApplication = useCallback((app: ConnectedApplication) => {
    setState((prev) => {
      const exists = prev.applications.some((a) => a.id === app.id);
      return {
        ...prev,
        applications: exists
          ? prev.applications.map((a) => (a.id === app.id ? { ...app, updatedAt: Date.now() } : a))
          : [...prev.applications, { ...app, updatedAt: Date.now() }],
      };
    });
  }, []);

  const removeApplication = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      applications: prev.applications.filter((a) => a.id !== id),
    }));
  }, []);

  const createApplication = useCallback((partial?: Partial<ConnectedApplication>) => {
    const app = newApplication(partial);
    setState((prev) => ({ ...prev, applications: [...prev.applications, app] }));
    return app;
  }, []);

  const upsertPlan = useCallback((plan: AccessPlan) => {
    setState((prev) => {
      const exists = prev.plans.some((p) => p.id === plan.id);
      return {
        ...prev,
        plans: exists ? prev.plans.map((p) => (p.id === plan.id ? plan : p)) : [...prev.plans, plan],
      };
    });
  }, []);

  const upsertSubscriber = useCallback((sub: SubscriberRecord) => {
    setState((prev) => {
      const exists = prev.subscribers.some((s) => s.id === sub.id);
      return {
        ...prev,
        subscribers: exists
          ? prev.subscribers.map((s) => (s.id === sub.id ? sub : s))
          : [...prev.subscribers, sub],
      };
    });
  }, []);

  const removeSubscriber = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      subscribers: prev.subscribers.filter((s) => s.id !== id),
    }));
  }, []);

  const createSubscriber = useCallback((partial?: Partial<SubscriberRecord>) => {
    const sub = newSubscriber(partial);
    setState((prev) => ({ ...prev, subscribers: [...prev.subscribers, sub] }));
    return sub;
  }, []);

  const setSubscriberStatus = useCallback(
    (id: string, status: SubscriberStatus, featureKeys?: FeatureKey[]) => {
      setState((prev) => ({
        ...prev,
        subscribers: prev.subscribers.map((s) => {
          if (s.id !== id) return s;
          const plan = prev.plans.find((p) => p.id === s.planId);
          return {
            ...s,
            status,
            approvedAt: status === 'approved' ? Date.now() : s.approvedAt,
            featureKeys:
              featureKeys ||
              (status === 'approved' ? Array.from(new Set([...(plan?.featureKeys || []), ...s.featureKeys])) : s.featureKeys),
          };
        }),
      }));
    },
    []
  );

  const grantFeatures = useCallback((subscriberId: string, keys: FeatureKey[]) => {
    setState((prev) => ({
      ...prev,
      subscribers: prev.subscribers.map((s) =>
        s.id === subscriberId
          ? { ...s, featureKeys: Array.from(new Set([...s.featureKeys, ...keys])), status: 'approved', approvedAt: Date.now() }
          : s
      ),
    }));
  }, []);

  const resetPlatform = useCallback(() => {
    localStorage.removeItem('patel-platform-admin-v1');
    const reloaded = loadPlatformState();
    setState(reloaded);
    setActiveSubscriberId(reloaded.subscribers[0]?.id || '');
  }, []);

  const pushSignalToConnectedApps = useCallback(
    async (payload: unknown, featureHint: FeatureKey = 'signal_dispatch') => {
      const targets = activeAppsForFeature(state, featureHint).filter((a) => a.webhookUrl.trim());
      const messages: string[] = [];
      for (const app of targets) {
        const result = await dispatchWebhook(app, payload);
        messages.push(`${app.name}: ${result.message}`);
      }
      if (!messages.length) messages.push('No active apps with webhook URLs');
      return messages;
    },
    [state]
  );

  const value = useMemo(
    () => ({
      state,
      activeSubscriberId,
      activeFeatures,
      hasFeature,
      setActiveSubscriber,
      upsertApplication,
      removeApplication,
      createApplication,
      upsertPlan,
      upsertSubscriber,
      removeSubscriber,
      createSubscriber,
      setSubscriberStatus,
      grantFeatures,
      resetPlatform,
      pushSignalToConnectedApps,
    }),
    [
      state,
      activeSubscriberId,
      activeFeatures,
      hasFeature,
      setActiveSubscriber,
      upsertApplication,
      removeApplication,
      createApplication,
      upsertPlan,
      upsertSubscriber,
      removeSubscriber,
      createSubscriber,
      setSubscriberStatus,
      grantFeatures,
      resetPlatform,
      pushSignalToConnectedApps,
    ]
  );

  return <PlatformAdminContext.Provider value={value}>{children}</PlatformAdminContext.Provider>;
};

export const usePlatformAdmin = () => {
  const ctx = useContext(PlatformAdminContext);
  if (!ctx) throw new Error('usePlatformAdmin must be used within PlatformAdminProvider');
  return ctx;
};
