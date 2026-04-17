import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn();
const mockMutate = vi.fn();
const mockCompressImage = vi.fn();
const mockGetUploadUrl = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type = 'button',
    className,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
  }) => (
    <button type={type} disabled={disabled} onClick={onClick} className={className}>
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

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
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
    <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="">{placeholder}</option>,
}));

vi.mock('@/components/incidents/IncidentLocationPicker', () => ({
  IncidentLocationPicker: ({ onChange }: { onChange: (lat: number, lng: number) => void }) => (
    <button type="button" onClick={() => onChange(27.03, 28.35)}>
      Pick location
    </button>
  ),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/use-incidents', () => ({
  useReportIncident: () => ({
    isPending: false,
    mutate: mockMutate,
  }),
}));

vi.mock('@/lib/upload', () => ({
  ALLOWED_IMAGE_TYPES: new Set(['image/png']),
  MAX_IMAGE_BYTES: 5 * 1024 * 1024,
  compressImage: (...args: unknown[]) => mockCompressImage(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual('@/services/api');

  return {
    ...(actual as object),
    incidentsAPI: {
      ...((actual as { incidentsAPI: object }).incidentsAPI ?? {}),
      getUploadUrl: (...args: unknown[]) => mockGetUploadUrl(...args),
    },
  };
});

import ReportIncidentPage from '../ReportIncidentPage';

describe('ReportIncidentPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseAuth.mockReset();
    mockMutate.mockReset();
    mockCompressImage.mockReset();
    mockGetUploadUrl.mockReset();

    mockUseAuth.mockReturnValue({
      language: 'en',
    });

    mockCompressImage.mockImplementation((file: File) => Promise.resolve(file));
    mockGetUploadUrl.mockResolvedValue({
      uploadUrl: 'https://example.com/incidents/photo-1.png?signature=123',
    });
  });

  it('disables submit while photo uploads are in progress', async () => {
    let resolveUpload: ((value: Response) => void) | undefined;
    global.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveUpload = resolve;
        }),
    ) as typeof fetch;

    const { container } = render(<ReportIncidentPage />);
    const fileInput = container.querySelector('input[type="file"]');
    const submitButton = screen.getByRole('button', { name: 'Submit Report' });

    expect(fileInput).not.toBeNull();
    expect(submitButton).not.toBeDisabled();

    fireEvent.change(fileInput as HTMLInputElement, {
      target: {
        files: [new File(['image'], 'incident.png', { type: 'image/png' })],
      },
    });

    await waitFor(() => expect(submitButton).toBeDisabled());

    resolveUpload?.(new Response(null, { status: 200 }));
  });
});
