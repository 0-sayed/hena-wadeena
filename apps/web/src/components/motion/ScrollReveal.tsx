import { useEffect, useRef, type ReactNode, type HTMLAttributes } from 'react';

interface ScrollRevealProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade';
  delay?: number;
  duration?: number;
  stagger?: boolean;
  threshold?: number;
  className?: string;
  once?: boolean;
}

export function SR({
  children,
  direction = 'up',
  delay = 0,
  duration,
  stagger,
  threshold = 0.08,
  className = '',
  once = true,
  ...rest
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          if (once) io.unobserve(el);
        } else if (!once) {
          el.classList.remove('visible');
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once]);

  const cls = stagger
    ? 'stagger'
    : direction === 'left'
      ? 'reveal-left'
      : direction === 'right'
        ? 'reveal-right'
        : direction === 'down'
          ? 'reveal-down'
          : direction === 'scale'
            ? 'reveal-scale'
            : direction === 'fade'
              ? 'reveal-fade'
              : 'reveal';

  const style: React.CSSProperties = {};
  if (delay) style.transitionDelay = `${delay}ms`;
  if (duration) style.transitionDuration = `${duration}ms`;

  return (
    <div ref={ref} className={`${cls} ${className}`} style={style} {...rest}>
      {children}
    </div>
  );
}

/** Floating decorative blob */
export function FloatingBlob({
  className = '',
  color = 'primary',
  size = 'md',
  animation = 1,
}: {
  className?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animation?: 1 | 2 | 3;
}) {
  const sizes = { sm: 'w-32 h-32', md: 'w-64 h-64', lg: 'w-96 h-96', xl: 'w-[32rem] h-[32rem]' };
  return (
    <div
      className={`absolute rounded-full bg-${color}/5 blur-3xl pointer-events-none animate-meshFloat${animation === 1 ? '' : animation} ${sizes[size]} ${className}`}
    />
  );
}
