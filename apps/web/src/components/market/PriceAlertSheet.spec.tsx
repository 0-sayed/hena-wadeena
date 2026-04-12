import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PriceAlertSheet } from './PriceAlertSheet';

const mockNavigate = vi.fn();
const mockUsePriceAlerts = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('@/hooks/use-price-alerts', () => ({
  usePriceAlerts: () => mockUsePriceAlerts(),
  useCreatePriceAlert: () => ({
    mutateAsync: (...args: unknown[]) => mockCreateMutateAsync(...args),
    isPending: false,
  }),
  useUpdatePriceAlert: () => ({
    mutateAsync: (...args: unknown[]) => mockUpdateMutateAsync(...args),
    isPending: false,
  }),
  useDeletePriceAlert: () => ({
    mutateAsync: (...args: unknown[]) => mockDeleteMutateAsync(...args),
    isPending: false,
  }),
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="sheet" onClick={() => onOpenChange?.(false)}>
        {children}
      </div>
    ) : null,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type = 'button',
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
  }) => (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

function renderSheet(overrides?: { commodityId?: string; commodityName?: string }) {
  return render(
    <PriceAlertSheet
      commodityId={overrides?.commodityId ?? 'commodity-1'}
      commodityName={overrides?.commodityName ?? 'تمور سيوي'}
      open
      onOpenChange={vi.fn()}
    />,
  );
}

describe('PriceAlertSheet', () => {
  beforeEach(() => {
    mockUsePriceAlerts.mockReturnValue({ data: [] });
    mockCreateMutateAsync.mockReset();
    mockUpdateMutateAsync.mockReset();
    mockDeleteMutateAsync.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockNavigate.mockReset();

    mockCreateMutateAsync.mockResolvedValue(undefined);
    mockUpdateMutateAsync.mockResolvedValue(undefined);
    mockDeleteMutateAsync.mockResolvedValue(undefined);
  });

  it('renders the title with the commodity name', () => {
    renderSheet({ commodityName: 'تمور سيوي' });

    expect(screen.getByRole('heading', { name: /تمور سيوي/ })).toBeInTheDocument();
  });

  it('shows create button when no existing alert for this commodity', () => {
    mockUsePriceAlerts.mockReturnValue({ data: [] });
    renderSheet();

    expect(screen.getByRole('button', { name: 'إنشاء التنبيه' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'حذف' })).not.toBeInTheDocument();
  });

  it('shows update and delete buttons when an existing alert matches commodity and direction', () => {
    mockUsePriceAlerts.mockReturnValue({
      data: [
        { id: 'alert-1', commodityId: 'commodity-1', direction: 'above', thresholdPrice: 2500 },
      ],
    });
    renderSheet({ commodityId: 'commodity-1' });

    expect(screen.getByRole('button', { name: 'تحديث التنبيه' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حذف' })).toBeInTheDocument();
  });

  it('calls createAlert with piaster-converted price and direction on submit', async () => {
    mockUsePriceAlerts.mockReturnValue({ data: [] });
    renderSheet({ commodityId: 'commodity-42' });

    fireEvent.change(screen.getByLabelText('السعر (جنيه)'), { target: { value: '25.50' } });
    fireEvent.submit(screen.getByRole('button', { name: 'إنشاء التنبيه' }).closest('form')!);

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith({
        commodityId: 'commodity-42',
        thresholdPrice: 2550,
        direction: 'above',
      });
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('تم إنشاء التنبيه');
  });

  it('calls updateAlert when an existing alert is present on submit', async () => {
    mockUsePriceAlerts.mockReturnValue({
      data: [
        { id: 'alert-99', commodityId: 'commodity-1', direction: 'above', thresholdPrice: 1000 },
      ],
    });
    renderSheet({ commodityId: 'commodity-1' });

    fireEvent.change(screen.getByLabelText('السعر (جنيه)'), { target: { value: '30' } });
    fireEvent.submit(screen.getByRole('button', { name: 'تحديث التنبيه' }).closest('form')!);

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: 'alert-99',
        body: { thresholdPrice: 3000, direction: 'above' },
      });
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('تم تحديث التنبيه');
  });

  it('calls deleteAlert and closes the sheet on delete click', async () => {
    mockUsePriceAlerts.mockReturnValue({
      data: [
        { id: 'alert-7', commodityId: 'commodity-1', direction: 'above', thresholdPrice: 500 },
      ],
    });
    renderSheet({ commodityId: 'commodity-1' });

    fireEvent.click(screen.getByRole('button', { name: 'حذف' }));

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith('alert-7');
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('تم حذف التنبيه');
  });

  it('shows a toast error and does not submit when price is invalid', async () => {
    mockUsePriceAlerts.mockReturnValue({ data: [] });
    renderSheet();

    fireEvent.change(screen.getByLabelText('السعر (جنيه)'), { target: { value: 'abc' } });
    fireEvent.submit(screen.getByRole('button', { name: 'إنشاء التنبيه' }).closest('form')!);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('يرجى إدخال سعر صحيح');
    });
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
  });
});
