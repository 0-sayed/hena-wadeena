import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { investmentApplicationsAPI } from '@/services/api';

export function useMyInvestmentApplications() {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: ['investment', 'applications', 'mine', user?.id] as const,
    queryFn: () => investmentApplicationsAPI.getMine(),
    enabled: isAuthenticated,
  });
}

export function useOpportunityApplications(opportunityId: string | undefined) {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: opportunityId
      ? (['investment', 'applications', 'opportunity', opportunityId, user?.id] as const)
      : (['investment', 'applications', 'opportunity', 'missing-id', user?.id] as const),
    queryFn: () => investmentApplicationsAPI.getByOpportunity(opportunityId!),
    enabled: isAuthenticated && !!opportunityId,
  });
}
