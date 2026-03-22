/**
 * Hena Wadeena — API Service Layer
 * ==================================
 * Centralized API client for all backend communication.
 * Currently points to mock-server; switch BASE_URL for production.
 */

import { UserRole } from '@hena-wadeena/types';
import type { PaginatedResponse } from '@hena-wadeena/types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// ── 401 Unauthorized callback ────────────────────────────────────────────────

let unauthorizedCallback: (() => void) | null = null;

export function registerUnauthorizedCallback(cb: () => void) {
  unauthorizedCallback = cb;
}

// ── Generic fetch wrapper ───────────────────────────────────────────────────

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('access_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });

  if (res.status === 401 && token) {
    unauthorizedCallback?.();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const error: { detail?: string; message?: string } = (await res
      .json()
      .catch(() => ({ message: 'Network error' }))) as {
      detail?: string;
      message?: string;
    };
    throw new Error(error.detail ?? error.message ?? `API Error ${res.status}`);
  }

  return (await res.json()) as T;
}

/** Build ?key=value&... from object, skipping undefined values */
function toQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  return (
    '?' +
    entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
  );
}

// ── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  phone: string;
  full_name: string;
  password: string;
  role?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  display_name?: string;
  avatar_url?: string;
  role: UserRole;
  status: string;
  language: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export const authAPI = {
  login: (body: LoginRequest) =>
    apiFetch<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  register: (body: RegisterRequest) =>
    apiFetch<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMe: () => apiFetch<AuthUser>('/auth/me'),

  logout: () => apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({}) }),
};

// ── Tourism ─────────────────────────────────────────────────────────────────

export interface Attraction {
  id: number;
  title: string;
  description: string;
  long_description?: string;
  image: string;
  images?: string[];
  rating: number;
  reviews_count?: number;
  duration: string;
  type: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  featured?: boolean;
  opening_hours?: string;
  ticket_price?: number;
  highlights?: string[];
}

export interface Guide {
  id: number;
  name: string;
  languages: string[];
  specialties: string[];
  rating: number;
  reviews: number;
  price_per_day: number;
  image: string;
  bio?: string;
  available?: boolean;
}

export interface Accommodation {
  id: number;
  title: string;
  type: string;
  price: number;
  price_unit: string;
  rooms: number;
  location: string;
  amenities: string[];
  for_students: boolean;
  image?: string;
  rating?: number;
}

export const tourismAPI = {
  getAttractions: () => apiFetch<{ success: boolean; data: Attraction[] }>('/attractions'),

  getFeatured: () => apiFetch<{ success: boolean; data: Attraction[] }>('/attractions/featured'),

  getAttraction: (id: number) =>
    apiFetch<{ success: boolean; data: Attraction }>(`/attractions/${id}`),

  getGuides: () => apiFetch<{ success: boolean; data: Guide[] }>('/guides'),

  getAccommodations: () => apiFetch<{ success: boolean; data: Accommodation[] }>('/accommodations'),
};

// ── Market: Price Index ──────────────────────────────────────────────────

export interface PriceIndexCommodity {
  id: string;
  nameAr: string;
  nameEn: string | null;
  unit: string;
  category: string;
}

export interface PriceIndexEntry {
  commodity: PriceIndexCommodity;
  latestPrice: number;
  previousPrice: number | null;
  changePiasters: number | null;
  changePercent: number | null;
  region: string;
  priceType: string;
  recordedAt: string;
}

export interface TopMover {
  commodity: { id: string; nameAr: string };
  changePercent: number | null;
  direction: 'up' | 'down' | null;
}

export interface PriceSummaryResponse {
  totalCommodities: number;
  totalPriceEntries: number;
  lastUpdated: string | null;
  topMovers: TopMover[];
  categoryAverages: Array<{
    category: string;
    avgPrice: number;
    commodityCount: number;
  }>;
}

// ── Market: Business Directory ───────────────────────────────────────────

export interface LinkedCommodity {
  id: string;
  nameAr: string;
  nameEn: string | null;
  category: string;
  unit: string;
}

export interface BusinessEntry {
  id: string;
  ownerId: string;
  nameAr: string;
  nameEn: string | null;
  category: string;
  description: string | null;
  descriptionAr: string | null;
  district: string | null;
  location: unknown;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  status: string;
  verificationStatus: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  commodities: LinkedCommodity[];
}

export const priceIndexAPI = {
  getIndex: (params?: {
    category?: string;
    region?: string;
    price_type?: string;
    limit?: number;
    offset?: number;
  }) => apiFetch<PaginatedResponse<PriceIndexEntry>>(`/price-index${toQueryString(params)}`),

  getSummary: () => apiFetch<PriceSummaryResponse>('/price-index/summary'),
};

export const businessesAPI = {
  getAll: (params?: {
    category?: string;
    district?: string;
    commodity_id?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }) => apiFetch<PaginatedResponse<BusinessEntry>>(`/businesses${toQueryString(params)}`),

  getById: (id: string) => apiFetch<BusinessEntry>(`/businesses/${id}`),
};

// ── Logistics ───────────────────────────────────────────────────────────────

export interface TransportRoute {
  id: number;
  from: string;
  to: string;
  type: string;
  duration: string;
  price: number;
  departures: string[];
  operator: string;
}

export interface Station {
  id: number;
  name: string;
  city: string;
  routes: number;
  address?: string;
  phone?: string;
  facilities?: string[];
  operating_hours?: string;
}

export interface Carpool {
  id: number;
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number;
  price: number;
  driver: string;
  rating: number;
  car_model?: string;
}

export const logisticsAPI = {
  getRoutes: () => apiFetch<{ success: boolean; data: TransportRoute[] }>('/routes'),

  getStations: () => apiFetch<{ success: boolean; data: Station[] }>('/stations'),

  getStation: (id: number) => apiFetch<{ success: boolean; data: Station }>(`/stations/${id}`),

  getCarpools: () => apiFetch<{ success: boolean; data: Carpool[] }>('/carpools'),
};

// ── Investment ──────────────────────────────────────────────────────────────

export interface Opportunity {
  id: number;
  title: string;
  category: string;
  location: string;
  investment: string;
  min_investment?: number;
  max_investment?: number;
  roi: string;
  status: string;
  description: string;
  details?: string;
  image?: string;
}

export interface Startup {
  id: number;
  name: string;
  sector: string;
  stage: string;
  location: string;
  team: number;
  description: string;
  funding_needed?: string;
  image?: string;
}

export const investmentAPI = {
  getOpportunities: () => apiFetch<{ success: boolean; data: Opportunity[] }>('/opportunities'),

  getOpportunity: (id: number) =>
    apiFetch<{ success: boolean; data: Opportunity }>(`/opportunities/${id}`),

  getStartups: () => apiFetch<{ success: boolean; data: Startup[] }>('/startups'),
};

// ── Map / POI ──────────────────────────────────────────────────────────────

export interface POI {
  id: number;
  name_ar: string;
  name_en?: string;
  category: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  rating_avg: number;
  rating_count: number;
  images: string[];
  status: string;
}

export interface CarpoolRide {
  id: number;
  driver_id: string;
  driver_name: string;
  origin_name: string;
  destination_name: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  departure_time: string;
  seats_total: number;
  seats_taken: number;
  price_per_seat: number;
  notes?: string;
  status: string;
  car_model?: string;
  rating?: number;
}

export const mapAPI = {
  getPOIs: (category?: string) =>
    apiFetch<{ success: boolean; data: POI[] }>(
      category ? `/pois?category=${encodeURIComponent(category)}` : '/pois',
    ),
  getPOI: (id: number) => apiFetch<{ success: boolean; data: POI }>(`/pois/${id}`),
  getCarpoolRides: () => apiFetch<{ success: boolean; data: CarpoolRide[] }>('/carpool/rides'),
  createCarpoolRide: (body: {
    origin_name: string;
    destination_name: string;
    departure_time: string;
    seats_total: number;
    price_per_seat: number;
    notes?: string;
  }) =>
    apiFetch<{ success: boolean; data: CarpoolRide }>('/carpool/rides', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── Guides / Bookings ──────────────────────────────────────────────────────

export interface GuideProfile {
  id: number;
  user_id: string;
  name: string;
  bio_ar: string;
  languages: string[];
  specialties: string[];
  license_number: string;
  license_verified: boolean;
  base_price: number;
  rating_avg: number;
  rating_count: number;
  active: boolean;
  image: string;
}

export interface TourPackage {
  id: number;
  guide_id: number;
  title_ar: string;
  description: string;
  duration_hrs: number;
  max_people: number;
  price: number;
  includes: string[];
  images: string[];
  status: string;
}

export interface Booking {
  id: string;
  package_id: number;
  guide_id: number;
  guide_name: string;
  tourist_id: string;
  package_title: string;
  booking_date: string;
  start_time: string;
  people_count: number;
  total_price: number;
  status: string;
  created_at: string;
}

export interface Review {
  id: string;
  guide_id: number;
  tourist_id: string;
  tourist_name: string;
  rating: number;
  comment: string;
  guide_reply?: string;
  created_at: string;
}

export const guidesAPI = {
  getGuides: () => apiFetch<{ success: boolean; data: GuideProfile[] }>('/guides'),
  getGuide: (id: number) => apiFetch<{ success: boolean; data: GuideProfile }>(`/guides/${id}`),
  getPackages: (guideId: number) =>
    apiFetch<{ success: boolean; data: TourPackage[] }>(`/guides/${guideId}/packages`),
  getReviews: (guideId: number) =>
    apiFetch<{ success: boolean; data: Review[] }>(`/guides/${guideId}/reviews`),
  createReview: (guideId: number, body: { rating: number; comment: string }) =>
    apiFetch<{ success: boolean; data: Review }>(`/guides/${guideId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  createBooking: (body: {
    package_id: number;
    guide_id: number;
    booking_date: string;
    start_time?: string;
    people_count?: number;
    notes?: string;
  }) =>
    apiFetch<{ success: boolean; message: string; data: Booking }>('/guides/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getMyBookings: () => apiFetch<{ success: boolean; data: Booking[] }>('/guides/bookings/my'),
};

// ── Payments / Wallet ──────────────────────────────────────────────────────

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  recent_transactions: Transaction[];
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  direction: string;
  balance_after: number;
  description: string;
  status: string;
  created_at: string;
  reference_type?: string;
  reference_id?: string;
}

export const paymentsAPI = {
  getWallet: () => apiFetch<{ success: boolean; data: Wallet }>('/payments/wallet'),
  topup: (body: { amount: number; method?: string }) =>
    apiFetch<{ success: boolean; message: string; data: { new_balance: number } }>(
      '/payments/wallet/topup',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  getTransactions: () =>
    apiFetch<{ success: boolean; data: Transaction[] }>('/payments/transactions'),
};

// ── Notifications ──────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  title_ar: string;
  body_ar: string;
  data: Record<string, unknown>;
  channel: string[];
  read_at: string | null;
  created_at: string;
}

export const notificationsAPI = {
  getAll: () => apiFetch<{ success: boolean; data: Notification[] }>('/notifications'),
  getUnreadCount: () =>
    apiFetch<{ success: boolean; data: { count: number } }>('/notifications/unread-count'),
  markRead: (id: string) =>
    apiFetch<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PUT' }),
};

// ── Search ─────────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description: string;
  location: string;
  url: string;
}

export const searchAPI = {
  search: (q: string, type?: string) =>
    apiFetch<{ success: boolean; data: SearchResult[]; total: number; query: string }>(
      `/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`,
    ),
};

// ── AI Chatbot ─────────────────────────────────────────────────────────────

export interface ChatResponse {
  response: string;
  conversation_id: string;
  sources: unknown[];
}

export const aiAPI = {
  chat: (message: string, conversationId?: string) =>
    apiFetch<{ success: boolean; data: ChatResponse }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversation_id: conversationId }),
    }),
};
