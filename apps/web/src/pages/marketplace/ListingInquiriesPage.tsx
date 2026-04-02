import { useEffect, useMemo, useRef, useState } from 'react';
import { UserRole } from '@hena-wadeena/types';
import { Link, useSearchParams } from 'react-router';
import {
  Bell,
  Inbox,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Store,
  User,
} from 'lucide-react';

import { Layout } from '@/components/layout/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  useListingInquiriesReceived,
  useListingInquiriesSent,
  useMarkListingInquiryRead,
  useMarkListingInquiryReplied,
} from '@/hooks/use-listing-inquiries';
import { useAuth } from '@/hooks/use-auth';
import { usePublicUsers } from '@/hooks/use-users';
import { formatRelativeTime } from '@/lib/dates';

type InquiryTab = 'received' | 'sent';
const INQUIRY_RECEIVER_ROLES = new Set<UserRole>([
  UserRole.MERCHANT,
  UserRole.INVESTOR,
  UserRole.RESIDENT,
  UserRole.ADMIN,
]);

const statusConfig: Record<
  'pending' | 'read' | 'replied',
  { label: string; variant: 'secondary' | 'outline' | 'default' }
> = {
  pending: { label: 'غير مقروء', variant: 'secondary' },
  read: { label: 'تمت القراءة', variant: 'outline' },
  replied: { label: 'تم الرد', variant: 'default' },
};

function InquiryListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-48 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function ListingInquiriesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get('focus');
  const tabFromUrl = searchParams.get('tab') === 'sent' ? 'sent' : 'received';
  const canReceiveInquiries = user !== null && INQUIRY_RECEIVER_ROLES.has(user.role);
  const resolvedTabFromUrl: InquiryTab = canReceiveInquiries ? tabFromUrl : 'sent';
  const [activeTab, setActiveTab] = useState<InquiryTab>(resolvedTabFromUrl);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const markedReadRef = useRef<string | null>(null);
  const inquiryLimit = focusId ? 100 : 20;

  const receivedQuery = useListingInquiriesReceived(
    { limit: inquiryLimit },
    { enabled: canReceiveInquiries },
  );
  const sentQuery = useListingInquiriesSent({ limit: inquiryLimit });
  const markReadMutation = useMarkListingInquiryRead();
  const markRead = markReadMutation.mutate;
  const replyMutation = useMarkListingInquiryReplied();

  const receivedData = canReceiveInquiries ? receivedQuery.data?.data : undefined;
  const sentData = sentQuery.data?.data;
  const received = useMemo(() => receivedData ?? [], [receivedData]);
  const sent = useMemo(() => sentData ?? [], [sentData]);

  const publicUserIds = useMemo(
    () => [
      ...received.map((inquiry) => inquiry.senderId),
      ...sent.map((inquiry) => inquiry.receiverId),
    ],
    [received, sent],
  );
  const publicUsersQuery = usePublicUsers(publicUserIds);
  const publicUsers = publicUsersQuery.data ?? {};

  useEffect(() => {
    if (resolvedTabFromUrl !== activeTab) {
      setActiveTab(resolvedTabFromUrl);
    }
  }, [activeTab, resolvedTabFromUrl]);

  useEffect(() => {
    if (markedReadRef.current !== focusId) {
      markedReadRef.current = null;
    }
  }, [focusId]);

  useEffect(() => {
    if (activeTab !== 'received') {
      markedReadRef.current = null;
      return;
    }

    if (!focusId || markedReadRef.current === focusId) return;
    const focusedInquiry = received.find((inquiry) => inquiry.id === focusId);
    if (!focusedInquiry || focusedInquiry.status !== 'pending') return;
    markedReadRef.current = focusId;
    markRead(focusId);
  }, [activeTab, focusId, markRead, received]);

  const handleTabChange = (value: string) => {
    const nextTab: InquiryTab =
      value === 'sent' || !canReceiveInquiries ? 'sent' : 'received';
    setActiveTab(nextTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', nextTab);
      next.delete('focus');
      return next;
    });
  };

  return (
    <Layout>
      <section className="py-10 md:py-14">
        <div className="container max-w-5xl space-y-6 px-4">
          <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Inbox className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                  استفسارات الإعلانات
                </h1>
                <p className="text-sm text-muted-foreground">
                  تابع الوارد على إعلاناتك والرسائل التي أرسلتها إلى الملاك من مكان واحد.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:w-[280px]">
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">الوارد</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {receivedQuery.isLoading ? '...' : receivedQuery.data?.total ?? 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">المرسل</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {sentQuery.isLoading ? '...' : sentQuery.data?.total ?? 0}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className={`grid w-full ${canReceiveInquiries ? 'grid-cols-2 md:w-[320px]' : 'grid-cols-1 md:w-[160px]'}`}>
              <TabsTrigger value="received">الوارد</TabsTrigger>
              <TabsTrigger value="sent">المرسل</TabsTrigger>
            </TabsList>

            <TabsContent value="received" className="space-y-4">
              {receivedQuery.isLoading ? (
                <InquiryListSkeleton />
              ) : receivedQuery.isError ? (
                <Card>
                  <CardContent className="p-8 text-center text-sm text-destructive">
                    تعذر تحميل الاستفسارات الواردة حالياً.
                  </CardContent>
                </Card>
              ) : received.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    لا توجد استفسارات واردة على إعلاناتك حتى الآن.
                  </CardContent>
                </Card>
              ) : (
                received.map((inquiry) => {
                  const sender = publicUsers[inquiry.senderId];
                  const status = statusConfig[inquiry.status];
                  const replyDraft = replyDrafts[inquiry.id] ?? inquiry.replyMessage ?? '';
                  const isFocused = inquiry.id === focusId;

                  return (
                    <Card
                      key={inquiry.id}
                      className={isFocused ? 'border-primary/50 shadow-sm' : 'border-border/50'}
                    >
                      <CardHeader className="gap-4 pb-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={status.variant}>{status.label}</Badge>
                              {isFocused && (
                                <Badge variant="outline" className="gap-1">
                                  <Bell className="h-3 w-3" />
                                  من الإشعارات
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-xl">{inquiry.listingTitle}</CardTitle>
                            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span>{sender?.full_name ?? inquiry.contactName}</span>
                              <span>•</span>
                              <span>{formatRelativeTime(inquiry.createdAt)}</span>
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/marketplace/ads/${inquiry.listingId}`}>عرض الإعلان</Link>
                            </Button>
                            {inquiry.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => markReadMutation.mutate(inquiry.id)}
                                disabled={markReadMutation.isPending}
                              >
                                تحديد كمقروء
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="rounded-2xl bg-muted/40 p-4">
                          <p className="mb-2 text-sm font-medium text-foreground">
                            رسالة المهتم بالإعلان
                          </p>
                          <p className="whitespace-pre-line text-sm text-muted-foreground">
                            {inquiry.message}
                          </p>
                        </div>

                        {(inquiry.contactEmail || inquiry.contactPhone) && (
                          <div className="flex flex-wrap gap-2">
                            {inquiry.contactEmail && (
                              <Button asChild size="sm" variant="outline">
                                <a href={`mailto:${inquiry.contactEmail}`}>
                                  <Mail className="ms-2 h-4 w-4" />
                                  مراسلة بالبريد
                                </a>
                              </Button>
                            )}
                            {inquiry.contactPhone && (
                              <Button asChild size="sm" variant="outline">
                                <a href={`tel:${inquiry.contactPhone}`}>
                                  <Phone className="ms-2 h-4 w-4" />
                                  اتصال مباشر
                                </a>
                              </Button>
                            )}
                          </div>
                        )}

                        <div className="space-y-3 rounded-2xl border border-border/60 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">الرد داخل المنصة</p>
                            {inquiry.respondedAt && (
                              <span className="text-xs text-muted-foreground">
                                آخر رد {formatRelativeTime(inquiry.respondedAt)}
                              </span>
                            )}
                          </div>
                          <Textarea
                            rows={4}
                            value={replyDraft}
                            onChange={(event) =>
                              setReplyDrafts((prev) => ({
                                ...prev,
                                [inquiry.id]: event.target.value,
                              }))
                            }
                            placeholder="اكتب ردك هنا ليظهر لصاحب الاستفسار في صندوق الرسائل..."
                          />
                          <div className="flex flex-wrap justify-between gap-2">
                            {inquiry.replyMessage && (
                              <p className="text-xs text-muted-foreground">
                                تم حفظ الرد داخل سجل هذا الاستفسار ويمكن للمستخدم رؤيته في تبويب
                                الرسائل المرسلة.
                              </p>
                            )}
                            <Button
                              size="sm"
                              className="me-auto"
                              disabled={replyMutation.isPending || !replyDraft.trim()}
                              onClick={() =>
                                replyMutation.mutate({
                                  id: inquiry.id,
                                  message: replyDraft.trim(),
                                })
                              }
                            >
                              <Send className="ms-2 h-4 w-4" />
                              {inquiry.replyMessage ? 'تحديث الرد' : 'إرسال الرد'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="sent" className="space-y-4">
              {sentQuery.isLoading ? (
                <InquiryListSkeleton />
              ) : sentQuery.isError ? (
                <Card>
                  <CardContent className="p-8 text-center text-sm text-destructive">
                    تعذر تحميل الاستفسارات المرسلة حالياً.
                  </CardContent>
                </Card>
              ) : sent.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    لم ترسل أي استفسارات بعد. يمكنك التواصل مع مالكي الإعلانات من صفحة الإعلان
                    نفسها.
                  </CardContent>
                </Card>
              ) : (
                sent.map((inquiry) => {
                  const owner = publicUsers[inquiry.receiverId];
                  const status = statusConfig[inquiry.status];
                  const isFocused = inquiry.id === focusId;

                  return (
                    <Card
                      key={inquiry.id}
                      className={isFocused ? 'border-primary/50 shadow-sm' : 'border-border/50'}
                    >
                      <CardHeader className="gap-4 pb-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={status.variant}>{status.label}</Badge>
                              {isFocused && (
                                <Badge variant="outline" className="gap-1">
                                  <Bell className="h-3 w-3" />
                                  من الإشعارات
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-xl">{inquiry.listingTitle}</CardTitle>
                            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              <Store className="h-4 w-4" />
                              <span>{owner?.full_name ?? 'مالك الإعلان'}</span>
                              <span>•</span>
                              <span>{formatRelativeTime(inquiry.createdAt)}</span>
                            </p>
                          </div>

                          <Button asChild size="sm" variant="outline">
                            <Link to={`/marketplace/ads/${inquiry.listingId}`}>عرض الإعلان</Link>
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="rounded-2xl bg-muted/40 p-4">
                          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            رسالتك الأصلية
                          </p>
                          <p className="whitespace-pre-line text-sm text-muted-foreground">
                            {inquiry.message}
                          </p>
                        </div>

                        {inquiry.replyMessage ? (
                          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                            <p className="mb-2 text-sm font-medium text-foreground">
                              رد مالك الإعلان
                            </p>
                            <p className="whitespace-pre-line text-sm text-muted-foreground">
                              {inquiry.replyMessage}
                            </p>
                            {inquiry.respondedAt && (
                              <p className="mt-3 text-xs text-muted-foreground">
                                تم الرد {formatRelativeTime(inquiry.respondedAt)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                            لم يصل رد بعد. سيظهر هنا عند استجابة مالك الإعلان، كما ستصلك إشعارات
                            المنصة.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
}
