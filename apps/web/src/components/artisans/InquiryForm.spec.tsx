import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InquiryForm } from './InquiryForm';

const mockMutateAsync = vi.fn();

vi.mock('@/hooks/use-artisans', () => ({
  useSubmitInquiry: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InquiryForm', () => {
  it('blocks submission when quantity is below the product minimum order quantity', async () => {
    render(<InquiryForm productId="product-1" productName="منتج" minOrderQty={10} />);

    fireEvent.change(screen.getByLabelText('الاسم'), {
      target: { value: 'أحمد علي' },
    });
    fireEvent.change(screen.getByLabelText('رقم الهاتف'), {
      target: { value: '+201234567890' },
    });
    fireEvent.change(screen.getByLabelText('الكمية المطلوبة'), {
      target: { value: '5' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'إرسال الاستفسار' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('الحد الأدنى للطلب هو 10')).toBeInTheDocument();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
