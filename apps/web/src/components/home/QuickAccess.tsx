import { Link } from 'react-router';
import { User, Wallet, Bell, CalendarCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SR } from '@/components/motion/ScrollReveal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useUnreadNotificationCount } from '@/hooks/use-notifications';

const quickLinks = [
  {
    icon: User,
    labelKey: 'profile',
    href: '/profile',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    icon: Wallet,
    labelKey: 'wallet',
    href: '/wallet',
    gradient: 'from-green-500 to-emerald-600',
  },
  {
    icon: CalendarCheck,
    labelKey: 'bookings',
    href: '/bookings',
    gradient: 'from-purple-500 to-violet-600',
  },
  {
    icon: Bell,
    labelKey: 'notifications',
    href: '/notifications',
    gradient: 'from-red-500 to-rose-600',
  },
];

export function QuickAccess() {
  const { t } = useTranslation(['home', 'common']);
  const { user } = useAuth();
  const { data: unreadData } = useUnreadNotificationCount();
  const unreadCount = unreadData?.count ?? 0;

  if (!user) return null;

  const greeting = t('quickAccess.greeting', { name: user.full_name });
  const subtitle = t('quickAccess.subtitle');

  return (
    <section className="bg-gradient-to-b from-background to-muted/30 py-10 sm:py-14">
      <SR direction="up" className="container px-4">
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="text-2xl font-bold sm:text-3xl">{greeting}</h2>
          <p className="mt-2 text-base text-muted-foreground sm:text-lg">{subtitle}</p>
        </div>
        <SR stagger className="mx-auto grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            const isNotif = link.href === '/notifications';

            return (
              <Link key={link.href} to={link.href}>
                <Card className="hover-lift group rounded-2xl text-center transition-all duration-400 hover:border-primary/30">
                  <CardContent className="relative flex min-h-[8.75rem] flex-col items-center gap-3 p-4 sm:min-h-[9.5rem] sm:p-5">
                    <div
                      className={`icon-hover flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${link.gradient} shadow-lg sm:h-16 sm:w-16`}
                    >
                      <Icon
                        className="h-7 w-7 text-primary-foreground sm:h-8 sm:w-8"
                        strokeWidth={1.8}
                      />
                    </div>
                    {isNotif && unreadCount > 0 && (
                      <Badge className="absolute end-2 top-2 flex h-5 w-5 items-center justify-center p-0 text-[10px] animate-pulse bg-destructive text-destructive-foreground">
                        {unreadCount}
                      </Badge>
                    )}
                    <span className="text-sm font-semibold text-foreground">
                      {t(link.labelKey, { ns: 'common' })}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </SR>
      </SR>
    </section>
  );
}
