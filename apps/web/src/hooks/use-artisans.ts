import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import {
  artisansAPI,
  type CreateArtisanProductRequest,
  type CreateArtisanProfileRequest,
  type ListArtisansParams,
  type ListProductsParams,
  type SubmitInquiryRequest,
  type UpdateArtisanProductRequest,
  type UpdateArtisanProfileRequest,
  type UpdateInquiryStatusRequest,
} from '@/services/api';

import { usePaginatedQuery } from './use-paginated-query';

export function useArtisans(filters?: ListArtisansParams) {
  return usePaginatedQuery({
    queryKey: queryKeys.artisans.list(filters as Record<string, unknown>),
    queryFn: ({ page, limit }) =>
      artisansAPI.list({ ...filters, offset: (page - 1) * limit, limit }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useArtisan(id: string) {
  return useQuery({
    queryKey: queryKeys.artisans.detail(id),
    queryFn: () => artisansAPI.getById(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useArtisanProducts(artisanId: string, filters?: ListProductsParams) {
  return usePaginatedQuery({
    queryKey: queryKeys.artisans.products(artisanId, filters as Record<string, unknown>),
    queryFn: ({ page, limit }) =>
      artisansAPI.getProducts(artisanId, { ...filters, offset: (page - 1) * limit, limit }),
    staleTime: 5 * 60 * 1000,
    enabled: !!artisanId,
  });
}

export function useArtisanProduct(productId: string) {
  return useQuery({
    queryKey: queryKeys.artisans.product(productId),
    queryFn: () => artisansAPI.getProduct(productId),
    staleTime: 5 * 60 * 1000,
    enabled: !!productId,
  });
}

export function useMyArtisanProfile() {
  return useQuery({
    queryKey: queryKeys.artisans.myProfile(),
    queryFn: () => artisansAPI.getMyProfile(),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

export function useMyArtisanProducts(filters?: ListProductsParams) {
  return usePaginatedQuery({
    queryKey: queryKeys.artisans.myProducts(filters as Record<string, unknown>),
    queryFn: ({ page, limit }) =>
      artisansAPI.listMyProducts({ ...filters, offset: (page - 1) * limit, limit }),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyInquiries() {
  return useQuery({
    queryKey: queryKeys.artisans.myInquiries(),
    queryFn: () => artisansAPI.listMyInquiries(),
    staleTime: 60 * 1000,
  });
}

export function useCreateArtisanProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateArtisanProfileRequest) => artisansAPI.createProfile(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.artisans.myProfile() });
    },
  });
}

export function useUpdateArtisanProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateArtisanProfileRequest) => artisansAPI.updateMyProfile(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.artisans.myProfile() });
    },
  });
}

export function useCreateArtisanProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateArtisanProductRequest) => artisansAPI.createProduct(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.artisans.myProducts() });
    },
  });
}

export function useUpdateArtisanProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & UpdateArtisanProductRequest) =>
      artisansAPI.updateProduct(id, body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.artisans.myProducts() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.artisans.product(variables.id) });
    },
  });
}

export function useDeleteArtisanProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => artisansAPI.deleteProduct(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.artisans.myProducts() });
    },
  });
}

export function useSubmitInquiry() {
  return useMutation({
    mutationFn: ({ productId, ...body }: { productId: string } & SubmitInquiryRequest) =>
      artisansAPI.submitInquiry(productId, body),
  });
}

export function useUpdateInquiryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & UpdateInquiryStatusRequest) =>
      artisansAPI.updateInquiryStatus(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.artisans.myInquiries() });
    },
  });
}
