import { Link } from 'react-router';
import { User, Wallet, Bell, CalendarCheck } from 'lucide-react';

import { SR } from '@/components/motion/ScrollReveal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useUnreadNotificationCount } from '@/hooks/use-notifications';
import { pickLocalizedCopy } from '@/lib/localization';

const quickLinks = [
  {
    icon: User,
    label: { ar: 'الملف الشخصي', en: 'Profile' },
    href: '/profile',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    icon: Wallet,
    label: { ar: 'المحفظة', en: 'Wallet' },
    href: '/wallet',
    gradient: 'from-green-500 to-emerald-600',
  },
  {
    icon: CalendarCheck,
    label: { ar: 'حجوزاتي', en: 'My bookings' },
    href: '/bookings',
    gradient: 'from-purple-500 to-violet-600',
  },
  {
    icon: Bell,
    label: { ar: 'الإشعارات', en: 'Notifications' },
    href: '/notifications',
    gradient: 'from-red-500 to-rose-600',
  },
];

export function QuickAccess() {
  const { user, language } = useAuth();
  const { data: unreadData } = useUnreadNotificationCount();
  const unreadCount = unreadData?.count ?? 0;

  if (!user) return null;

  const greeting = pickLocalizedCopy(language, {
    ar: `مرحباً، ${user.full_name}`,
    en: `Hello, ${user.full_name}`,
  });
  const subtitle = pickLocalizedCopy(language, {
    ar: 'الوصول السريع لحسابك',
    en: 'Quick access to your account',
  });

  return (
    <section className="bg-gradient-to-b from-background to-muted/30 py-14">
      <SR direction="up" className="container px-4">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold">{greeting}</h2>
          <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>
        </div>
        <SR stagger className="mx-auto grid max-w-3xl grid-cols-2 gap-5 md:grid-cols-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            const isNotif = link.href === '/notifications';

            return (
              <Link key={link.href} to={link.href}>
                <Card className="hover-lift group rounded-2xl text-center transition-all duration-400 hover:border-primary/30">
                  <CardContent className="relative flex flex-col items-center gap-3 p-5">
                    <div
                      className={`icon-hover flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${link.gradient} shadow-lg`}
                    >
                      <Icon className="h-8 w-8 text-primary-foreground" strokeWidth={1.8} />
                    </div>
                    {isNotif && unreadCount > 0 && (
                      <Badge className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center p-0 text-[10px] animate-pulse bg-destructive text-destructive-foreground">
                        {unreadCount}
                      </Badge>
                    )}
                    <span className="text-sm font-semibold text-foreground">
                      {pickLocalizedCopy(language, link.label)}
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
