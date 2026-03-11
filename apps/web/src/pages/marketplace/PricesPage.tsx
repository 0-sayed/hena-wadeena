import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router';

const cities = [
  { id: 'all', name: 'جميع المدن' },
  { id: 'kharga', name: 'الخارجة' },
  { id: 'dakhla', name: 'الداخلة' },
  { id: 'farafra', name: 'الفرافرة' },
  { id: 'paris', name: 'باريس' },
];

const categories = ['الكل', 'حبوب', 'فواكه', 'خضروات', 'أعلاف', 'بقوليات'];

const priceData = [
  { id: 1, name: 'قمح', price: 1250, change: 2.5, unit: 'طن', category: 'حبوب', city: 'الخارجة' },
  {
    id: 2,
    name: 'تمر سيوي',
    price: 45,
    change: -1.2,
    unit: 'كجم',
    category: 'فواكه',
    city: 'الداخلة',
  },
  { id: 3, name: 'زيتون', price: 28, change: 0, unit: 'كجم', category: 'فواكه', city: 'الخارجة' },
  {
    id: 4,
    name: 'برسيم',
    price: 800,
    change: 3.1,
    unit: 'طن',
    category: 'أعلاف',
    city: 'الفرافرة',
  },
  { id: 5, name: 'أرز', price: 22, change: -0.5, unit: 'كجم', category: 'حبوب', city: 'الخارجة' },
  {
    id: 6,
    name: 'فول سوداني',
    price: 55,
    change: 1.8,
    unit: 'كجم',
    category: 'بقوليات',
    city: 'الداخلة',
  },
  { id: 7, name: 'عنب', price: 35, change: 4.2, unit: 'كجم', category: 'فواكه', city: 'الخارجة' },
  { id: 8, name: 'طماطم', price: 12, change: -2.1, unit: 'كجم', category: 'خضروات', city: 'باريس' },
  {
    id: 9,
    name: 'بطاطس',
    price: 8,
    change: 0.5,
    unit: 'كجم',
    category: 'خضروات',
    city: 'الفرافرة',
  },
  { id: 10, name: 'بصل', price: 6, change: -1.0, unit: 'كجم', category: 'خضروات', city: 'الداخلة' },
  {
    id: 11,
    name: 'تمر مجهول',
    price: 120,
    change: 5.5,
    unit: 'كجم',
    category: 'فواكه',
    city: 'الخارجة',
  },
  { id: 12, name: 'ذرة', price: 950, change: 1.2, unit: 'طن', category: 'حبوب', city: 'الداخلة' },
];

const topGainers = priceData
  .filter((p) => p.change > 0)
  .sort((a, b) => b.change - a.change)
  .slice(0, 5);
const topLosers = priceData
  .filter((p) => p.change < 0)
  .sort((a, b) => a.change - b.change)
  .slice(0, 5);

const PricesPage = () => {
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = priceData.filter((p) => {
    const matchesCity =
      selectedCity === 'all' || p.city === cities.find((c) => c.id === selectedCity)?.name;
    const matchesCategory = selectedCategory === 'الكل' || p.category === selectedCategory;
    const matchesSearch = p.name.includes(searchQuery) || p.category.includes(searchQuery);
    return matchesCity && matchesCategory && matchesSearch;
  });

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-to-bl from-accent/20 via-background to-background py-12 md:py-16">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate('/marketplace')} className="mb-4">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة للبورصة
          </Button>
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              لوحة الأسعار المباشرة
            </h1>
            <p className="text-lg text-muted-foreground">
              تابع أسعار المنتجات الزراعية في الوادي الجديد لحظة بلحظة
            </p>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="container px-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{priceData.length}</p>
                <p className="text-sm text-muted-foreground">منتج متاح</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{topGainers.length}</p>
                <p className="text-sm text-muted-foreground">منتج صاعد</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <TrendingDown className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-2xl font-bold">{topLosers.length}</p>
                <p className="text-sm text-muted-foreground">منتج هابط</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <Minus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {priceData.filter((p) => p.change === 0).length}
                </p>
                <p className="text-sm text-muted-foreground">منتج مستقر</p>
              </CardContent>
            </Card>
          </div>

          {/* Gainers & Losers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="border-border/50 border-t-4 border-t-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  الأكثر ارتفاعاً
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topGainers.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-sm text-muted-foreground mr-2">({item.city})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">
                          {item.price} جنيه/{item.unit}
                        </span>
                        <Badge className="bg-primary/10 text-primary">+{item.change}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 border-t-4 border-t-destructive">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  الأكثر انخفاضاً
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topLosers.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-sm text-muted-foreground mr-2">({item.city})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">
                          {item.price} جنيه/{item.unit}
                        </span>
                        <Badge className="bg-destructive/10 text-destructive">{item.change}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="اختر المدينة" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>

            <div className="relative flex-1 md:max-w-xs mr-auto">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* Price Table */}
          <Card className="border-border/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">
                        المنتج
                      </th>
                      <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">
                        التصنيف
                      </th>
                      <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">
                        المدينة
                      </th>
                      <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">
                        السعر
                      </th>
                      <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">
                        التغير
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-muted/30 ${index !== filteredProducts.length - 1 ? 'border-b border-border/50' : ''}`}
                      >
                        <td className="py-4 px-6">
                          <span className="font-medium text-foreground">{item.name}</span>
                        </td>
                        <td className="py-4 px-6">
                          <Badge variant="outline">{item.category}</Badge>
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">{item.city}</td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-foreground">{item.price}</span>
                          <span className="text-sm text-muted-foreground mr-1">
                            جنيه/{item.unit}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                              item.change > 0
                                ? 'bg-primary/10 text-primary'
                                : item.change < 0
                                  ? 'bg-destructive/10 text-destructive'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {item.change > 0 ? (
                              <TrendingUp className="h-3.5 w-3.5" />
                            ) : item.change < 0 ? (
                              <TrendingDown className="h-3.5 w-3.5" />
                            ) : (
                              <Minus className="h-3.5 w-3.5" />
                            )}
                            {item.change > 0 ? '+' : ''}
                            {item.change}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-4">
            آخر تحديث: اليوم الساعة 10:30 صباحاً
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default PricesPage;
