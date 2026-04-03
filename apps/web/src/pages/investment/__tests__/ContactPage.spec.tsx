import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ContactPage from '../ContactPage';

const mockNavigate = vi.fn();
const mockSearchParamsState = { value: new URLSearchParams('entity=startup') };
const mockSubmitStartupInquiry = vi.fn();
const mockSubmitOpportunityInquiry = vi.fn();
const mockGetBusinessById = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'startup-1' }),
    useSearchParams: () => [mockSearchParamsState.value] as const,
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

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/services/api', () => ({
  investmentApplicationsAPI: {
    submitInterest: (...args: unknown[]) => mockSubmitOpportunityInquiry(...args),
  },
  businessInquiriesAPI: {
    submit: (...args: unknown[]) => mockSubmitStartupInquiry(...args),
  },
  businessesAPI: {
    getById: (...args: unknown[]) => mockGetBusinessById(...args),
  },
}));

vi.mock('@/lib/wallet-store', () => ({
  parseEgpInputToPiasters: () => null,
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

describe('ContactPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSubmitStartupInquiry.mockReset();
    mockSubmitOpportunityInquiry.mockReset();
    mockGetBusinessById.mockReset();
    mockToastError.mockReset();
    mockToastSuccess.mockReset();
    mockUseAuth.mockReset();

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      language: 'en',
      user: {
        id: 'investor-1',
        full_name: 'Investor User',
        email: 'investor@example.com',
        phone: '01000000000',
        role: 'investor',
      },
    });

    mockGetBusinessById.mockResolvedValue({
      id: 'startup-1',
      ownerId: 'startup-owner-1',
      nameAr: 'Startup One',
      nameEn: 'Startup One',
      category: 'technology',
      description: 'Tech startup',
      descriptionAr: 'شركة تقنية',
      district: 'kharga',
      location: null,
      phone: '01111111111',
      website: 'https://startup.example.com',
      logoUrl: null,
      status: 'active',
      verificationStatus: 'verified',
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null,
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      deletedAt: null,
      commodities: [],
    });

    mockSubmitStartupInquiry.mockResolvedValue({
      id: 'business-inquiry-1',
    });
  });

  it('submits startup contacts through the business inquiries API', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ContactPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(mockGetBusinessById).toHaveBeenCalledWith('startup-1');
    });

    const messageField = container.querySelector<HTMLTextAreaElement>('#message');
    expect(messageField).not.toBeNull();
    fireEvent.change(messageField!, {
      target: { value: 'I would like to explore a seed investment.' },
    });

    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockSubmitStartupInquiry).toHaveBeenCalledWith(
        'startup-1',
        expect.objectContaining({
          contactName: 'Investor User',
          contactEmail: 'investor@example.com',
          contactPhone: '01000000000',
        }),
      );
    });

    expect(mockSubmitStartupInquiry.mock.calls[0]?.[1]).toMatchObject({
      message: expect.stringContaining('I would like to explore a seed investment.'),
    });
    expect(mockSubmitOpportunityInquiry).not.toHaveBeenCalled();
  });

  it('blocks merchants from submitting investment contact requests', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      language: 'en',
      user: {
        id: 'merchant-1',
        full_name: 'Merchant User',
        email: 'merchant@example.com',
        phone: '01000000000',
        role: 'merchant',
      },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ContactPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(mockGetBusinessById).toHaveBeenCalledWith('startup-1');
    });

    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(mockToastError).toHaveBeenCalledWith(
      'This feature is available to investors and admins only',
    );
    expect(mockSubmitStartupInquiry).not.toHaveBeenCalled();
    expect(mockSubmitOpportunityInquiry).not.toHaveBeenCalled();
  });
});
