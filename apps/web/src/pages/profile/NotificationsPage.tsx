import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Layout } from '@/components/layout/Layout';
import {
  Bell,
  CheckCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Trophy,
  Star,
  ShieldCheck,
  ShieldX,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notificationsAPI } from '@/services/api';
import { SR } from '@/components/motion/ScrollReveal';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { Skeleton } from '@/components/motion/Skeleton';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { formatRelativeTime } from '@/lib/dates';
import { markAllNotificationsAsRead, markNotificationAsRead } from '@/lib/notifications-cache';
import { toast } from 'sonner';
import {
  NotificationType,
  type Notification,
  type NotificationListResponse,
} from '@hena-wadeena/types';

const PAGE_SIZE = 20;

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  [NotificationType.BOOKING_REQUESTED]: {
    icon: <Calendar className="h-5 w-5" />,
    color: 'text-blue-500 bg-blue-500/10',
  },
  [NotificationType.BOOKING_CONFIRMED]: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: 'text-green-500 bg-green-500/10',
  },
  [NotificationType.BOOKING_CANCELLED]: {
    icon: <XCircle className="h-5 w-5" />,
    color: 'text-red-500 bg-red-500/10',
  },
  [NotificationType.BOOKING_COMPLETED]: {
    icon: <Trophy className="h-5 w-5" />,
    color: 'text-green-600 bg-green-600/10',
  },
  [NotificationType.REVIEW_SUBMITTED]: {
    icon: <Star className="h-5 w-5" />,
    color: 'text-yellow-500 bg-yellow-500/10',
  },
  [NotificationType.KYC_APPROVED]: {
    icon: <ShieldCheck className="h-5 w-5" />,
    color: 'text-green-500 bg-green-500/10',
  },
  [NotificationType.KYC_REJECTED]: {
    icon: <ShieldX className="h-5 w-5" />,
    color: 'text-red-500 bg-red-500/10',
  },
  [NotificationType.SYSTEM]: {
    icon: <Bell className="h-5 w-5" />,
    color: 'text-muted-foreground bg-muted',
  },
};

function getTypeConfig(type: string) {
  return typeConfig[type] ?? typeConfig[NotificationType.SYSTEM];
}

const NotificationsPage = () => {
  const [page, setPage] = useState(1);
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.notifications.list({ page, limit: PAGE_SIZE }),
    queryFn: () => notificationsAPI.getAll(page, PAGE_SIZE),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });

  // unreadCount comes from the list response envelope — no separate polling query needed.
  // The header's useUnreadNotificationCount hook handles 60s background polling independently.
  // Mutations invalidate both the list and unreadCount caches, keeping both in sync.
  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const hasMore = data?.hasMore ?? false;
  const totalPages = data?.total ? Math.ceil(data.total / PAGE_SIZE) : 1;
  const listQueryKey = queryKeys.notifications.list({ page, limit: PAGE_SIZE });

  // all() = ['notifications'] — prefix-matches both list queries and unreadCount in one shot
  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
  };

  const setUnreadCount = (count: number) => {
    queryClient.setQueryData(queryKeys.notifications.unreadCount(), { count });
  };

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsAPI.markRead(id),
    onSuccess: (_response, id) => {
      const nextList = markNotificationAsRead(data, id);
      queryClient.setQueryData<NotificationListResponse>(listQueryKey, nextList);
      if (nextList) {
        setUnreadCount(nextList.unreadCount);
      }
      invalidateAll();
    },
    onError: () => toast.error('تعذر تحديث الإشعار'),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      const nextList = markAllNotificationsAsRead(data);
      queryClient.setQueryData<NotificationListResponse>(listQueryKey, nextList);
      setUnreadCount(0);
      invalidateAll();
    },
    onError: () => toast.error('تعذر تحديث الإشعارات'),
  });

  const handleNotificationClick = async (notification: Notification) => {
    const path = notification.data?.path;

    if (!notification.readAt) {
      try {
        await markReadMutation.mutateAsync(notification.id);
      } catch {
        return;
      }
    }

    if (typeof path === 'string' && path.length > 0) {
      void navigate(path);
    }
  };

  return (
    <Layout title="الإشعارات">
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
                    disabled={markAllReadMutation.isPending}
                    onClick={() => markAllReadMutation.mutate()}
                  >
                    <CheckCheck className="h-4 w-4 ms-1" />
                    قراءة الكل
                  </Button>
                )}
              </div>
            </SR>

            <div className="space-y-3">
              {isLoading ? (
                [1, 2, 3, 4].map((i) => <Skeleton key={i} h="h-20" className="rounded-2xl" />)
              ) : error ? (
                <Card className="rounded-2xl">
                  <CardContent className="p-14 text-center text-muted-foreground text-lg">
                    حدث خطأ في تحميل الإشعارات
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 mx-auto block"
                      onClick={() =>
                        void queryClient.invalidateQueries({
                          queryKey: queryKeys.notifications.list({ page, limit: PAGE_SIZE }),
                        })
                      }
                    >
                      إعادة المحاولة
                    </Button>
                  </CardContent>
                </Card>
              ) : notifications.length === 0 ? (
                <Card className="rounded-2xl">
                  <CardContent className="p-14 text-center text-muted-foreground text-lg">
                    لا توجد إشعارات
                  </CardContent>
                </Card>
              ) : (
                notifications.map((n, idx) => {
                  const config = getTypeConfig(n.type);
                  return (
                    <SR key={n.id} delay={idx * 40}>
                      <Card
                        className={`hover-lift cursor-pointer rounded-2xl transition-all duration-250 ${!n.readAt ? 'border-primary/30 bg-primary/5 shadow-sm' : 'border-border/50'}`}
                        onClick={() => {
                          void handleNotificationClick(n);
                        }}
                      >
                        <CardContent className="p-5 flex items-start gap-4">
                          <div
                            className={`h-10 w-10 rounded-xl flex items-center justify-center mt-0.5 ${config.color}`}
                          >
                            {config.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3
                                className={`font-bold text-sm ${!n.readAt ? 'text-foreground' : 'text-muted-foreground'}`}
                              >
                                {n.titleAr}
                              </h3>
                              {!n.readAt && (
                                <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5 flex-shrink-0 animate-pulse" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1.5">{n.bodyAr}</p>
                            <p className="text-xs text-muted-foreground mt-2.5">
                              {formatRelativeTime(n.createdAt)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </SR>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <SR>
                <div className="flex items-center justify-center gap-4 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasMore}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </SR>
            )}
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default NotificationsPage;
