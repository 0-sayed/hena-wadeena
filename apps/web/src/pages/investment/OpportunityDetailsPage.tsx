import { useQuery } from '@tanstack/react-query';
import { UserRole } from '@hena-wadeena/types';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  Building2,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  TrendingUp,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LtrText } from '@/components/ui/ltr-text';
import { Badge } from '@/components/ui/badge';
import { InteractiveMap } from '@/components/maps/InteractiveMap';
import { investmentAPI } from '@/services/api';
import { formatPrice } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';

const OpportunityDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
  const {
    data: opportunity,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['investment', 'opportunities', id],
    queryFn: () => investmentAPI.getOpportunity(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-16 space-y-6">
          <div className="h-10 w-40 animate-pulse rounded-xl bg-muted" />
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      </Layout>
    );
  }

  if (isError || !opportunity) {
    return (
      <Layout>
        <div className="container py-20 text-center space-y-4">
          <p className="text-lg text-muted-foreground">تعذر تحميل بيانات الفرصة الاستثمارية.</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => void navigate('/investment')}>
              العودة للاستثمار
            </Button>
            <Button onClick={() => void refetch()}>إعادة المحاولة</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const canAccessInvestmentContact =
    isAuthenticated && (user?.role === UserRole.INVESTOR || user?.role === UserRole.ADMIN);

  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <Button
            variant="ghost"
            onClick={() => void navigate('/investment')}
            className="mb-6 gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للاستثمار
          </Button>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge className="bg-primary">{opportunity.status}</Badge>
                    <Badge variant="outline">{opportunity.sector}</Badge>
                  </div>
                  <h1 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">
                    {opportunity.titleAr}
                  </h1>
                  <div className="flex flex-wrap gap-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span>{opportunity.area}</span>
                    </div>
                    {opportunity.expectedReturnPct != null && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <span>العائد المتوقع: {opportunity.expectedReturnPct}%</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {opportunity.description && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">وصف المشروع</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                      {opportunity.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {opportunity.incentives && opportunity.incentives.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">الحوافز والمزايا</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid gap-3 md:grid-cols-2">
                      {opportunity.incentives.map((incentive) => (
                        <li key={incentive} className="rounded-xl bg-muted/40 px-4 py-3 text-sm">
                          {incentive}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">موقع المشروع</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {opportunity.location ? (
                    <InteractiveMap
                      locations={[
                        {
                          id: opportunity.id,
                          name: opportunity.titleAr,
                          lat: opportunity.location.y,
                          lng: opportunity.location.x,
                          description: opportunity.area,
                          type: 'فرصة استثمارية',
                          image: opportunity.images?.[0],
                          color: '#f59e0b',
                        },
                      ]}
                      center={[opportunity.location.y, opportunity.location.x]}
                      zoom={11}
                      className="h-[320px] w-full rounded-xl overflow-hidden"
                    />
                  ) : (
                    <div className="rounded-xl bg-muted/40 p-6 text-center text-muted-foreground">
                      لا توجد إحداثيات متاحة لهذه الفرصة حالياً.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">المستندات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {canAccessInvestmentContact ? (
                    opportunity.documents && opportunity.documents.length > 0 ? (
                      opportunity.documents.map((documentUrl) => (
                        <a
                          key={documentUrl}
                          href={documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-primary" />
                            <span className="font-medium">مستند مرفق</span>
                          </div>
                          <Badge variant="secondary">فتح</Badge>
                        </a>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">لا توجد مستندات مرفقة حالياً.</p>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      سجل الدخول كمستثمر أو مسؤول لعرض المستندات التفصيلية.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="sticky top-20 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">تفاصيل الاستثمار</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-primary/5 p-4">
                    <p className="mb-1 text-sm text-muted-foreground">حجم الاستثمار المطلوب</p>
                    <p className="text-xl font-bold text-primary">
                      {formatPrice(opportunity.minInvestment)} -{' '}
                      {formatPrice(opportunity.maxInvestment)} ج.م
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="mb-1 text-xs text-muted-foreground">العائد المتوقع</p>
                      <p className="font-semibold text-primary">
                        {opportunity.expectedReturnPct != null
                          ? `${opportunity.expectedReturnPct}%`
                          : '-'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="mb-1 text-xs text-muted-foreground">فترة الاسترداد</p>
                      <p className="font-semibold">
                        {opportunity.paybackPeriodYears != null
                          ? `${opportunity.paybackPeriodYears} سنة`
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {canAccessInvestmentContact ? (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => void navigate(`/investment/contact/${opportunity.id}`)}
                    >
                      <Mail className="h-5 w-5 ms-2" />
                      إرسال استفسار استثماري
                    </Button>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">معلومات التواصل</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {canAccessInvestmentContact ? (
                    opportunity.contact ? (
                      <>
                        {opportunity.contact.name && (
                          <div className="flex items-center gap-3">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span>{opportunity.contact.name}</span>
                          </div>
                        )}
                        {opportunity.contact.phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-primary" />
                            <LtrText>{opportunity.contact.phone}</LtrText>
                          </div>
                        )}
                        {opportunity.contact.email && (
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-primary" />
                            <LtrText>{opportunity.contact.email}</LtrText>
                          </div>
                        )}
                        {opportunity.contact.website && (
                          <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4 text-primary" />
                            <span>{opportunity.contact.website}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">لا توجد بيانات تواصل متاحة حالياً.</p>
                    )
                  ) : (
                    <p className="text-muted-foreground">
                      سجل الدخول كمستثمر أو مسؤول لعرض بيانات التواصل الكاملة.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default OpportunityDetailsPage;
