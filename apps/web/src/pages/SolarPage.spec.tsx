import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const mockUseListings = vi.hoisted(() =>
  vi.fn().mockReturnValue({ data: undefined, isLoading: false }),
);
const mockUsePois = vi.hoisted(() =>
  vi.fn().mockReturnValue({ data: undefined, isLoading: false }),
);
const mockUseBenefits = vi.hoisted(() =>
  vi.fn().mockReturnValue({ data: undefined, isLoading: false }),
);
const mockUseAuth = vi.hoisted(() =>
  vi.fn().mockReturnValue({ language: 'ar', isAuthenticated: false, user: null }),
);

vi.mock('@/hooks/use-listings', () => ({
  useListings: mockUseListings,
}));

vi.mock('@/hooks/use-map', () => ({
  usePois: mockUsePois,
}));

vi.mock('@/hooks/use-benefits', () => ({
  useBenefits: mockUseBenefits,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/components/maps/InteractiveMap', () => ({
  InteractiveMap: () => <div data-testid="interactive-map" />,
}));

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: ReactNode; value: string }) => (
    <button role="tab" data-value={value}>
      {children}
    </button>
  ),
}));

import SolarPage from './SolarPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <SolarPage />
    </MemoryRouter>,
  );
}

describe('SolarPage', () => {
  it('renders three tabs', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /مزودو الطاقة/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /خريطة المجتمع/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /دعم ومنح/i })).toBeDefined();
  });

  it('shows a neutral vision-alignment hero message without implying endorsement', () => {
    renderPage();

    expect(screen.getByText('في إطار رؤية مصر 2030')).toBeInTheDocument();
    expect(
      screen.getByText('دعم مجتمعي للتوسع في الطاقة النظيفة وحلول الطاقة الشمسية المحلية'),
    ).toBeInTheDocument();
  });

  it('shows loading state while fetching installers', () => {
    mockUseListings.mockReturnValueOnce({ data: undefined, isLoading: true });
    renderPage();
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('renders map content', () => {
    renderPage();
    expect(screen.getByTestId('interactive-map')).toBeDefined();
  });

  it('requests solar installations with a backend-valid page size', () => {
    renderPage();

    expect(mockUsePois).toHaveBeenCalledWith({
      category: 'solar_installation',
      limit: 100,
    });
  });

  it('does not show irradiance legend entries when no overlay layer is rendered', () => {
    renderPage();

    expect(screen.queryByText(/إشعاع عالي جداً/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/إشعاع عالي \(/i)).not.toBeInTheDocument();
    expect(screen.getByText(/منشأة شمسية مجتمعية/i)).toBeInTheDocument();
  });

  it('shows English enrollment notes when provided for solar subsidies', () => {
    mockUseAuth.mockReturnValueOnce({ language: 'en', isAuthenticated: false, user: null });
    mockUseBenefits.mockReturnValueOnce({
      data: [
        {
          id: 'benefit-1',
          slug: 'solar-pump-grant',
          nameAr: 'دعم مضخة الطاقة الشمسية الزراعية',
          nameEn: 'Agricultural Solar Pump Grant',
          ministryAr: 'الهيئة الجديدة للطاقة المتجددة (NREA)',
          documentsAr: [],
          officeNameAr: 'وحدة NREA الزراعية - الخارجة',
          officePhone: '0922500006',
          officeAddressAr: 'منطقة الخدمات، الخارجة، الوادي الجديد',
          enrollmentNotesAr: 'يُقدَّم الطلب عبر الجمعية الزراعية المحلية.',
          enrollmentNotesEn:
            'Apply through the local agricultural association or directly at the NREA office.',
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:00:00.000Z',
        },
      ],
      isLoading: false,
    });

    renderPage();

    expect(
      screen.getByText(
        'Apply through the local agricultural association or directly at the NREA office.',
      ),
    ).toBeInTheDocument();
  });
});
