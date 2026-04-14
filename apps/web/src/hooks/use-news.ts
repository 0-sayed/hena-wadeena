import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { newsAPI } from '@/services/api';
import { queryKeys } from '@/lib/query-keys';

export function useNewsList(filters?: { category?: string; offset?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.news.list(filters as Record<string, unknown>),
    queryFn: () => newsAPI.getList(filters),
    staleTime: 2 * 60 * 1000,
  });
}

export function useNewsArticle(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.news.detail(slug ?? ''),
    queryFn: () => newsAPI.getBySlug(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminNewsList(filters?: { category?: string; offset?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.news.adminList(filters as Record<string, unknown>),
    queryFn: () => newsAPI.adminGetList(filters),
    staleTime: 1 * 60 * 1000,
  });
}

export function useAdminCreateNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: newsAPI.adminCreate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.news.lists() });
    },
  });
}

export function useAdminUpdateNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof newsAPI.adminUpdate>[1] }) =>
      newsAPI.adminUpdate(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.news.lists() });
    },
  });
}

export function useAdminPublishNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => newsAPI.adminPublish(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.news.lists() });
    },
  });
}

export function useAdminDeleteNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => newsAPI.adminDelete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.news.lists() });
    },
  });
}
