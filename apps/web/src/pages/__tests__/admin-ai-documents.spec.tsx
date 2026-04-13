import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInvalidateQueries = vi.fn();
const mockRefetch = vi.fn();
const mockUpload = vi.fn();
const mockDelete = vi.fn();
const mockCompose = vi.fn();
const mockFeed = vi.fn();
const mockUseAdminAiDocuments = vi.fn();
const mockUseAdminAiBatch = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    language: 'en',
  }),
}));

vi.mock('@/hooks/use-admin', () => ({
  useAdminAiDocuments: (...args: unknown[]) => mockUseAdminAiDocuments(...args),
  useAdminAiBatch: (...args: unknown[]) => mockUseAdminAiBatch(...args),
  useUploadAdminAiDocuments: () => ({ isPending: false, mutateAsync: mockUpload }),
  useDeleteAdminAiDocument: () => ({ isPending: false, mutateAsync: mockDelete }),
  useComposeAdminAiCuratedText: () => ({ isPending: false, mutateAsync: mockCompose }),
  useFeedAdminAiCuratedText: () => ({ isPending: false, mutateAsync: mockFeed }),
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
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

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    onBlur,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    onBlur?: (event: { target: { value: string } }) => void;
  }) => <input value={value} onChange={onChange as never} onBlur={onBlur as never} />,
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div>progress:{value}</div>,
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
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    placeholder?: string;
    onChange?: (event: { target: { value: string } }) => void;
  }) => <textarea value={value} placeholder={placeholder} onChange={onChange as never} />,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import AdminAiDocuments from '../admin/AdminAiDocuments';

describe('AdminAiDocuments', () => {
  beforeEach(() => {
    mockInvalidateQueries.mockReset();
    mockRefetch.mockReset();
    mockUpload.mockReset();
    mockDelete.mockReset();
    mockCompose.mockReset();
    mockFeed.mockReset();
    mockUseAdminAiBatch.mockReset();
    mockUseAdminAiDocuments.mockReset();

    mockRefetch.mockResolvedValue(undefined);
    mockUpload.mockResolvedValue({ batch_id: 'batch-1' });
    mockDelete.mockResolvedValue({ deleted: true });
    mockCompose.mockResolvedValue({
      strategy: 'llm',
      entries: [
        {
          slug: 'geography',
          title: 'Geography',
          description: 'Governorate geography',
          content: 'The governorate spans a wide desert area.',
          tags: ['geography'],
          language: 'ar',
        },
      ],
    });
    mockFeed.mockResolvedValue({
      total_entries: 1,
      indexed_entries: 1,
      failed_entries: 0,
      items: [],
    });

    mockUseAdminAiDocuments.mockReturnValue({
      data: {
        documents: [],
        pagination: { total: 0, page: 1, per_page: 100 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });

    mockUseAdminAiBatch.mockReturnValue({
      data: undefined,
    });
  });

  it('renders the RAG studio empty state in English', () => {
    render(<AdminAiDocuments />);

    expect(screen.getByRole('heading', { name: 'AI knowledge management' })).toBeInTheDocument();
    expect(screen.getByText('RAG studio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload PDF/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Generate slugs automatically/ }),
    ).toBeInTheDocument();
  });

  it('invalidates document queries when a batch completes', async () => {
    mockUseAdminAiBatch.mockReturnValue({
      data: {
        batch_id: 'batch-1',
        status: 'completed',
        total_files: 1,
        pending_files: 0,
        processing_files: 0,
        indexed_files: 1,
        failed_files: 0,
        created_at: '2026-04-08T10:00:00.000Z',
        completed_at: '2026-04-08T10:01:00.000Z',
        documents: [],
      },
    });

    render(<AdminAiDocuments />);

    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['admin', 'ai', 'documents'],
      });
    });
  });

  it('uploads selected PDF files through the admin hook', async () => {
    const { container } = render(<AdminAiDocuments />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['%PDF-1.4 sample'], 'knowledge.pdf', { type: 'application/pdf' });

    fireEvent.change(input, {
      target: {
        files: [file],
      },
    });

    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1));
    expect(mockUpload.mock.calls[0][0].files[0].name).toBe('knowledge.pdf');
  });

  it('composes curated text and feeds the chatbot', async () => {
    render(<AdminAiDocuments />);

    fireEvent.change(screen.getByPlaceholderText('Paste the report or long text here...'), {
      target: {
        value: 'Long report about New Valley',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Generate slugs automatically/ }));

    await waitFor(() => expect(mockCompose).toHaveBeenCalledTimes(1));
    const [selectedSlugInput] = screen.getAllByDisplayValue('geography');
    expect(selectedSlugInput).toBeInTheDocument();

    fireEvent.change(selectedSlugInput, {
      target: {
        value: 'new-geography',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Feed the chatbot/ }));

    await waitFor(() => expect(mockFeed).toHaveBeenCalledTimes(1));
    expect(mockFeed.mock.calls[0][0].entries[0].slug).toBe('new-geography');
  });

  it('deletes a listed knowledge source after confirmation', async () => {
    mockUseAdminAiDocuments.mockReturnValue({
      data: {
        documents: [
          {
            doc_id: 'doc-1',
            batch_id: null,
            filename: 'guide.pdf',
            source_type: 'pdf',
            title: null,
            language: 'en',
            total_pages: 12,
            total_chunks: 30,
            file_size_kb: 512,
            uploaded_at: '2026-04-08T10:00:00.000Z',
            indexed_at: '2026-04-08T10:01:00.000Z',
            status: 'indexed',
            tags: [],
            description: null,
            current_step: 'indexed',
            error_detail: null,
          },
        ],
        pagination: { total: 1, page: 1, per_page: 100 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminAiDocuments />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete source' }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('doc-1'));
  });
});
