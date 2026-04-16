import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import i18n from 'i18next';

import Index from '../Index';

const layoutMock = vi.hoisted(() => ({
  titles: [] as Array<string | undefined>,
}));

vi.mock('react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock('lucide-react', () => {
  const Icon = () => <svg aria-hidden="true" />;
  return {
    Compass: Icon,
    Droplets: Icon,
    FileCheck: Icon,
    GraduationCap: Icon,
    Home: Icon,
    MapPinned: Icon,
    Shield: Icon,
    Store: Icon,
    TrendingUp: Icon,
    Truck: Icon,
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children, title }: { children: ReactNode; title?: string }) => {
    layoutMock.titles.push(title);
    return <div>{children}</div>;
  },
}));

vi.mock('@/components/home/HeroSection', () => ({
  HeroSection: () => <div>hero</div>,
}));

vi.mock('@/components/home/QuickAccess', () => ({
  QuickAccess: () => <div>quick-access</div>,
}));

vi.mock('@/components/home/MissionCards', () => ({
  MissionCards: () => <div>mission-cards</div>,
}));

vi.mock('@/components/home/FeaturedSection', () => ({
  FeaturedSection: () => <div>featured-section</div>,
}));

vi.mock('@/components/home/PriceSnapshot', () => ({
  PriceSnapshot: () => <div>price-snapshot</div>,
}));

vi.mock('@/components/home/VisionStrip', () => ({
  VisionStrip: () => <div>vision-strip</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: null }),
}));

describe('Index page', () => {
  beforeEach(() => {
    layoutMock.titles = [];
    void i18n.changeLanguage('ar');
  });

  afterEach(() => {
    void i18n.changeLanguage('en');
  });

  it('passes the localized home title to Layout', () => {
    render(<Index />);

    expect(layoutMock.titles).toContain('الرئيسية');
  });
});
