import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutGrid, ShieldCheck, Users, Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo, SiteBackground } from '@/components/Brand';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/admin', end: true, label: 'Overview', icon: LayoutGrid },
  { to: '/admin/apps', label: 'Applications', icon: Boxes },
  { to: '/admin/access', label: 'Scanner Access', icon: ShieldCheck },
  { to: '/admin/subscribers', label: 'Subscribers', icon: Users },
];

export const AdminLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen">
      <SiteBackground />
      <header className="sticky top-0 z-50 glass border-b border-border/60">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <BrandLogo size="sm" />
            <div className="min-w-0">
              <h1 className="text-base font-bold gradient-text truncate">Admin Console</h1>
              <p className="text-xs text-muted-foreground truncate">
                Connected apps · scanner access · subscribers
              </p>
            </div>
          </div>
          <Link to="/engine" className="text-xs text-cyan-300 hover:underline">
            Open Auto Engine →
          </Link>
        </div>
        <nav className="container mx-auto px-4 pb-3 flex flex-wrap gap-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  isActive
                    ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                    : 'border-border bg-background/40 text-muted-foreground hover:text-foreground'
                )
              }
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <Outlet />
      </main>
    </div>
  );
};
