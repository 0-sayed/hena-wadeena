import { UserRole } from '@hena-wadeena/types';
import { useNavigate, useParams } from 'react-router';
import { ArrowRight, Building2, Globe, MapPin, Phone, Send, Shield } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/layout/Layout';
import { LtrText } from '@/components/ui/ltr-text';
import { Skeleton } from '@/components/motion/Skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useBusiness } from '@/hooks/use-businesses';
import { districtLabel, unitLabel } from '@/lib/format';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';

function getSafeWebsiteUrl(website: string | null | undefined): string | null {
  if (!website) {
    return null;
  }

  try {
    const url = new URL(website);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return website;
    }
  } catch {
    return null;
  }

  return null;
}

const StartupDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { language, user } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const { data: startup, isLoading, isError } = useBusiness(id);

  if (isLoading) {
    return (
      <Layout>
        <section className="py-8 md:py-12">
          <div className="container px-4">
            <Button variant="ghost" onClick={() => void navigate('/investment')} className="mb-6">
              <ArrowRight className="ml-2 h-4 w-4" />
              {pickLocalizedCopy(appLanguage, {
                ar: 'العودة إلى الاستثمار',
                en: 'Back to investment',
              })}
            </Button>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <Skeleton h="h-40" className="rounded-xl" />
                <Skeleton h="h-32" className="rounded-xl" />
                <Skeleton h="h-48" className="rounded-xl" />
              </div>
              <Skeleton h="h-64" className="rounded-xl" />
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (isError || !startup) {
    return (
      <Layout>
        <section className="py-8 md:py-12">
          <div className="container px-4 text-center">
            <p className="mb-4 text-lg text-muted-foreground">
              {pickLocalizedCopy(appLanguage, {
                ar: 'تعذر تحميل بيانات الشركة الناشئة.',
                en: 'Unable to load startup details.',
              })}
            </p>
            <Button onClick={() => void navigate('/investment')}>
              {pickLocalizedCopy(appLanguage, {
                ar: 'العودة إلى الاستثمار',
                en: 'Back to investment',
              })}
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  const startupName =
    pickLocalizedField(appLanguage, {
      ar: startup.nameAr,
      en: startup.nameEn,
    }) ??
    startup.nameAr ??
    startup.nameEn;
  const description =
    pickLocalizedField(appLanguage, {
      ar: startup.descriptionAr,
      en: startup.description,
    }) ??
    startup.descriptionAr ??
    startup.description;
  const isVerified = startup.verificationStatus === 'verified';
  const canAccessInvestmentContact =
    user?.role === UserRole.ADMIN || user?.role === UserRole.INVESTOR;
  const safeWebsiteUrl = getSafeWebsiteUrl(startup.website);

  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate('/investment')} className="mb-6">
            <ArrowRight className="ml-2 h-4 w-4" />
            {pickLocalizedCopy(appLanguage, {
              ar: 'العودة إلى الاستثمار',
              en: 'Back to investment',
            })}
          </Button>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-primary/10">
                      {startup.logoUrl ? (
                        <img
                          src={startup.logoUrl}
                          alt={startupName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Building2 className="h-10 w-10 text-primary" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold text-foreground">{startupName}</h1>
                        {isVerified && (
                          <Badge className="gap-1 bg-primary/10 text-primary">
                            <Shield className="h-3 w-3" />
                            {pickLocalizedCopy(appLanguage, {
                              ar: 'موثق',
                              en: 'Verified',
                            })}
                          </Badge>
                        )}
                        <Badge variant="secondary">{startup.category}</Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                        {startup.district && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span>{districtLabel(startup.district, appLanguage)}</span>
                          </div>
                        )}
                        <div>
                          {pickLocalizedCopy(appLanguage, { ar: 'الحالة', en: 'Status' })}:{' '}
                          {startup.status}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {description && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {pickLocalizedCopy(appLanguage, {
                        ar: 'نبذة عن الشركة',
                        en: 'About the startup',
                      })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="leading-relaxed text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'البيانات المتاحة',
                      en: 'Available information',
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">
                      {pickLocalizedCopy(appLanguage, { ar: 'الفئة', en: 'Category' })}
                    </p>
                    <p className="mt-1 font-semibold text-foreground">{startup.category}</p>
                  </div>

                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">
                      {pickLocalizedCopy(appLanguage, { ar: 'المنطقة', en: 'District' })}
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      {startup.district
                        ? districtLabel(startup.district, appLanguage)
                        : pickLocalizedCopy(appLanguage, {
                            ar: 'غير محدد',
                            en: 'Not specified',
                          })}
                    </p>
                  </div>

                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">
                      {pickLocalizedCopy(appLanguage, { ar: 'الحالة', en: 'Status' })}
                    </p>
                    <p className="mt-1 font-semibold text-foreground">{startup.status}</p>
                  </div>

                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">
                      {pickLocalizedCopy(appLanguage, { ar: 'آخر تحديث', en: 'Last updated' })}
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      {new Date(startup.updatedAt).toLocaleDateString(
                        appLanguage === 'en' ? 'en-US' : 'ar-EG',
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {startup.commodities.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {pickLocalizedCopy(appLanguage, {
                        ar: 'مجالات أو منتجات مرتبطة',
                        en: 'Related offerings',
                      })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {startup.commodities.map((commodity) => (
                      <div
                        key={commodity.id}
                        className="flex items-center justify-between rounded-xl border border-border/60 p-4"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {pickLocalizedField(appLanguage, {
                              ar: commodity.nameAr,
                              en: commodity.nameEn,
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">{commodity.category}</p>
                        </div>
                        <Badge variant="outline">{unitLabel(commodity.unit, appLanguage)}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card className="sticky top-4 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'التواصل والاهتمام',
                      en: 'Contact and interest',
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {canAccessInvestmentContact ? (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() =>
                        void navigate(`/investment/contact/${startup.id}?entity=startup`)
                      }
                    >
                      <Send className="ml-2 h-5 w-5" />
                      {pickLocalizedCopy(appLanguage, {
                        ar: 'إرسال استفسار',
                        en: 'Send inquiry',
                      })}
                    </Button>
                  ) : null}

                  <div className="space-y-3 text-sm">
                    {startup.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-primary" />
                        <LtrText>{startup.phone}</LtrText>
                      </div>
                    )}

                    {startup.website && (
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-primary" />
                        <LtrText>{startup.website}</LtrText>
                      </div>
                    )}

                    {startup.district && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{districtLabel(startup.district, appLanguage)}</span>
                      </div>
                    )}
                  </div>

                  {startup.website && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (safeWebsiteUrl) {
                          window.open(safeWebsiteUrl, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    >
                      <Globe className="ml-2 h-4 w-4" />
                      {pickLocalizedCopy(appLanguage, {
                        ar: 'زيارة الموقع',
                        en: 'Visit website',
                      })}
                    </Button>
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

export default StartupDetailsPage;
