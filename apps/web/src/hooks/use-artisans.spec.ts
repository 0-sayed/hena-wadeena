import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invalidateQueries } = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  artisansAPI: {
    createProduct: vi.fn().mockResolvedValue({}),
    updateProduct: vi.fn().mockResolvedValue({}),
    deleteProduct: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/query-keys', () => ({
  queryKeys: {
    artisans: {
      myProductsBase: () => ['artisans', 'me', 'products'] as const,
      product: (id: string) => ['artisans', 'products', id] as const,
    },
  },
}));

let capturedOptions: Record<string, unknown> = {};

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn().mockImplementation((options: Record<string, unknown>) => {
    capturedOptions = options;
    return { mutate: vi.fn(), isPending: false };
  }),
  useQueryClient: vi.fn().mockReturnValue({ invalidateQueries }),
}));

import {
  useCreateArtisanProduct,
  useDeleteArtisanProduct,
  useUpdateArtisanProduct,
} from './use-artisans';

describe('artisan product invalidation', () => {
  beforeEach(() => {
    invalidateQueries.mockClear();
  });

  it('invalidates the shared my-products prefix after product creation', () => {
    useCreateArtisanProduct();
    const onSuccess = capturedOptions.onSuccess as (() => void) | undefined;

    onSuccess?.();

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['artisans', 'me', 'products'],
    });
  });

  it('invalidates the shared my-products prefix and product detail after product updates', () => {
    useUpdateArtisanProduct();
    const onSuccess =
      capturedOptions.onSuccess as ((data: unknown, variables: { id: string }) => void) | undefined;

    onSuccess?.({}, { id: 'product-1' });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['artisans', 'me', 'products'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['artisans', 'products', 'product-1'],
    });
  });

  it('invalidates the shared my-products prefix after product deletion', () => {
    useDeleteArtisanProduct();
    const onSuccess = capturedOptions.onSuccess as (() => void) | undefined;

    onSuccess?.();

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['artisans', 'me', 'products'],
    });
  });
});
