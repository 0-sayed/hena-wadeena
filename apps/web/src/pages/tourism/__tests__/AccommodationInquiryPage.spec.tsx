import type { ReactNode } from 'react';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from 'i18next';

import AccommodationInquiryPage from '../AccommodationInquiryPage';

const mockNavigate = vi.fn();
const mockSubmitInquiry = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
const mockUseAuth = vi.fn();
const mockUseListing = vi.fn();

const SelectContext = React.createContext<((value: string) => void) | null>(null);

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'listing-1' }),
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit';
  }) => (
    <button disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    htmlFor,
    className,
  }: {
    children: ReactNode;
    htmlFor?: string;
    className?: string;
  }) => (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    id?: string;
  }) => (
    <input
      checked={checked}
      id={id}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      type="checkbox"
    />
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: ReactNode;
    onValueChange: (value: string) => void;
  }) => <SelectContext.Provider value={onValueChange}>{children}</SelectContext.Provider>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => {
    const onValueChange = React.useContext(SelectContext);
    return <button onClick={() => onValueChange?.(value)}>{children}</button>;
  },
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/use-listings', () => ({
  useListing: (id: string | undefined) => mockUseListing(id),
}));

vi.mock('@/services/api', () => ({
  listingInquiriesAPI: {
    submit: (...args: unknown[]) => mockSubmitInquiry(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

describe('AccommodationInquiryPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSubmitInquiry.mockReset();
    mockToastError.mockReset();
    mockToastSuccess.mockReset();
    mockUseAuth.mockReset();
    mockUseListing.mockReset();

    void i18n.changeLanguage('ar');

    mockUseAuth.mockReturnValue({
      language: 'ar',
      user: {
        id: 'tenant-1',
        full_name: 'Resident User',
        email: 'resident@example.com',
        phone: '01000000000',
        role: 'resident',
      },
    });

    mockUseListing.mockReturnValue({
      data: {
        id: 'listing-1',
        ownerId: 'owner-1',
        titleAr: 'سكن الواحة',
      },
    });

    mockSubmitInquiry.mockResolvedValue({
      id: 'inquiry-1',
    });
  });

  afterEach(() => {
    void i18n.changeLanguage('en');
  });

  it('submits the accommodation inquiry through the listing inquiries API', async () => {
    render(<AccommodationInquiryPage />);

    fireEvent.click(screen.getByRole('button', { name: 'طالب جامعي' }));
    fireEvent.change(screen.getByLabelText('رسالتك'), {
      target: { value: 'أحتاج إلى السكن قرب الجامعة.' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'إرسال الاستفسار' }).closest('form')!);

    await waitFor(() => {
      expect(mockSubmitInquiry).toHaveBeenCalledWith(
        'listing-1',
        expect.objectContaining({
          contactName: 'Resident User',
          contactEmail: 'resident@example.com',
          contactPhone: '01000000000',
        }),
      );
    });

    expect(mockSubmitInquiry.mock.calls[0]?.[1]).toMatchObject({
      message: expect.stringContaining('استفسار بخصوص السكن: سكن الواحة'),
    });
    expect(mockSubmitInquiry.mock.calls[0]?.[1]).toMatchObject({
      message: expect.stringContaining('نوع المستأجر: طالب جامعي'),
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/marketplace/inquiries?tab=sent&focus=inquiry-1');
    });
  });
});
