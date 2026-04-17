import { useState } from 'react';
import { Palette } from 'lucide-react';

import type { CraftType } from '@hena-wadeena/types';

import { Layout } from '@/components/layout/Layout';
import { ArtisanCard } from '@/components/artisans';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/motion/Skeleton';
import { useArtisans } from '@/hooks/use-artisans';
import { areaOptions, craftTypeOptions } from '@/lib/artisan-labels';

const ArtisansPage = () => {
  const [area, setArea] = useState('all');
  const [craftType, setCraftType] = useState('all');

  const { data, isLoading, isError } = useArtisans({
    area: area === 'all' ? undefined : area,
    craftType: craftType === 'all' ? undefined : (craftType as CraftType),
  });

  return (
    <Layout title="حرفيات الوادي الجديد">
      <section className="bg-gradient-to-bl from-primary/10 via-accent/5 to-background py-12 md:py-16">
        <div className="container flex items-center gap-8 px-4">
          {/* Text block — right side in RTL */}
          <div className="flex-1">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              <Palette className="h-4 w-4" />
              حرفيات
            </div>
            <h1 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              صنع بأيدي سيدات الوادي
            </h1>
            <p className="text-lg text-muted-foreground">
              كل منتج قصة امرأة — حرفيات الوادي الجديد يُحوّلن موهبتهن إلى مصدر رزق ويُبقين تراث
              الواحات حياً للأجيال القادمة
            </p>
            <p className="mt-3 text-sm text-muted-foreground/70">
              تمكين المرأة المصرية ليس شأناً خاصاً — بل ضرورة وطنية.{' '}
              <a
                href="https://ncw.gov.eg/Page/761/%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D8%B1%D8%A7%D8%AA%D9%8A%D8%AC%D9%8A%D8%A9-%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A%D8%A9-%D9%84%D8%AA%D9%85%D9%83%D9%8A%D9%86-%D8%A7%D9%84%D9%85%D8%B1%D8%A3%D8%A9-%D8%A7%D9%84%D9%85%D8%B5%D8%B1%D9%8A%D8%A9-2030/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-primary transition-colors"
              >
                الاستراتيجية الوطنية لتمكين المرأة 2030
              </a>
            </p>
          </div>
          {/* NCW Logo — far left in RTL (last in DOM = leftmost) */}
          <a
            href="https://ncw.gov.eg"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden shrink-0 opacity-85 transition-opacity hover:opacity-100 md:block"
          >
            <img src="/images/ncw-logo.webp" alt="المجلس القومي للمرأة" className="h-32 w-auto" />
          </a>
        </div>
      </section>

      <section className="py-10">
        <div className="container space-y-6 px-4">
          <div className="flex flex-wrap gap-4">
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="اختر المنطقة" />
              </SelectTrigger>
              <SelectContent>
                {areaOptions.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={craftType} onValueChange={setCraftType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="اختر نوع الحرفة" />
              </SelectTrigger>
              <SelectContent>
                {craftTypeOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(area !== 'all' || craftType !== 'all') && (
              <Button
                variant="ghost"
                onClick={() => {
                  setArea('all');
                  setCraftType('all');
                }}
              >
                إزالة الفلاتر
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} h="h-72" className="rounded-2xl" />
              ))}
            </div>
          ) : isError ? (
            <Card className="rounded-2xl">
              <CardContent className="space-y-4 p-10 text-center">
                <p className="text-muted-foreground">تعذر تحميل الحرفيات حالياً.</p>
              </CardContent>
            </Card>
          ) : data.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="space-y-3 p-10 text-center">
                <Palette className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">لا توجد حرفيات مطابقة للبحث</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.map((artisan) => (
                <ArtisanCard key={artisan.id} artisan={artisan} />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default ArtisansPage;
