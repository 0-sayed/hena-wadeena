import { Link } from 'react-router';
import { Truck, BarChart3, TrendingUp, Compass, ArrowLeft, Users, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SR, FloatingBlob } from '@/components/motion/ScrollReveal';

const missions = [
  {
    id: 'tourism',
    title: 'السياحة والمجتمع',
    description: 'المعالم الأثرية، المرشدين السياحيين، السكن للطلاب، وقصص الوادي.',
    icon: Compass,
    href: '/tourism',
    gradient: 'from-chart-4 to-primary',
  },
  {
    id: 'guides',
    title: 'المرشدين السياحيين',
    description: 'احجز مرشد سياحي معتمد، استعرض الباقات والتقييمات، واحجز رحلتك.',
    icon: Users,
    href: '/guides',
    gradient: 'from-purple-500 to-purple-700',
  },
  {
    id: 'logistics',
    title: 'اللوجستيات والتنقل',
    description: 'خطوط المواصلات، المحطات، ومشاركة الرحلات للتنقل بسهولة داخل وخارج الوادي.',
    icon: Truck,
    href: '/logistics',
    gradient: 'from-primary to-primary/80',
  },
  {
    id: 'marketplace',
    title: 'البورصة والأسعار',
    description: 'أسعار المنتجات الزراعية والمحلية، دليل الموردين، والتواصل المباشر.',
    icon: BarChart3,
    href: '/marketplace',
    gradient: 'from-accent to-accent/80',
  },
  {
    id: 'investment',
    title: 'فرص الاستثمار',
    description: 'اكتشف الفرص الاستثمارية، تواصل مع الشركات الناشئة، وابدأ مشروعك.',
    icon: TrendingUp,
    href: '/investment',
    gradient: 'from-chart-3 to-chart-5',
  },
  {
    id: 'search',
    title: 'البحث والمساعد الذكي',
    description: 'ابحث عبر المنصة بالكامل أو اسأل المساعد الذكي عن أي شيء يخص الوادي الجديد.',
    icon: Search,
    href: '/search',
    gradient: 'from-sky-500 to-blue-600',
  },
];

export function MissionCards() {
  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      <FloatingBlob
        className="top-0 left-0 -translate-x-1/2 -translate-y-1/2"
        color="primary"
        size="lg"
        animation={1}
      />
      <FloatingBlob
        className="bottom-0 right-0 translate-x-1/3 translate-y-1/3"
        color="accent"
        size="lg"
        animation={2}
      />

      <div className="container px-4 relative">
        <SR direction="up" className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <span className="text-sm font-semibold text-primary">✨ خدماتنا</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            خدماتنا لأهل الوادي
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            نربط أهل الوادي بالخدمات الأساسية ونفتح أبواب الفرص للجميع
          </p>
        </SR>

        <SR stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {missions.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.id} to={m.href}>
                <Card className="group h-full border-border/50 hover:border-primary/40 hover-lift overflow-hidden hover:shadow-xl rounded-2xl transition-all duration-400">
                  <CardContent className="p-8 flex flex-col h-full">
                    <div
                      className={`inline-flex items-center justify-center rounded-2xl bg-gradient-to-br ${m.gradient} mb-6 shadow-lg icon-hover`}
                      style={{ width: 72, height: 72 }}
                    >
                      <Icon className="h-9 w-9 text-primary-foreground" strokeWidth={1.8} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                      {m.title}
                    </h3>
                    <p className="text-muted-foreground flex-1 mb-6 leading-relaxed">
                      {m.description}
                    </p>
                    <div className="flex items-center text-primary font-semibold">
                      استكشف
                      <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-2 transition-transform duration-300" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </SR>
      </div>
    </section>
  );
}
