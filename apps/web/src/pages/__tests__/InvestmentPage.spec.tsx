import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import InvestmentPage from '../InvestmentPage';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn();
const mockGetOpportunities = vi.fn();
const mockGetStartups = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('lucide-react', () => {
  const Icon = () => <svg aria-hidden="true" />;

  return {
    ArrowLeft: Icon,
    Building2: Icon,
    DollarSign: Icon,
    MapPin: Icon,
    Search: Icon,
    Send: Icon,
    TrendingUp: Icon,
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageHero', () => ({
  PageHero: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type,
  }: {
    children: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    className,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
    className?: string;
  }) => <input className={className} value={value} onChange={onChange} placeholder={placeholder} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/services/api', () => ({
  investmentAPI: {
    getOpportunities: () => mockGetOpportunities(),
    getBusinesses: () => mockGetStartups(),
  },
}));

vi.mock('@/assets/hero-investment.webp', () => ({
  default: 'hero-investment.webp',
}));

describe('InvestmentPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseAuth.mockReset();
    mockGetOpportunities.mockReset();
    mockGetStartups.mockReset();

    mockUseAuth.mockReturnValue({ language: 'ar', user: null });

    mockGetOpportunities.mockResolvedValue({
      data: [
        {
          id: 'opp-1',
          titleAr: 'فرصة زراعية في الداخلة',
          titleEn: 'Agriculture Opportunity',
          description: 'استثمار في التمور والزراعة',
          sector: 'agriculture',
          area: 'dakhla',
          minInvestment: 100000,
          maxInvestment: 200000,
          currency: 'EGP',
          expectedReturnPct: 12,
          paybackPeriodYears: 4,
          incentives: ['إعفاء ضريبي'],
          status: 'active',
          images: [],
        },
      ],
    });
    mockGetStartups.mockResolvedValue({
      data: [
        {
          id: 'startup-1',
          nameAr: 'شركة تقنية ناشئة',
          nameEn: 'Tech Startup',
          category: 'technology',
          descriptionAr: 'منصة رقمية للخدمات',
          district: 'kharga',
          location: null,
          phone: null,
          logoUrl: null,
          status: 'active',
        },
      ],
    });
  });

  it('filters investment content locally instead of navigating to the global search page', async () => {
    render(<InvestmentPage />);

    await waitFor(() => {
      expect(screen.getByText('فرصة زراعية في الداخلة')).toBeInTheDocument();
      expect(screen.getByText('شركة تقنية ناشئة')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('ابحث عن فرص استثمارية...'), {
      target: { value: 'زرا' },
    });

    expect(screen.getByText('فرصة زراعية في الداخلة')).toBeInTheDocument();
    expect(screen.queryByText('شركة تقنية ناشئة')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'بحث' }));

    expect(mockNavigate).not.toHaveBeenCalledWith('/search?q=%D8%B2%D8%B1%D8%A7');
  });

  it('matches normalized Arabic district text for startup search', async () => {
    render(<InvestmentPage />);

    await waitFor(() => {
      expect(screen.getByText('شركة تقنية ناشئة')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('ابحث عن فرص استثمارية...'), {
      target: { value: 'الخارجه' },
    });

    expect(screen.getByText('شركة تقنية ناشئة')).toBeInTheDocument();
    expect(screen.queryByText('فرصة زراعية في الداخلة')).not.toBeInTheDocument();
  });

  it('uses the roomy hero search field sizing', async () => {
    render(<InvestmentPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('ابحث عن فرص استثمارية...')).toHaveClass(
        'h-16',
        'text-lg',
        'md:h-16',
        'md:text-lg',
      );
    });
  });
});
