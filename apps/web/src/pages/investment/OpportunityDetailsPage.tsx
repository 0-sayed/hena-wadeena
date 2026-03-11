import { Layout } from '@/components/layout/Layout';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  MapPin,
  TrendingUp,
  Building2,
  FileText,
  Phone,
  Mail,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InteractiveMap } from '@/components/maps/InteractiveMap';

// Mock data
const opportunityData = {
  id: 1,
  title: 'مشروع زراعي متكامل - 100 فدان',
  category: 'زراعة',
  location: 'الداخلة',
  lat: 25.4867,
  lng: 29.0,
  investment: '5-10 مليون جنيه',
  roi: '18-22%',
  status: 'متاح',
  description: 'فرصة استثمارية في مشروع زراعي متكامل يشمل زراعة التمور والزيتون مع نظام ري حديث.',
  fullDescription: `
    يقع المشروع في قلب واحة الداخلة على مساحة 100 فدان من الأراضي الزراعية الخصبة. 
    يتميز المشروع بموقع استراتيجي قريب من الطرق الرئيسية مما يسهل عمليات النقل والتوزيع.
    
    يشمل المشروع:
    - زراعة 5000 نخلة من أجود أنواع التمور
    - 3000 شجرة زيتون
    - نظام ري بالتنقيط حديث وموفر للمياه
    - مبنى إداري ومخازن مبردة
    - خطوط تعبئة وتغليف
  `,
  highlights: [
    'موقع استراتيجي على الطريق الرئيسي',
    'تربة خصبة ومياه وفيرة',
    'إعفاءات ضريبية لمدة 10 سنوات',
    'دعم حكومي للمشاريع الزراعية',
    'سوق تصديري واعد',
  ],
  timeline: '3-5 سنوات للعائد الكامل',
  minInvestment: '5,000,000 جنيه',
  maxInvestment: '10,000,000 جنيه',
  paybackPeriod: '4 سنوات',
  documents: [
    { name: 'دراسة الجدوى', type: 'PDF' },
    { name: 'خريطة الموقع', type: 'PDF' },
    { name: 'التراخيص والموافقات', type: 'PDF' },
  ],
  contact: {
    name: 'مكتب الاستثمار - الوادي الجديد',
    phone: '0927123456',
    email: 'invest@newvalley.gov.eg',
    website: 'www.newvalley-invest.gov.eg',
  },
};

const OpportunityDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const mapLocations = [
    {
      id: 1,
      name: opportunityData.title,
      lat: opportunityData.lat,
      lng: opportunityData.lng,
      description: opportunityData.location,
      type: 'فرصة استثمارية',
    },
  ];

  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate('/investment')} className="mb-6">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة للاستثمار
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Badge className="bg-primary">{opportunityData.status}</Badge>
                    <Badge variant="outline">{opportunityData.category}</Badge>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                    {opportunityData.title}
                  </h1>

                  <div className="flex flex-wrap gap-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span>{opportunityData.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span>العائد المتوقع: {opportunityData.roi}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">وصف المشروع</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                    {opportunityData.fullDescription}
                  </p>
                </CardContent>
              </Card>

              {/* Highlights */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">مميزات المشروع</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {opportunityData.highlights.map((highlight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">{index + 1}</span>
                        </div>
                        <span className="text-muted-foreground">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Map */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">موقع المشروع</CardTitle>
                </CardHeader>
                <CardContent className="p-0 pb-4 px-4">
                  <InteractiveMap
                    locations={mapLocations}
                    center={[opportunityData.lat, opportunityData.lng]}
                    zoom={10}
                    className="h-[300px] w-full rounded-xl overflow-hidden"
                  />
                </CardContent>
              </Card>

              {/* Documents */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">المستندات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {opportunityData.documents.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <span className="font-medium">{doc.name}</span>
                        </div>
                        <Badge variant="secondary">{doc.type}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Investment Details */}
              <Card className="border-border/50 sticky top-4">
                <CardHeader>
                  <CardTitle className="text-lg">تفاصيل الاستثمار</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-primary/5 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">حجم الاستثمار المطلوب</p>
                    <p className="text-xl font-bold text-primary">{opportunityData.investment}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">العائد المتوقع</p>
                      <p className="font-semibold text-primary">{opportunityData.roi}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">فترة الاسترداد</p>
                      <p className="font-semibold">{opportunityData.paybackPeriod}</p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">الجدول الزمني</p>
                    <p className="font-semibold">{opportunityData.timeline}</p>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => void navigate(`/investment/contact/${id}`)}
                  >
                    <Mail className="h-5 w-5 ml-2" />
                    تواصل للاستثمار
                  </Button>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">معلومات التواصل</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="text-sm">{opportunityData.contact.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <span className="text-sm">{opportunityData.contact.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <span className="text-sm">{opportunityData.contact.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-primary" />
                    <span className="text-sm">{opportunityData.contact.website}</span>
                  </div>
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
