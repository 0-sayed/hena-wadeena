import { useAuth } from '@/hooks/use-auth';

export function VisionStrip() {
  const { language } = useAuth();
  const copy =
    language === 'en'
      ? {
          label: 'Aligned with Egypt Vision 2030',
          logoAlt: 'Egypt Vision 2030',
        }
      : {
          label: 'بالتوافق مع رؤية مصر 2030',
          logoAlt: 'رؤية مصر 2030',
        };

  return (
    <section className="border-y border-border bg-background/80">
      <div className="container flex items-center justify-center gap-5 px-4 py-5 text-center sm:gap-6">
        <p className="text-sm font-semibold text-muted-foreground sm:text-base">{copy.label}</p>
        <img
          src="/images/vision-2030.svg"
          alt={copy.logoAlt}
          className="h-20 w-20 shrink-0 object-contain sm:h-24 sm:w-24"
          loading="lazy"
        />
      </div>
    </section>
  );
}
