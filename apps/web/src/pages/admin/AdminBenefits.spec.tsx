import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminBenefits from './AdminBenefits';

const mockUpdateMutateAsync = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();

const benefits = [
  {
    id: 'benefit-1',
    slug: 'solar-pump-grant',
    nameAr: 'دعم مضخة الطاقة الشمسية',
    nameEn: 'Solar Pump Grant',
    ministryAr: 'وزارة الزراعة',
    documentsAr: ['بطاقة الرقم القومي'],
    officeNameAr: 'مكتب الخارجة',
    officePhone: '0922500006',
    officeAddressAr: 'الخارجة',
    enrollmentNotesAr: 'قدّم عبر الجمعية الزراعية.',
    enrollmentNotesEn: 'Apply through the local agricultural association.',
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:00:00.000Z',
  },
];

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/use-benefits', () => ({
  useBenefits: () => ({
    data: benefits,
    isLoading: false,
  }),
  useAdminCreateBenefit: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useAdminUpdateBenefit: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
  useAdminDeleteBenefit: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    title,
    type = 'button',
    variant,
    size,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
    type?: 'button' | 'submit' | 'reset';
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    id,
    value,
    onChange,
  }: {
    id: string;
    value: string;
    onChange: (event: { target: { value: string } }) => void;
  }) => <input id={id} value={value} onChange={onChange} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    id,
    value,
    onChange,
  }: {
    id: string;
    value: string;
    onChange: (event: { target: { value: string } }) => void;
  }) => <textarea id={id} value={value} onChange={onChange} />,
}));

describe('AdminBenefits', () => {
  beforeEach(() => {
    mockCreateMutateAsync.mockReset();
    mockUpdateMutateAsync.mockReset();
    mockDeleteMutateAsync.mockReset();
    mockUpdateMutateAsync.mockResolvedValue(undefined);
  });

  it('sends null when the English enrollment notes are cleared during edit', async () => {
    render(<AdminBenefits />);

    fireEvent.click(screen.getByTitle('تعديل'));

    fireEvent.change(screen.getByLabelText('ملاحظات التسجيل بالإنجليزية'), {
      target: { value: '   ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }));

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        slug: 'solar-pump-grant',
        body: expect.objectContaining({
          enrollmentNotesEn: null,
        }),
      });
    });
  });
});
