import { Layout } from '@/components/layout/Layout';
import { useNavigate, useParams } from 'react-router';
import { ArrowRight, MapPin, Phone, Package, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBusiness } from '@/hooks/use-businesses';
import { districtLabel, unitLabel } from '@/lib/format';
import { Skeleton } from '@/components/motion/Skeleton';

const SupplierDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: business, isLoading, isError } = useBusiness(id);

  if (isLoading) {
    return (
      <Layout title="تفاصيل المورد">
        <section className="py-8 md:py-12">
          <div className="container px-4">
            <Button variant="ghost" onClick={() => void navigate('/marketplace')} className="mb-6">
              <ArrowRight className="h-4 w-4 ltr:rotate-180" />
              العودة للبورصة
            </Button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
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

  if (isError || !business) {
    return (
      <Layout title="تفاصيل المورد">
        <section className="py-8 md:py-12">
          <div className="container px-4 text-center">
            <p className="text-lg text-muted-foreground mb-4">لم يتم العثور على المورد</p>
            <Button onClick={() => void navigate('/marketplace')}>العودة للبورصة</Button>
          </div>
        </section>
      </Layout>
    );
  }

  const isVerified = business.verificationStatus === 'verified';

  return (
    <Layout title="تفاصيل المورد">
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate('/marketplace')} className="mb-6">
            <ArrowRight className="h-4 w-4 ltr:rotate-180" />
            العودة للبورصة
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Package className="h-10 w-10 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-2xl font-bold text-foreground">{business.nameAr}</h1>
                        {isVerified && (
                          <Badge className="bg-primary/10 text-primary gap-1">
                            <Shield className="h-3 w-3" />
                            موثق
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                        {business.district && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span>{districtLabel(business.district)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {business.commodities.map((commodity) => (
                          <Badge key={commodity.id} variant="secondary">
                            {commodity.nameAr}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* About */}
              {(business.descriptionAr ?? business.description) && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">عن المورد</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {business.descriptionAr ?? business.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Commodities */}
              {business.commodities.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">المنتجات</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table className="table-fixed">
                      <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="px-6 py-4 text-start">المنتج</TableHead>
                          <TableHead className="px-6 py-4 text-start">الوحدة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {business.commodities.map((commodity) => (
                          <TableRow key={commodity.id}>
                            <TableCell className="px-6 py-4 text-start">
                              <span className="font-medium text-foreground">
                                {commodity.nameAr}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-start">
                              <span className="text-sm text-muted-foreground">
                                {unitLabel(commodity.unit)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="border-border/50 sticky top-20">
                <CardHeader>
                  <CardTitle className="text-lg">معلومات التواصل</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {business.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-primary" />
                        <span className="text-sm" dir="ltr">
                          {business.phone}
                        </span>
                      </div>
                    )}
                    {business.website && (
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-primary" />
                        <span className="text-sm" dir="ltr">
                          {business.website}
                        </span>
                      </div>
                    )}
                    {business.district && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <span className="text-sm">
                          {districtLabel(business.district)}، الوادي الجديد
                        </span>
                      </div>
                    )}
                  </div>

                  {business.phone && (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => alert(`للتواصل مع ${business.nameAr}: ${business.phone}`)}
                    >
                      <Phone className="h-5 w-5 ms-2" />
                      اتصل الآن
                    </Button>
                  )}

                  {business.website && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(business.website!, '_blank')}
                    >
                      <Globe className="h-4 w-4 ms-2" />
                      زيارة الموقع
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

export default SupplierDetailsPage;
