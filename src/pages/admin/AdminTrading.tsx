import { Link } from 'react-router-dom';
import { CONNECTED_APPS } from '@/lib/signalDispatcher';
import { ArrowRight } from 'lucide-react';

export const AdminTrading = () => (
  <div className="space-y-4">
    <div>
      <h2 className="text-lg font-semibold">Trading apps</h2>
      <p className="text-sm text-muted-foreground">
        Speed Bot, Accumulators, and Bot Builder stay here. Clients do not see these unless you turn them on under Client menu.
      </p>
    </div>
    <div className="grid sm:grid-cols-3 gap-3">
      {CONNECTED_APPS.map((app) => (
        <Link
          key={app.id}
          to={app.route}
          className="glass rounded-2xl p-4 border border-white/10 hover:border-cyan-400/40"
        >
          <h3 className="font-semibold">{app.name}</h3>
          <p className="text-sm text-muted-foreground mt-2">{app.description}</p>
          <span className="inline-flex items-center gap-1 text-sm text-cyan-300 mt-3">
            Open <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      ))}
    </div>
  </div>
);
