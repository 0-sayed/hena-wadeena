import { Home, LogIn, Mountain, ShoppingBag, Truck, User } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import { useAuth } from '@/hooks/use-auth';
import { useUnreadNotificationCount } from '@/hooks/use-notifications';
import { shouldShowMobileBottomNav } from './mobile-bottom-nav-visibility';

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  matcher: (pathname: string) => boolean;
  badge?: number;
};

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { user, language } = useAuth();
  const { data: unreadData } = useUnreadNotificationCount();
  const unreadCount = unreadData?.count ?? 0;

  if (!shouldShowMobileBottomNav(pathname)) {
    return null;
  }

  const accountItem: NavItem = user
    ? {
        href: '/profile',
        label: language === 'en' ? 'Account' : 'الحساب',
        icon: User,
        matcher: (currentPath) =>
          currentPath === '/profile' ||
          currentPath.startsWith('/wallet') ||
          currentPath.startsWith('/bookings') ||
          currentPath.startsWith('/notifications'),
        badge: unreadCount > 0 ? unreadCount : undefined,
      }
    : {
        href: '/login',
        label: language === 'en' ? 'Log in' : 'دخول',
        icon: LogIn,
        matcher: (currentPath) =>
          currentPath.startsWith('/login') || currentPath.startsWith('/register'),
      };

  const items: NavItem[] = [
    {
      href: '/',
      label: language === 'en' ? 'Home' : 'الرئيسية',
      icon: Home,
      matcher: (currentPath) => currentPath === '/',
    },
    {
      href: '/tourism',
      label: language === 'en' ? 'Tourism' : 'السياحة',
      icon: Mountain,
      matcher: (currentPath) =>
        currentPath.startsWith('/tourism') || currentPath.startsWith('/guides'),
    },
    {
      href: '/marketplace',
      label: language === 'en' ? 'Market' : 'البورصة',
      icon: ShoppingBag,
      matcher: (currentPath) =>
        currentPath.startsWith('/marketplace') || currentPath.startsWith('/investment'),
    },
    {
      href: '/logistics',
      label: language === 'en' ? 'Transport' : 'النقل',
      icon: Truck,
      matcher: (currentPath) => currentPath.startsWith('/logistics'),
    },
    accountItem,
  ];

  return (
    <nav
      aria-label={language === 'en' ? 'Mobile navigation' : 'التنقل على الجوال'}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 shadow-[0_-12px_30px_hsl(30_20%_20%_/_0.08)] backdrop-blur md:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
    >
      <div className="mx-auto flex max-w-2xl items-end justify-between gap-1 px-2 pt-2">
        {items.map((item) => {
          const isActive = item.matcher(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.badge ? (
                <span className="absolute end-3 top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
