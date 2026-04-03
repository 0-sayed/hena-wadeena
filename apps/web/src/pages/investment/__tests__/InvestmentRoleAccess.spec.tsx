import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@hena-wadeena/types';

import InvestmentPage from '../../InvestmentPage';
import OpportunityDetailsPage from '../OpportunityDetailsPage';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn();
const mockGetOpportunities = vi.fn();
const mockGetStartups = vi.fn();
const mockGetOpportunity = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'opportunity-1' }),
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageHero', () => ({
  PageHero: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));

vi.mock('@/components/motion/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => <div />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type,
    variant,
  }: {
    children: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit';
    variant?: string;
  }) => (
    <button data-variant={variant} onClick={onClick} type={type}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock('@/components/maps/InteractiveMap', () => ({
  InteractiveMap: () => <div>Map</div>,
}));

vi.mock('@/components/ui/ltr-text', () => ({
  LtrText: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/services/api', () => ({
  investmentAPI: {
    getOpportunities: (...args: unknown[]) => mockGetOpportunities(...args),
    getStartups: (...args: unknown[]) => mockGetStartups(...args),
    getOpportunity: (...args: unknown[]) => mockGetOpportunity(...args),
  },
}));

vi.mock('@/assets/hero-investment.jpg', () => ({ default: '/hero-investment.jpg' }));

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('investment role access', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseAuth.mockReset();
    mockGetOpportunities.mockReset();
    mockGetStartups.mockReset();
    mockGetOpportunity.mockReset();

    mockUseAuth.mockReturnValue({
      language: 'en',
      isAuthenticated: true,
      user: {
        id: 'merchant-1',
        full_name: 'Merchant User',
        email: 'merchant@example.com',
        phone: '01000000000',
        role: UserRole.MERCHANT,
      },
    });

    mockGetOpportunities.mockResolvedValue({
      data: [
        {
          id: 'opportunity-1',
          titleAr: 'Opportunity One',
          titleEn: 'Opportunity One',
          sector: 'technology',
          area: 'kharga',
          status: 'active',
          minInvestment: 100000000,
          maxInvestment: 200000000,
          expectedReturnPct: 12,
          incentives: [],
          currency: 'EGP',
        },
      ],
    });
    mockGetStartups.mockResolvedValue({
      data: [
        {
          id: 'startup-1',
          nameAr: 'Startup One',
          nameEn: 'Startup One',
          category: 'technology',
          description: 'Startup description',
          descriptionAr: 'وصف',
          district: 'kharga',
          status: 'active',
          logoUrl: null,
        },
      ],
    });
    mockGetOpportunity.mockResolvedValue({
      id: 'opportunity-1',
      titleAr: 'Opportunity One',
      status: 'active',
      sector: 'technology',
      area: 'kharga',
      minInvestment: 100000000,
      maxInvestment: 200000000,
      expectedReturnPct: 12,
      paybackPeriodYears: 3,
      description: 'Opportunity description',
      incentives: [],
      location: null,
      documents: [],
      contact: null,
      images: [],
    });
  });

  it('shows investment contact CTAs for merchants on the listing page', async () => {
    renderWithQueryClient(<InvestmentPage />);

    await waitFor(() => {
      expect(mockGetOpportunities).toHaveBeenCalled();
      expect(mockGetStartups).toHaveBeenCalled();
    });

    expect(screen.getAllByRole('button', { name: 'Details' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Inquiry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contact' })).toBeInTheDocument();
  });

  it('shows the opportunity inquiry CTA and merchant-safe document state on the details page', async () => {
    renderWithQueryClient(<OpportunityDetailsPage />);

    expect(await screen.findByText('Opportunity One')).toBeInTheDocument();

    expect(mockGetOpportunity).toHaveBeenCalledWith('opportunity-1');
    expect(
      screen.getByRole('button', { name: /(?:send investment inquiry|إرسال استفسار استثماري)/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/لا توجد مستندات مرفقة حالياً/)).toBeInTheDocument();
    expect(screen.queryByText(/عرض المستندات التفصيلية/)).not.toBeInTheDocument();
  });
});
