import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showGlow?: boolean;
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-16 h-16',
};

export const BrandLogo = ({ className, size = 'md', showGlow = true }: BrandLogoProps) => (
  <div
    className={cn(
      'relative shrink-0 rounded-xl overflow-hidden border border-cyan-400/30 bg-black/40',
      showGlow && 'shadow-lg shadow-cyan-500/25',
      sizeMap[size],
      className
    )}
  >
    <img
      src="/brand/logo-icon.png"
      alt="Patel Digit Tool"
      className="h-full w-full object-cover"
      draggable={false}
    />
  </div>
);

interface SiteBackgroundProps {
  variant?: 'main' | 'auth';
  className?: string;
}

export const SiteBackground = ({ variant = 'main', className }: SiteBackgroundProps) => {
  const src = variant === 'auth' ? '/images/bg-auth.png' : '/images/bg-main.png';
  const isAuth = variant === 'auth';

  return (
    <div className={cn('fixed inset-0 -z-10 overflow-hidden pointer-events-none', className)}>
      <img
        src={src}
        alt=""
        className={cn(
          'absolute inset-0 h-full w-full object-cover',
          isAuth ? 'opacity-75 dark:opacity-85' : 'opacity-55 dark:opacity-70'
        )}
        draggable={false}
      />
      <div
        className={cn(
          'absolute inset-0',
          isAuth ? 'bg-background/40 dark:bg-background/35' : 'bg-background/55 dark:bg-background/45'
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/85" />
      <div className="absolute -top-24 left-1/4 w-[28rem] h-[28rem] bg-cyan-500/15 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-[28rem] h-[28rem] bg-fuchsia-500/15 rounded-full blur-3xl" />
      {isAuth && (
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
      )}
    </div>
  );
};
