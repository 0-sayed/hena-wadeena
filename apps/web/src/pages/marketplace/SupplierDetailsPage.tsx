import { Layout } from '@/components/layout/Layout';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  MapPin,
  Star,
  Phone,
  Mail,
  Clock,
  Package,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const suppliersData: Record<
  string,
  {
    id: number;
    name: string;
    specialties: string[];
    city: string;
    rating: number;
    reviews: number;
    verified: boolean;
    description: string;
    phone: string;
    email: string;
    workingHours: string;
    products: { name: string; price: number; unit: string }[];
    experience: string;
  }
> = {
  '1': {
    id: 1,
    name: 'مزارع الوادي الأخضر',
    specialties: ['تمور', 'زيتون', 'عنب'],
    city: 'الخارجة',
    rating: 4.8,
    reviews: 124,
    verified: true,
    description:
      'مزرعة متكاملة تأسست عام 2005 متخصصة في إنتاج أجود أنواع التمور والزيتون والعنب. نعتمد على أحدث تقنيات الري والزراعة العضوية لضمان أعلى جودة لمنتجاتنا. نوفر منتجاتنا للسوق المحلي والتصدير.',
    phone: '01012345678',
    email: 'info@green-valley-farms.eg',
    workingHours: 'السبت - الخميس: 8 ص - 5 م',
    products: [
      { name: 'تمر سيوي', price: 45, unit: 'كجم' },
      { name: 'تمر مجهول', price: 120, unit: 'كجم' },
      { name: 'زيتون أخضر', price: 28, unit: 'كجم' },
      { name: 'زيت زيتون بكر', price: 180, unit: 'لتر' },
      { name: 'عنب', price: 35, unit: 'كجم' },
    ],
    experience: '19 سنة',
  },
  '2': {
    id: 2,
    name: 'شركة الواحات للمنتجات الزراعية',
    specialties: ['قمح', 'أرز', 'برسيم'],
    city: 'الداخلة',
    rating: 4.6,
    reviews: 89,
    verified: true,
    description:
      'شركة رائدة في تجارة الحبوب والمحاصيل الزراعية في الوادي الجديد. نوفر منتجات عالية الجودة بأسعار تنافسية مع خدمات توصيل لجميع المحافظات.',
    phone: '01098765432',
    email: 'sales@oasis-agri.eg',
    workingHours: 'السبت - الخميس: 7 ص - 4 م',
    products: [
      { name: 'قمح', price: 1250, unit: 'طن' },
      { name: 'أرز', price: 22, unit: 'كجم' },
      { name: 'برسيم', price: 800, unit: 'طن' },
      { name: 'ذرة', price: 950, unit: 'طن' },
    ],
    experience: '15 سنة',
  },
  '3': {
    id: 3,
    name: 'مزرعة النخيل الذهبي',
    specialties: ['تمور', 'نخيل'],
    city: 'الفرافرة',
    rating: 4.9,
    reviews: 156,
    verified: true,
    description:
      'أعرق مزارع النخيل في واحة الفرافرة. متخصصون في إنتاج أجود أنواع التمور المصرية. حاصلون على شهادات جودة دولية ونصدر لأكثر من 10 دول.',
    phone: '01234567890',
    email: 'golden.palms@email.com',
    workingHours: 'السبت - الخميس: 8 ص - 6 م',
    products: [
      { name: 'تمر سيوي فاخر', price: 55, unit: 'كجم' },
      { name: 'تمر مجهول ممتاز', price: 150, unit: 'كجم' },
      { name: 'تمر عجوة', price: 80, unit: 'كجم' },
      { name: 'دبس تمر', price: 60, unit: 'لتر' },
    ],
    experience: '25 سنة',
  },
  '4': {
    id: 4,
    name: 'جمعية المزارعين التعاونية',
    specialties: ['خضروات', 'فواكه'],
    city: 'باريس',
    rating: 4.4,
    reviews: 67,
    verified: false,
    description:
      'جمعية تعاونية تجمع صغار المزارعين في مدينة باريس لتسويق منتجاتهم الزراعية بأسعار عادلة. نوفر خضروات وفواكه طازجة يومياً.',
    phone: '01112233445',
    email: 'farmers-coop@email.com',
    workingHours: 'يومياً: 6 ص - 2 م',
    products: [
      { name: 'طماطم', price: 12, unit: 'كجم' },
      { name: 'بطاطس', price: 8, unit: 'كجم' },
      { name: 'بصل', price: 6, unit: 'كجم' },
      { name: 'فلفل', price: 15, unit: 'كجم' },
    ],
    experience: '10 سنوات',
  },
};

const defaultSupplier = suppliersData['1'];

const SupplierDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const supplier = suppliersData[id || '1'] || defaultSupplier;

  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate('/marketplace')} className="mb-6">
            <ArrowRight className="h-4 w-4 ml-2" />
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
                        <h1 className="text-2xl font-bold text-foreground">{supplier.name}</h1>
                        {supplier.verified && (
                          <Badge className="bg-primary/10 text-primary gap-1">
                            <Shield className="h-3 w-3" />
                            موثق
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>{supplier.city}</span>
                        </div>
                        <div className="flex items-center gap-1 text-accent-foreground">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-medium">{supplier.rating}</span>
                          <span className="text-muted-foreground">({supplier.reviews} تقييم)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span>خبرة {supplier.experience}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {supplier.specialties.map((specialty) => (
                          <Badge key={specialty} variant="secondary">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* About */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">عن المورد</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{supplier.description}</p>
                </CardContent>
              </Card>

              {/* Products */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">المنتجات والأسعار</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">
                            المنتج
                          </th>
                          <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">
                            السعر
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplier.products.map((product, index) => (
                          <tr
                            key={product.name}
                            className={
                              index !== supplier.products.length - 1
                                ? 'border-b border-border/50'
                                : ''
                            }
                          >
                            <td className="py-4 px-6">
                              <span className="font-medium text-foreground">{product.name}</span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="font-semibold text-primary">{product.price}</span>
                              <span className="text-sm text-muted-foreground mr-1">
                                جنيه/{product.unit}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Card */}
              <Card className="border-border/50 sticky top-4">
                <CardHeader>
                  <CardTitle className="text-lg">معلومات التواصل</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-primary" />
                      <span className="text-sm" dir="ltr">
                        {supplier.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <span className="text-sm" dir="ltr">
                        {supplier.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="text-sm">{supplier.workingHours}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span className="text-sm">{supplier.city}، الوادي الجديد</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => alert(`للتواصل مع ${supplier.name}: ${supplier.phone}`)}
                  >
                    <Phone className="h-5 w-5 ml-2" />
                    اتصل الآن
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => (window.location.href = `mailto:${supplier.email}`)}
                  >
                    <Mail className="h-4 w-4 ml-2" />
                    أرسل بريد إلكتروني
                  </Button>
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
