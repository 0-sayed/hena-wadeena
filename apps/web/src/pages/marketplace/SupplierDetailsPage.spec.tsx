import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SupplierDetailsPage from './SupplierDetailsPage';

const mockNavigate = vi.fn();
const mockUseBusiness = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'supplier-1' }),
  };
});

vi.mock('lucide-react', () => {
  const Icon = () => <svg aria-hidden="true" />;

  return {
    ArrowRight: Icon,
    MapPin: Icon,
    Phone: Icon,
    Package: Icon,
    Shield: Icon,
    Globe: Icon,
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/hooks/use-businesses', () => ({
  useBusiness: (id?: string) => mockUseBusiness(id),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ language: 'en', direction: 'ltr', user: null }),
}));

describe('SupplierDetailsPage', () => {
  it('keeps the commodities table aligned between headers and body cells', () => {
    mockUseBusiness.mockReturnValue({
      data: {
        id: 'supplier-1',
        nameAr: 'مزارع الواحات',
        description: null,
        descriptionAr: null,
        district: 'kharga',
        phone: null,
        website: null,
        verificationStatus: 'verified',
        commodities: [
          {
            id: 'commodity-1',
            nameAr: 'فول سوداني',
            unit: 'kg',
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<SupplierDetailsPage />);

    const table = screen.getByRole('table');
    const headerCells = within(table).getAllByRole('columnheader');
    const bodyCells = within(table).getAllByRole('cell');

    expect(table).toHaveClass('table-fixed');
    headerCells.forEach((cell) => expect(cell).toHaveClass('text-start'));
    bodyCells.forEach((cell) => expect(cell).toHaveClass('text-start'));
  });
});
