import { ReactNode, useEffect, useState } from 'react';

interface PageHeroProps {
  image: string;
  alt: string;
  children: ReactNode;
}

export function PageHero({ image, alt, children }: PageHeroProps) {
  const [loaded, setLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);

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

  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-end overflow-hidden sm:min-h-[36rem] md:min-h-[55vh]">
      {/* Parallax Background */}
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translateY(${parallaxY}px) scale(${loaded ? 1 : 1.08})`,
          transition: loaded
            ? 'transform 0.075s linear'
            : 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <img src={image} alt={alt} className="h-[120%] w-full object-cover sm:h-[130%]" />
        <div className="absolute inset-0 bg-gradient-to-l from-foreground/80 via-foreground/60 to-foreground/35" />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          'top-[20%] right-[15%] h-2 w-2 bg-accent/25 particle-1',
          'top-[40%] right-[30%] h-3 w-3 bg-primary/15 particle-2',
          'top-[60%] right-[10%] h-1.5 w-1.5 bg-card/20 particle-3',
          'top-[30%] right-[50%] h-2.5 w-2.5 bg-accent/15 particle-4',
        ].map((cls, i) => (
          <div key={i} className={`particle absolute rounded-full ${cls}`} />
        ))}
      </div>

      {/* Content */}
      <div className="container relative z-10 px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">{children}</div>
      </div>
    </section>
  );
}
