import { useMemo } from 'react';
import { BadgeAlert } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';

const TICKER_DURATION_MS = 40_000;
const NOTICE_REPEATS = [0, 1, 2, 3];

const MESSAGES = {
  ar: 'وضع تجريبي - جميع البيانات على هذه المنصة للعرض التوضيحي فقط ولا تمثل معلومات حقيقية',
  en: 'DEMO MODE - All data on this platform is simulated for demonstration only',
};

export function DemoBanner() {
  const { language } = useAuth();
  const text = MESSAGES[language];
  const tickerDelay = useMemo(() => `-${(Date.now() % TICKER_DURATION_MS) / 1000}s`, []);

  return (
    <div
      className="h-6 overflow-hidden border-b border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-300"
      role="status"
      aria-label={language === 'ar' ? 'إشعار وضع تجريبي' : 'Demo mode notice'}
      dir="ltr"
    >
      <div
        className={`${language === 'ar' ? 'animate-ticker-rtl' : 'animate-ticker-ltr'} flex h-full w-max items-center whitespace-nowrap text-[10px] font-semibold tracking-wide sm:text-xs`}
        style={{ animationDelay: tickerDelay }}
      >
        {NOTICE_REPEATS.map((repeat) => (
          <span
            key={repeat}
            aria-hidden={repeat === 0 ? undefined : 'true'}
            className="flex h-full items-center gap-2 px-6"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            <BadgeAlert
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 animate-pulse motion-reduce:animate-none"
              data-testid="demo-banner-icon"
            />
            <span>{text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
