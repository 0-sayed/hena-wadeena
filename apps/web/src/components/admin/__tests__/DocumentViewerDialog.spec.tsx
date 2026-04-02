import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DocumentViewerDialog } from '../DocumentViewerDialog';

const mockUseAuth = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('DocumentViewerDialog localization', () => {
  it('renders English empty-state copy when the app language is English', () => {
    mockUseAuth.mockReturnValue({
      language: 'en',
    });

    render(
      <DocumentViewerDialog
        open
        onOpenChange={vi.fn()}
        documentUrl={null}
        documentType="Passport"
        userName="John Doe"
      />,
    );

    expect(screen.getByText('View document')).toBeInTheDocument();
    expect(screen.getByText('No document available')).toBeInTheDocument();
  });

  it('renders English action labels when the app language is English', () => {
    mockUseAuth.mockReturnValue({
      language: 'en',
    });

    render(
      <DocumentViewerDialog
        open
        onOpenChange={vi.fn()}
        documentUrl="https://example.com/passport.jpg"
        documentType="Passport"
        userName="John Doe"
      />,
    );

    expect(screen.getByText('View document - Passport')).toBeInTheDocument();
    expect(screen.getByText('John Doe document')).toBeInTheDocument();
    expect(screen.getByText('Open in new tab')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });
});
