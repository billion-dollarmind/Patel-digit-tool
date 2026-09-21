import { Link } from 'react-router-dom';
import { usePlatformAdmin } from '@/context/PlatformAdminContext';
import type { FeatureKey } from '@/lib/platformAdmin';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  title?: string;
}

export const FeatureGate = ({ feature, children, title }: FeatureGateProps) => {
  const { hasFeature, activeSubscriberId, state } = usePlatformAdmin();
  if (hasFeature(feature)) return <>{children}</>;

  const sub = state.subscribers.find((s) => s.id === activeSubscriberId);

  return (
    <div className="relative min-h-[50vh] flex items-center justify-center p-6">
      <div className="glass rounded-2xl p-6 max-w-md text-center space-y-3 border border-amber-400/30">
        <h2 className="text-lg font-semibold">{title || 'Feature locked'}</h2>
        <p className="text-sm text-muted-foreground">
          <code className="text-amber-300">{feature}</code> is not enabled for{' '}
          <strong>{sub?.email || 'current subscriber'}</strong>. Approve a plan in Admin → Scanner
          Access.
        </p>
        <Link to="/admin/access">
          <Button>Open Scanner Access</Button>
        </Link>
      </div>
    </div>
  );
};
