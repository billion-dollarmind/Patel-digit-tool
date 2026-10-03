import { Navigate } from 'react-router-dom';
import { usePlatformAdmin } from '@/context/PlatformAdminContext';
import { isAdminUnlocked } from '@/lib/adminGate';
import type { FeatureKey } from '@/lib/platformAdmin';
import type { ReactNode } from 'react';

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  title?: string;
}

export const FeatureGate = ({ feature, children, title }: FeatureGateProps) => {
  const { hasFeature, state } = usePlatformAdmin();
  if (isAdminUnlocked()) return <>{children}</>;
  if (!state.clientVisible.includes(feature)) return <Navigate to="/" replace />;
  if (hasFeature(feature)) return <>{children}</>;

  return (
    <div className="relative min-h-[50vh] flex items-center justify-center p-6">
      <div className="glass rounded-2xl p-6 max-w-md text-center space-y-3 border border-amber-400/30">
        <h2 className="text-lg font-semibold">{title || 'Feature locked'}</h2>
        <p className="text-sm text-muted-foreground">
          This page is not included on your plan.
        </p>
      </div>
    </div>
  );
};
