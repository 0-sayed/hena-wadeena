import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import KycContinuePage from '../KycContinuePage';

const { mockGetSession, mockSubmitDocument, mockClearKycSessionToken } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSubmitDocument: vi.fn(),
  mockClearKycSessionToken: vi.fn(),
}));

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

vi.mock('@/services/api', () => ({
  kycOnboardingAPI: {
    getSession: mockGetSession,
    submitDocument: mockSubmitDocument,
  },
}));

vi.mock('@/services/kyc-session-manager', () => ({
  getKycSessionToken: () => 'kyc-session-token',
  clearKycSessionToken: mockClearKycSessionToken,
}));

describe('KycContinuePage', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it('lists the required documents for the pending role', async () => {
    mockGetSession.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'guide@example.com',
        full_name: 'Guide User',
        role: 'guide',
      },
      required_documents: ['national_id', 'guide_license'],
      submissions: [],
    });

    render(
      <MemoryRouter>
        <KycContinuePage />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('بطاقة الرقم القومي')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('رخصة الإرشاد').length).toBeGreaterThan(0);
  });
});
