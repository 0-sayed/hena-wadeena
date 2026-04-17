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

vi.mock('@/hooks/use-listings', () => ({
  useListings: mockUseListings,
}));

vi.mock('@/hooks/use-map', () => ({
  usePois: mockUsePois,
}));

vi.mock('@/hooks/use-benefits', () => ({
  useBenefits: mockUseBenefits,
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

  it('shows loading state while fetching installers', () => {
    mockUseListings.mockReturnValueOnce({ data: undefined, isLoading: true });
    renderPage();
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('renders map content', () => {
    renderPage();
    expect(screen.getByTestId('interactive-map')).toBeDefined();
  });
});
