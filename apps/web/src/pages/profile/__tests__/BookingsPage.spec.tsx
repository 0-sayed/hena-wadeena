import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRole } from '@hena-wadeena/types';

import BookingsPage from '../BookingsPage';

const mockCreateReview = vi.fn();
const mockUseMyBookings = vi.fn();
const mockUseMyReviewedBookingIds = vi.fn();

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  GradientMesh: () => null,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type = 'button',
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
  }) => <textarea value={value} onChange={onChange} {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/form-feedback', () => ({
  FieldErrorText: ({
    message,
    id,
    className,
  }: {
    message?: string;
    id: string;
    className?: string;
  }) =>
    message ? (
      <p id={id} className={className}>
        {message}
      </p>
    ) : null,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { role: UserRole.TOURIST },
    direction: 'ltr',
    language: 'en',
  }),
}));

vi.mock('@/hooks/use-my-bookings', () => ({
  useMyBookings: (...args: unknown[]) => mockUseMyBookings(...args),
}));

vi.mock('@/hooks/use-bookings', () => ({
  useConfirmBooking: () => ({ mutate: vi.fn(), isPending: false }),
  useStartBooking: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelBooking: () => ({ mutate: vi.fn(), isPending: false }),
  useCompleteBooking: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/use-reviews', () => ({
  useMyReviewedBookingIds: () => mockUseMyReviewedBookingIds(),
  useCreateReview: () => ({
    mutate: mockCreateReview,
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('BookingsPage review submission', () => {
  beforeEach(() => {
    mockCreateReview.mockReset();
    mockUseMyBookings.mockReset();
    mockUseMyReviewedBookingIds.mockReset();

    mockUseMyBookings.mockReturnValue({
      data: {
        data: [
          {
            id: 'booking-1',
            guideId: 'guide-1',
            packageId: 'package-1',
            packageTitleAr: 'جولة',
            packageTitleEn: 'Tour package',
            bookingDate: '2026-04-08',
            startTime: '09:00',
            peopleCount: 2,
            totalPrice: 250000,
            status: 'completed',
            notes: null,
            cancelReason: null,
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockUseMyReviewedBookingIds.mockReturnValue({
      data: new Map(),
    });
  });

  it('shows inline validation when rating or comment is missing', async () => {
    render(
      <MemoryRouter>
        <BookingsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rate your experience' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));

    expect(await screen.findByText('Please select a rating before submitting')).toBeInTheDocument();
    expect(screen.getByText('Please write a comment before submitting')).toBeInTheDocument();
    expect(mockCreateReview).not.toHaveBeenCalled();
  });

  it('submits guide reviews with an explicit trimmed comment payload', async () => {
    render(
      <MemoryRouter>
        <BookingsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rate your experience' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select 5 stars' }));
    fireEvent.change(screen.getByLabelText('Comment'), {
      target: { value: '  Great guide and smooth tour.  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));

    await waitFor(() =>
      expect(mockCreateReview).toHaveBeenCalledWith(
        {
          guideId: 'guide-1',
          bookingId: 'booking-1',
          rating: 5,
          comment: 'Great guide and smooth tour.',
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      ),
    );
  });
});
