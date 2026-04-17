import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { incidentsAPI } from '@/services/api';
import type { IncidentStatus, IncidentType } from '@/services/api';

export function usePublicIncidents(params?: {
  page?: number;
  limit?: number;
  status?: IncidentStatus;
  incidentType?: IncidentType;
}) {
  return useQuery({
    queryKey: queryKeys.incidents.list(params),
    queryFn: () => incidentsAPI.list(params),
  });
}

export function useMyIncidents(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.incidents.mine(params),
    queryFn: () => incidentsAPI.myIncidents(params),
  });
}

export function useReportIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: incidentsAPI.report,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.incidents.mine() });
    },
  });
}

export function useAdminIncidents(params?: {
  page?: number;
  limit?: number;
  status?: IncidentStatus;
  incidentType?: IncidentType;
}) {
  return useQuery({
    queryKey: queryKeys.incidents.adminList(params),
    queryFn: () => incidentsAPI.adminList(params),
  });
}

export function useAdminIncident(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.incidents.adminDetail(id!),
    queryFn: () => incidentsAPI.adminGet(id!),
    enabled: !!id,
  });
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { status?: IncidentStatus; adminNotes?: string; eeaaReference?: string };
    }) => incidentsAPI.adminUpdate(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}
