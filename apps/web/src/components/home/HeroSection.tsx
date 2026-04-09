import { useEffect, useState, useRef, useCallback } from 'react';
import { Sparkles, Mountain, ShoppingBag, Truck, TrendingUp, Users, Compass } from 'lucide-react';
import { Link } from 'react-router';

import heroImage from '@/assets/hero-desert-oasis.jpg';
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy } from '@/lib/localization';

const navCards = [
  {
    icon: Mountain,
    label: { ar: 'السياحة', en: 'Tourism' },
    desc: { ar: 'اكتشف المعالم', en: 'Discover places' },
    href: '/tourism',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: ShoppingBag,
    label: { ar: 'البورصة', en: 'Marketplace' },
    desc: { ar: 'أسعار اليوم', en: "Today's prices" },
    href: '/marketplace',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: Truck,
    label: { ar: 'المواصلات', en: 'Transport' },
    desc: { ar: 'خطوط وحجز', en: 'Routes & booking' },
    href: '/logistics',
    color: 'from-sky-500 to-blue-600',
  },
  {
    icon: TrendingUp,
    label: { ar: 'الاستثمار', en: 'Investment' },
    desc: { ar: 'فرص واعدة', en: 'Promising opportunities' },
    href: '/investment',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: Users,
    label: { ar: 'المرشدين', en: 'Guides' },
    desc: { ar: 'دليلك المحلي', en: 'Your local guide' },
    href: '/guides',
    color: 'from-pink-500 to-rose-600',
  },
  {
    icon: Compass,
    label: { ar: 'المعالم', en: 'Attractions' },
    desc: { ar: 'أماكن مميزة', en: 'Featured places' },
    href: '/tourism/attractions',
    color: 'from-cyan-500 to-indigo-600',
  },
] as const;

function MobileQuickLinks({ language }: { language: 'ar' | 'en' }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 md:hidden">
      <div className="flex snap-x snap-mandatory gap-3 pb-1">
        {navCards.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`group min-w-[10.5rem] snap-start rounded-3xl border border-white/15 bg-gradient-to-br ${item.color} p-4 text-start shadow-xl shadow-foreground/10 backdrop-blur-sm`}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
                <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
              </div>
              <div className="text-sm font-bold text-white">
                {pickLocalizedCopy(language, item.label)}
              </div>
              <div className="mt-1 text-xs text-white/75">
                {pickLocalizedCopy(language, item.desc)}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CardDeck({ language }: { language: 'ar' | 'en' }) {
  const deckRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isTouchFanned, setIsTouchFanned] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!deckRef.current) return;
    const rect = deckRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isTouchFanned) {
        setIsTouchFanned(true);
        setMousePos({ x: 0, y: 0 });
        return;
      }
      if (!deckRef.current) return;
      const touch = e.touches[0];
      const rect = deckRef.current.getBoundingClientRect();
      const x = (touch.clientX - rect.left) / rect.width - 0.5;
      setMousePos({ x, y: 0 });
    },
    [isTouchFanned],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!deckRef.current || !isTouchFanned) return;
      const touch = e.touches[0];
      const rect = deckRef.current.getBoundingClientRect();
      const x = (touch.clientX - rect.left) / rect.width - 0.5;
      setMousePos({ x, y: 0 });

      const cardWidth = 160;
      const total = navCards.length;
      const mid = (total - 1) / 2;
      for (let i = total - 1; i >= 0; i -= 1) {
        const offset = i - mid;
        const cardCenterX = rect.left + rect.width / 2 + offset * 55 + x * 15;
        if (Math.abs(touch.clientX - cardCenterX) < cardWidth / 2) {
          setHoveredIndex(i);
          break;
        }
      }
    },
    [isTouchFanned],
  );

  const fanned = isHovering || isTouchFanned;

  const getCardStyle = (index: number, total: number) => {
    const mid = (total - 1) / 2;
    const offset = index - mid;

    if (fanned) {
      const fanAngle = offset * 8 + mousePos.x * 5;
      const fanX = offset * 55 + mousePos.x * 15;
      const fanY = Math.abs(offset) * 12 - (hoveredIndex === index ? 30 : 0);
      const scale = hoveredIndex === index ? 1.1 : 1;
      const z = hoveredIndex === index ? 50 : total - Math.abs(offset);

      return {
        transform: `translateX(${fanX}px) translateY(${fanY}px) rotate(${fanAngle}deg) scale(${scale})`,
        zIndex: z,
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      };
    }

    const stackY = -index * 3;
    const stackX = index * 2;
    const stackRotate = (index - mid) * 1.5;
    return {
      transform: `translateX(${stackX}px) translateY(${stackY}px) rotate(${stackRotate}deg) scale(${1 - index * 0.015})`,
      zIndex: total - index,
      transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
    };
  };

  useEffect(() => {
    if (!isTouchFanned) return undefined;
    const handler = (e: TouchEvent) => {
      if (deckRef.current && !deckRef.current.contains(e.target as Node)) {
        setIsTouchFanned(false);
        setHoveredIndex(null);
      }
    };
    document.addEventListener('touchstart', handler);
    return () => document.removeEventListener('touchstart', handler);
  }, [isTouchFanned]);

  return (
    <div
      ref={deckRef}
      className="relative mx-auto flex h-[220px] w-full max-w-[380px] touch-manipulation items-center justify-center sm:mx-0"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setHoveredIndex(null);
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {navCards.map((item, index) => {
        const Icon = item.icon;
        const style = getCardStyle(index, navCards.length);
        return (
          <Link
            key={item.href}
            to={item.href}
            className="absolute h-[170px] w-[140px] cursor-pointer sm:h-[190px] sm:w-[160px]"
            style={style}
            onMouseEnter={() => setHoveredIndex(index)}
            onTouchEnd={(e) => {
              if (!isTouchFanned) {
                e.preventDefault();
                return;
              }
              setHoveredIndex(index);
            }}
          >
            <div
              className={`h-full w-full rounded-2xl bg-gradient-to-br ${item.color} border border-white/20 p-4 shadow-2xl backdrop-blur-sm transition-shadow duration-300 sm:p-5`}
            >
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm sm:h-14 sm:w-14">
                  <Icon className="h-6 w-6 text-white sm:h-7 sm:w-7" strokeWidth={1.8} />
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-white sm:text-base">
                    {pickLocalizedCopy(language, item.label)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/70 sm:text-xs">
                    {pickLocalizedCopy(language, item.desc)}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function Counter({ target, label, delay }: { target: number; label: string; delay: number }) {
  const [val, setVal] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!show) return;
    const duration = 2000;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setVal(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [show, target]);

  return (
    <div
      className={`transition-all duration-700 ${show ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}
    >
      <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center shadow-lg shadow-foreground/5 backdrop-blur-sm sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-start sm:shadow-none">
        <div className="tabular-nums text-2xl font-bold text-card sm:text-4xl md:text-5xl">
          +{val}
        </div>
        <div className="mt-1 text-[11px] text-card/70 sm:text-sm">{label}</div>
      </div>
    </div>
  );
}

export function HeroSection() {
  const [scrollY, setScrollY] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const { language } = useAuth();
  const copy =
    language === 'en'
      ? {
          brandName: 'Hena Wadeena',
          portalBadge: 'Official digital portal',
          tagline: 'Explore. Connect. Invest.',
          description:
            'Your all-in-one gateway to New Valley, from transport and daily prices to investment opportunities and tourism.',
          helper: 'Tap or hover over the cards to explore each section',
          transportLines: 'transport routes',
          localProducts: 'local products',
          investmentOpportunities: 'investment opportunities',
          heroImageAlt: 'New Valley',
        }
      : {
          brandName: 'هُنَا وَادِينَا',
          portalBadge: 'البوابة الرقمية الرسمية',
          tagline: 'اكتشف. تواصل. استثمر.',
          description:
            'بوابتك الشاملة للوادي الجديد — من المواصلات والأسعار إلى فرص الاستثمار والسياحة. كل ما تحتاجه في مكان واحد.',
          helper: 'المس أو مرّر على الكروت لاستكشاف الأقسام',
          transportLines: 'خط مواصلات',
          localProducts: 'منتج محلي',
          investmentOpportunities: 'فرصة استثمارية',
          heroImageAlt: 'الوادي الجديد',
        };

  useEffect(() => {
    setLoaded(true);
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const parallaxY = scrollY * 0.3;
  const heroOpacity = Math.max(0, 1 - scrollY / 700);

  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden sm:min-h-[95vh]">
      <div
        className="absolute inset-0 will-change-transform transition-transform duration-75"
        style={{
          transform: `translateY(${parallaxY}px) scale(${loaded ? 1 : 1.1})`,
          transition: loaded
            ? 'transform 0.075s linear'
            : 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <img
          src={heroImage}
          alt={copy.heroImageAlt}
          className="h-[120%] w-full object-cover sm:h-[130%]"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-foreground/85 via-foreground/65 to-foreground/40" />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[
          'top-[18%] end-[12%] h-2 w-2 bg-accent/30 particle-1',
          'top-[38%] end-[28%] h-3 w-3 bg-primary/20 particle-2',
          'top-[58%] end-[8%] h-1.5 w-1.5 bg-card/25 particle-3',
          'top-[28%] end-[42%] h-2.5 w-2.5 bg-accent/20 particle-4',
          'top-[68%] end-[55%] h-2 w-2 bg-primary/15 particle-1',
          'top-[12%] end-[68%] h-3 w-3 bg-card/15 particle-3',
          'top-[78%] end-[35%] h-1.5 w-1.5 bg-accent/25 particle-2',
          'top-[8%] end-[50%] h-2 w-2 bg-card/20 particle-4',
        ].map((cls, index) => (
          <div key={index} className={`particle absolute rounded-full ${cls}`} />
        ))}
      </div>

      <div className="container relative z-10 px-4 py-14 sm:py-20" style={{ opacity: heroOpacity }}>
        <div className="max-w-2xl">
          <div className="hero-reveal hero-d1 mb-8 inline-flex items-center gap-2 rounded-full glass px-5 py-2.5">
            <Sparkles className="h-5 w-5 animate-pulse text-accent" />
            <span className="text-sm font-semibold text-card">{copy.portalBadge}</span>
          </div>

          <h1 className="hero-reveal hero-d2 mb-5 text-4xl font-bold leading-tight text-card sm:mb-6 sm:text-5xl md:text-6xl lg:text-7xl">
            {copy.brandName}
            <span className="mt-3 block text-2xl text-accent sm:text-3xl md:text-4xl lg:text-5xl">
              {copy.tagline}
            </span>
          </h1>

          <p className="hero-reveal hero-d3 mb-8 max-w-xl text-base leading-relaxed text-card/90 sm:mb-10 sm:text-lg md:text-xl">
            {copy.description}
          </p>

          <div className="hero-reveal hero-d4 mb-5 md:hidden">
            <MobileQuickLinks language={language} />
            <p className="mt-3 text-center text-xs text-card/60">{copy.helper}</p>
          </div>

          <div className="hero-reveal hero-d4 mb-12 hidden md:block">
            <CardDeck language={language} />
            <p className="mt-4 text-center text-xs text-card/50 sm:text-end">{copy.helper} ✨</p>
          </div>

          <div className="hero-reveal hero-d5 grid max-w-xl grid-cols-3 gap-3 sm:flex sm:flex-wrap sm:gap-12">
            <Counter target={50} label={copy.transportLines} delay={900} />
            <Counter target={200} label={copy.localProducts} delay={1200} />
            <Counter target={30} label={copy.investmentOpportunities} delay={1500} />
          </div>
        </div>
      </div>

      <div
        className="scroll-indicator absolute bottom-8 start-1/2 hidden -translate-x-1/2 sm:block"
        style={{ opacity: heroOpacity }}
      >
        <div className="flex h-11 w-7 items-start justify-center rounded-full border-2 border-card/30 p-1.5">
          <div className="h-2.5 w-1.5 rounded-full bg-card/50" />
        </div>
      </div>
    </section>
  );
}
