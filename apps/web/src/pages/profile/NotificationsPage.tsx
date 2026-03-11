import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Bell, CheckCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notificationsAPI, type Notification } from '@/services/api';
import { SR } from '@/components/motion/ScrollReveal';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { Skeleton } from '@/components/motion/Skeleton';

const typeIcons: Record<string, string> = {
  booking_confirmed: '✅',
  payment_received: '💰',
  new_review: '⭐',
  kyc_approved: '🛡️',
  system: '🔔',
  carpool_match: '🚗',
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      notificationsAPI.getAll().then((r) => setNotifications(r.data)),
      notificationsAPI.getUnreadCount().then((r) => setUnreadCount(r.data.count)),
    ]).finally(() => setLoading(false));
  }, []);

  const markAsRead = async (id: string) => {
    await notificationsAPI.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read_at);
    for (const n of unread) await notificationsAPI.markRead(n.id);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })),
    );
    setUnreadCount(0);
  };

  return (
    <Layout>
      <PageTransition>
        <section className="relative py-14 md:py-20 overflow-hidden">
          <GradientMesh />
          <div className="container relative px-4 max-w-2xl">
            <SR>
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <Bell className="h-7 w-7 text-red-500" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold">الإشعارات</h1>
                  {unreadCount > 0 && (
                    <Badge className="bg-red-500 text-white animate-pulse">{unreadCount}</Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:scale-[1.03] transition-transform"
                    onClick={() => void markAllRead()}
                  >
                    <CheckCheck className="h-4 w-4 ml-1" />
                    قراءة الكل
                  </Button>
                )}
              </div>
            </SR>

            <div className="space-y-3">
              {loading ? (
                [1, 2, 3, 4].map((i) => <Skeleton key={i} h="h-20" className="rounded-2xl" />)
              ) : notifications.length === 0 ? (
                <Card className="rounded-2xl">
                  <CardContent className="p-14 text-center text-muted-foreground text-lg">
                    لا توجد إشعارات
                  </CardContent>
                </Card>
              ) : (
                notifications.map((n, idx) => (
                  <SR key={n.id} delay={idx * 40}>
                    <Card
                      className={`hover-lift cursor-pointer rounded-2xl transition-all duration-250 ${!n.read_at ? 'border-primary/30 bg-primary/5 shadow-sm' : 'border-border/50'}`}
                      onClick={() => !n.read_at && void markAsRead(n.id)}
                    >
                      <CardContent className="p-5 flex items-start gap-4">
                        <span className="text-3xl mt-1">{typeIcons[n.type] || '🔔'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className={`font-bold text-sm ${!n.read_at ? 'text-foreground' : 'text-muted-foreground'}`}
                            >
                              {n.title_ar}
                            </h3>
                            {!n.read_at && (
                              <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5 flex-shrink-0 animate-pulse" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1.5">{n.body_ar}</p>
                          <p className="text-xs text-muted-foreground mt-2.5">
                            {new Date(n.created_at).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </SR>
                ))
              )}
            </div>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default NotificationsPage;
