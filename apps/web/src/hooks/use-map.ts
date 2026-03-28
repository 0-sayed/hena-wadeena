import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { mapAPI } from '@/services/api';
import type { PoiCategory } from '@/services/api';

// ── POI Queries ────────────────────────────────────────────────────

export function usePois(filters?: {
  page?: number;
  limit?: number;
  category?: PoiCategory;
  q?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}) {
  return useQuery({
    queryKey: queryKeys.map.pois(filters),
    queryFn: () => mapAPI.getPois(filters),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePoi(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.map.poi(id!),
    queryFn: () => mapAPI.getPoi(id!),
    enabled: !!id,
  });
}

export function useSuggestPoi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mapAPI.suggestPoi,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['map', 'pois'] });
    },
  });
}

// ── Carpool Queries ────────────────────────────────────────────────

export function useRides(filters?: {
  page?: number;
  limit?: number;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  radius?: number;
  date?: string;
}) {
  return useQuery({
    queryKey: queryKeys.map.carpool(filters),
    queryFn: () => mapAPI.getRides(filters),
    staleTime: 60 * 1000,
  });
}

export function useRide(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.map.ride(id!),
    queryFn: () => mapAPI.getRide(id!),
    enabled: !!id,
  });
}

export function useMyRides(enabled = true) {
  return useQuery({
    queryKey: queryKeys.map.myRides(),
    queryFn: () => mapAPI.myRides(),
    enabled,
  });
}

export function useCreateRide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mapAPI.createRide,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['map', 'carpool'] });
    },
  });
}

export function useJoinRide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, seats }: { rideId: string; seats?: number }) =>
      mapAPI.joinRide(rideId, seats),
    onSuccess: (_data, { rideId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.map.ride(rideId) });
      void qc.invalidateQueries({ queryKey: ['map', 'carpool'] });
    },
  });
}

export function useCancelJoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rideId: string) => mapAPI.cancelJoin(rideId),
    onSuccess: (_data, rideId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.map.ride(rideId) });
      void qc.invalidateQueries({ queryKey: queryKeys.map.myRides() });
    },
  });
}

export function useCancelRide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rideId: string) => mapAPI.cancelRide(rideId),
    onSuccess: (_data, rideId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.map.ride(rideId) });
      void qc.invalidateQueries({ queryKey: ['map', 'carpool'] });
    },
  });
}

export function useConfirmPassenger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, passengerId }: { rideId: string; passengerId: string }) =>
      mapAPI.confirmPassenger(rideId, passengerId),
    onSuccess: (_data, { rideId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.map.ride(rideId) });
    },
  });
}

export function useDeclinePassenger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, passengerId }: { rideId: string; passengerId: string }) =>
      mapAPI.declinePassenger(rideId, passengerId),
    onSuccess: (_data, { rideId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.map.ride(rideId) });
    },
  });
}
