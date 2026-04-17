import { Link } from 'react-router';
import { AlertTriangle, ArrowLeft, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SR } from '@/components/motion/ScrollReveal';
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy } from '@/lib/localization';

export function ProtectDesertStrip() {
  const { language } = useAuth();

  const copy = {
    badge: pickLocalizedCopy(language, { ar: 'حماية البيئة', en: 'Environmental Protection' }),
    title: pickLocalizedCopy(language, {
      ar: 'ساعد في حماية محافظة الوادي الجديد',
      en: 'Help protect New Valley Governorate',
    }),
    description: pickLocalizedCopy(language, {
      ar: 'رصدت نفايات أو بقايا حرائق أو تخريبًا في الصحراء؟ أبلغ الآن — كل بلاغ يصل فورًا إلى الجهات المختصة.',
      en: 'Spotted litter, fire remains, or vandalism in the desert? Report it now — every incident goes straight to the authorities.',
    }),
    viewIncidents: pickLocalizedCopy(language, { ar: 'عرض الحوادث', en: 'View incidents' }),
    reportIncident: pickLocalizedCopy(language, {
      ar: 'الإبلاغ عن حادثة',
      en: 'Report an incident',
    }),
  };

  return (
    <section
      className="relative overflow-hidden border-y border-amber-200/40 py-14 sm:py-16"
      style={{
        backgroundImage: 'url(/images/protect-desert-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay for text legibility */}
      <div className="pointer-events-none absolute inset-0 bg-stone-950/70" />
      {/* Colour tint blobs */}
      <div className="pointer-events-none absolute start-0 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 end-0 h-72 w-72 translate-x-1/3 translate-y-1/3 rounded-full bg-green-600/10 blur-3xl" />

      <div className="container relative px-4">
        <SR direction="up" className="flex flex-col items-center gap-6 text-center sm:gap-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">{copy.badge}</span>
          </div>

          {/* Headline */}
          <h2 className="max-w-2xl text-3xl font-bold text-white sm:text-4xl">{copy.title}</h2>

          {/* Description */}
          <p className="max-w-xl text-base leading-relaxed text-stone-300 sm:text-lg">
            {copy.description}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/incidents">
              <Button
                variant="outline"
                className="gap-2 border-amber-400/40 bg-transparent text-amber-100 hover:bg-amber-400/10 hover:text-white"
              >
                <Eye className="h-4 w-4" />
                {copy.viewIncidents}
              </Button>
            </Link>
            <Link to="/incidents/report">
              <Button className="gap-2 bg-amber-500 text-white hover:bg-amber-400">
                {copy.reportIncident}
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </SR>
      </div>
    </section>
  );
}
