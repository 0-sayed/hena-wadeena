import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProduceListingSheet } from './ProduceListingSheet';

const mockCreate = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual('@/services/api');
  return {
    ...(actual as object),
    listingsAPI: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  };
});

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { role: 'farmer' },
    isAuthenticated: true,
  }),
}));

vi.mock('@/lib/upload', () => ({
  ALLOWED_IMAGE_TYPES: new Set(['image/jpeg', 'image/png', 'image/webp']),
  MAX_IMAGE_BYTES: 5 * 1024 * 1024,
  compressImage: vi.fn((file: File) => Promise.resolve(file)),
  readFileAsDataUrl: vi.fn((file: File) => Promise.resolve(`data:${file.type};base64,mock`)),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: ReactNode; open?: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-slot="produce-dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: ReactNode; open?: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
  }: {
    id?: string;
    checked?: boolean;
    onCheckedChange?: () => void;
  }) => (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={() => onCheckedChange?.()}
      readOnly
    />
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <div data-select-value={value} onClick={() => onValueChange?.('kharga')}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, id }: { children: ReactNode; id?: string }) => (
    <button type="button" id={id}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ProduceListingSheet open onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('ProduceListingSheet', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({ id: 'listing-1' });
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  it('opens as a centered dialog with a multi-image file uploader', () => {
    renderForm();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
    expect(screen.getByLabelText('رفع صورة المنتج')).toHaveAttribute('type', 'file');
    expect(screen.getByLabelText('رفع صورة المنتج')).toHaveAttribute('multiple');
    expect(screen.queryByRole('button', { name: 'رفع' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('رابط صورة')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إضافة رابط' })).not.toBeInTheDocument();
  });

  it('previews and submits selected product image files', async () => {
    renderForm();

    const firstFile = new File(['image-bytes-1'], 'dates.png', { type: 'image/png' });
    const secondFile = new File(['image-bytes-2'], 'farm.webp', { type: 'image/webp' });
    fireEvent.change(screen.getByLabelText('رفع صورة المنتج'), {
      target: { files: [firstFile, secondFile] },
    });

    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'معاينة صورة المنتج 1' })).toBeInTheDocument(),
    );
    expect(screen.getByRole('img', { name: 'معاينة صورة المنتج 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إضافة صور' })).toHaveClass('border-dashed');

    fireEvent.change(screen.getByLabelText('عنوان الإعلان'), {
      target: { value: 'تمور سيوي جودة عالية' },
    });
    fireEvent.change(screen.getByLabelText('السعر (جنيه/كجم)'), {
      target: { value: '25.50' },
    });
    fireEvent.click(screen.getByText('اختر المدينة'));

    fireEvent.submit(screen.getByRole('button', { name: 'نشر العرض' }).closest('form')!);

    await waitFor(() => expect(mockCreate).toHaveBeenCalledOnce());
    expect(mockCreate.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        images: [
          expect.stringMatching(/^data:image\/png/),
          expect.stringMatching(/^data:image\/webp/),
        ],
      }),
    );
  });

  it('rejects non-image product files before previewing', () => {
    renderForm();

    const file = new File(['not an image'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('رفع صورة المنتج'), {
      target: { files: [file] },
    });

    expect(mockToastError).toHaveBeenCalledWith('يرجى اختيار ملف صورة');
    expect(screen.queryByRole('img', { name: /معاينة صورة المنتج/ })).not.toBeInTheDocument();
  });
});
