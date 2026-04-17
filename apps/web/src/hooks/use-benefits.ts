import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { benefitsAPI, type CreateBenefitBody } from '@/services/api';

export function useBenefits() {
  return useQuery({
    queryKey: queryKeys.benefits.all(),
    queryFn: () => benefitsAPI.list(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useAdminCreateBenefit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBenefitBody) => benefitsAPI.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.benefits.all() }),
  });
}

export function useAdminUpdateBenefit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      body,
    }: {
      slug: string;
      body: Partial<Omit<CreateBenefitBody, 'slug'>>;
    }) => benefitsAPI.update(slug, body),
    onSuccess: (_data, { slug }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.benefits.all() });
      void qc.invalidateQueries({ queryKey: queryKeys.benefits.detail(slug) });
    },
  });
}

export function useAdminDeleteBenefit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => benefitsAPI.delete(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.benefits.all() }),
  });
}
