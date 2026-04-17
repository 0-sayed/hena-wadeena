import '@lottiefiles/dotlottie-wc';
import { Link, useLocation } from 'react-router';

import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy } from '@/lib/localization';

export function IncidentFab() {
  const { pathname } = useLocation();
  const { language } = useAuth();

  if (pathname.startsWith('/admin')) return null;

  return (
    <Link
      to="/incidents/report"
      aria-label={pickLocalizedCopy(language, {
        ar: 'الإبلاغ عن حادثة بيئية',
        en: 'Report an environmental incident',
      })}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] end-3 z-50 block h-20 w-20 overflow-visible transition-all hover:scale-105 md:bottom-3 md:h-24 md:w-24"
    >
      <dotlottie-wc
        autoplay
        loop
        speed={0.4}
        src="/animations/warning.lottie"
        style={{ display: 'block', height: '100%', pointerEvents: 'none', width: '100%' }}
      />
    </Link>
  );
}
