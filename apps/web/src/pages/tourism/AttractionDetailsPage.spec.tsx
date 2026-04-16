import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from 'i18next';

import AttractionDetailsPage from './AttractionDetailsPage';

const mockNavigate = vi.fn();
const mockUseAttraction = vi.fn();
const mockUseNearbyAttractions = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
    useNavigate: () => mockNavigate,
    useParams: () => ({ slug: 'temple-of-hibis' }),
  };
});

vi.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => (
    <svg aria-hidden="true" className={className} />
  );

  return {
    AlertCircle: Icon,
    ArrowRight: Icon,
    Calendar: Icon,
    Clock: Icon,
    MapPin: Icon,
    Star: Icon,
    Sun: Icon,
    Users: Icon,
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/maps/InteractiveMap', () => ({
  InteractiveMap: ({ popupTrigger }: { popupTrigger?: 'click' | 'hover' | 'both' }) => (
    <div data-testid="interactive-map" data-popup-trigger={popupTrigger ?? 'click'} />
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    language: 'ar',
  }),
}));

vi.mock('@/hooks/use-attractions', () => ({
  useAttraction: (slug: string) => mockUseAttraction(slug),
  useNearbyAttractions: (slug: string) => mockUseNearbyAttractions(slug),
}));

describe('AttractionDetailsPage', () => {
  beforeEach(() => {
    void i18n.changeLanguage('ar');

    mockUseAttraction.mockReturnValue({
      data: {
        id: 'attr-1',
        slug: 'temple-of-hibis',
        nameAr: 'معبد هيبس',
        nameEn: 'Temple of Hibis',
        type: 'historical',
        area: 'kharga',
        descriptionAr: 'وصف المعلم',
        descriptionEn: null,
        historyAr: null,
        bestSeason: null,
        bestTimeOfDay: null,
        entryFee: null,
        openingHours: null,
        durationHours: 2,
        difficulty: null,
        tips: [],
        nearbySlugs: [],
        location: {
          x: 30.547,
          y: 25.452,
        },
        images: [],
        thumbnail: null,
        isActive: true,
        isFeatured: true,
        ratingAvg: 4.8,
        reviewCount: 12,
        createdAt: '',
        updatedAt: '',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseNearbyAttractions.mockReturnValue({ data: [] });
  });

  afterEach(() => {
    void i18n.changeLanguage('en');
  });

  it('pins the back button to the inline start side and uses Button gap for icon spacing', () => {
    render(<AttractionDetailsPage />);

    const backButton = screen.getByRole('button', { name: 'رجوع' });
    const icon = backButton.querySelector('svg');

    expect(backButton).toHaveClass('start-4');
    expect(backButton).not.toHaveClass('end-4');
    expect(icon?.className.baseVal).not.toMatch(/\b(?:ms|me|ml|mr)-\d/);
    expect(icon?.className.baseVal).toContain('ltr:rotate-180');
  });

  it('shows the map section without rendering the raw coordinate row', () => {
    render(<AttractionDetailsPage />);

    expect(screen.getByText('الموقع')).toBeInTheDocument();
    expect(screen.getByTestId('interactive-map')).toBeInTheDocument();
    expect(screen.getByTestId('interactive-map')).toHaveAttribute('data-popup-trigger', 'click');
    expect(
      screen.queryByText((content) => content.includes('25.4520') && content.includes('30.5470')),
    ).not.toBeInTheDocument();
  });
});
