/**
 * Hena Wadeena — API Service Layer
 * ==================================
 * Centralized API client for all backend communication.
 * Currently points to mock-server; switch BASE_URL for production.
 */

import { UserRole } from '@hena-wadeena/types';
import type { PaginatedResponse } from '@hena-wadeena/types';
import type {
  AttractionType,
  AttractionArea,
  BestSeason,
  BestTimeOfDay,
  Difficulty,
} from '@/lib/format';
import { apiFetchWithRefresh } from './auth-manager';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// ── Typed error ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  data?: Record<string, unknown>;

  constructor(
    public status: number,
    message: string,
    data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.data = data;
  }
}

// ── Generic fetch wrapper ───────────────────────────────────────────────────

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('access_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });

  if (!res.ok) {
    const error = (await res.json().catch(() => ({ message: 'Network error' }))) as Record<
      string,
      unknown
    >;
    throw new ApiError(
      res.status,
      (error.detail as string) ?? (error.message as string) ?? `API Error ${res.status}`,
      error,
    );
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

export interface AuthRefreshTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
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

  refresh: (body: { refresh_token: string }) =>
    apiFetch<AuthRefreshTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMe: () => apiFetch<AuthUser>('/auth/me'),

  logout: (refresh_token?: string) =>
    apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token }) }),
};

// ── Tourism — Attractions ───────────────────────────────────────────────────

export interface Attraction {
  id: string;
  nameAr: string;
  nameEn: string | null;
  slug: string;
  type: AttractionType;
  area: AttractionArea;
  descriptionAr: string | null;
  descriptionEn: string | null;
  historyAr: string | null;
  bestSeason: BestSeason | null;
  bestTimeOfDay: BestTimeOfDay | null;
  entryFee: {
    adultsPiasters?: number;
    childrenPiasters?: number;
    foreignersPiasters?: number;
  } | null;
  openingHours: string | null;
  durationHours: number | null;
  difficulty: Difficulty | null;
  tips: string[] | null;
  nearbySlugs: string[] | null;
  location: { x: number; y: number } | null;
  images: string[] | null;
  thumbnail: string | null;
  isActive: boolean;
  isFeatured: boolean;
  ratingAvg: number | null;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttractionFilters {
  type?: AttractionType;
  area?: AttractionArea;
  featured?: boolean;
  nearLat?: number;
  nearLng?: number;
  radiusKm?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export const attractionsAPI = {
  getAll: (filters?: AttractionFilters) =>
    apiFetch<PaginatedResponse<Attraction>>(`/attractions${toQueryString(filters)}`),
  getBySlug: (slug: string) => apiFetch<Attraction>(`/attractions/${slug}`),
  getNearby: (slug: string, limit?: number, radiusKm?: number) =>
    apiFetch<Attraction[]>(`/attractions/${slug}/nearby${toQueryString({ limit, radiusKm })}`),
};

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
  getAttractions: () =>
    apiFetchWithRefresh<{ success: boolean; data: Attraction[] }>('/attractions'),

  getFeatured: () =>
    apiFetchWithRefresh<{ success: boolean; data: Attraction[] }>('/attractions/featured'),

  getAttraction: (id: number) =>
    apiFetchWithRefresh<{ success: boolean; data: Attraction }>(`/attractions/${id}`),

  getGuides: () => apiFetchWithRefresh<{ success: boolean; data: Guide[] }>('/guides'),

  getAccommodations: () =>
    apiFetchWithRefresh<{ success: boolean; data: Accommodation[] }>('/accommodations'),
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
  getRoutes: () => apiFetchWithRefresh<{ success: boolean; data: TransportRoute[] }>('/routes'),

  getStations: () => apiFetchWithRefresh<{ success: boolean; data: Station[] }>('/stations'),

  getStation: (id: number) =>
    apiFetchWithRefresh<{ success: boolean; data: Station }>(`/stations/${id}`),

  getCarpools: () => apiFetchWithRefresh<{ success: boolean; data: Carpool[] }>('/carpools'),
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
  getOpportunities: () =>
    apiFetchWithRefresh<{ success: boolean; data: Opportunity[] }>('/opportunities'),

  getOpportunity: (id: number) =>
    apiFetchWithRefresh<{ success: boolean; data: Opportunity }>(`/opportunities/${id}`),

  getStartups: () => apiFetchWithRefresh<{ success: boolean; data: Startup[] }>('/startups'),
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
    apiFetchWithRefresh<{ success: boolean; data: POI[] }>(
      category ? `/pois?category=${encodeURIComponent(category)}` : '/pois',
    ),
  getPOI: (id: number) => apiFetchWithRefresh<{ success: boolean; data: POI }>(`/pois/${id}`),
  getCarpoolRides: () =>
    apiFetchWithRefresh<{ success: boolean; data: CarpoolRide[] }>('/carpool/rides'),
  createCarpoolRide: (body: {
    origin_name: string;
    destination_name: string;
    departure_time: string;
    seats_total: number;
    price_per_seat: number;
    notes?: string;
  }) =>
    apiFetchWithRefresh<{ success: boolean; data: CarpoolRide }>('/carpool/rides', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── Guides ──────────────────────────────────────────────────────────────────

export interface GuideListItem {
  id: string;
  bioAr: string | null;
  bioEn: string | null;
  profileImage: string | null;
  languages: string[];
  specialties: string[];
  areasOfOperation: string[];
  basePrice: number;
  ratingAvg: number | null;
  ratingCount: number;
  licenseVerified: boolean;
  packageCount: number;
}

export interface GuideDetail {
  id: string;
  userId: string;
  bioAr: string | null;
  bioEn: string | null;
  profileImage: string | null;
  coverImage: string | null;
  languages: string[];
  specialties: string[];
  areasOfOperation: string[];
  licenseNumber: string;
  licenseVerified: boolean;
  basePrice: number;
  ratingAvg: number | null;
  ratingCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  packageCount: number;
  reviewCount: number;
}

export interface GuideFilters {
  language?: string;
  specialty?: string;
  area?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  verified?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export const guidesAPI = {
  getAll: (filters?: GuideFilters) =>
    apiFetch<PaginatedResponse<GuideListItem>>(`/guides${toQueryString(filters)}`),
  getById: (id: string) => apiFetch<GuideDetail>(`/guides/${id}`),
  getPackages: (guideId: string, params?: { page?: number; limit?: number }) =>
    apiFetch<PaginatedResponse<GuidePackageListItem>>(
      `/guides/${guideId}/packages${toQueryString(params)}`,
    ),
};

// ── Tour Packages ───────────────────────────────────────────────────────────

interface TourPackageBase {
  id: string;
  titleAr: string;
  titleEn: string | null;
  description: string | null;
  durationHours: number;
  maxPeople: number;
  price: number;
  includes: string[] | null;
  images: string[] | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface TourPackageListItem extends TourPackageBase {
  guideId: string;
  guideBioAr: string | null;
  guideBioEn: string | null;
  guideProfileImage: string | null;
  guideRatingAvg: number | null;
  guideRatingCount: number;
  guideLicenseVerified: boolean;
  attractionSlugs: string[];
}

export interface GuidePackageListItem extends TourPackageBase {
  attractionSlugs: string[];
}

export interface TourPackageDetail extends TourPackageBase {
  guideId: string;
  guideBioAr: string | null;
  guideBioEn: string | null;
  guideProfileImage: string | null;
  guideRatingAvg: number | null;
  guideRatingCount: number;
  guideLicenseVerified: boolean;
  linkedAttractions: {
    id: string;
    nameAr: string;
    nameEn: string | null;
    slug: string;
    thumbnail: string | null;
    type: AttractionType;
    area: AttractionArea;
    sortOrder: number;
  }[];
}

export interface PackageFilters {
  area?: string;
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
  minPeople?: number;
  search?: string;
  guideId?: string;
  attractionId?: string;
  page?: number;
  limit?: number;
}

export const packagesAPI = {
  getAll: (filters?: PackageFilters) =>
    apiFetch<PaginatedResponse<TourPackageListItem>>(`/packages${toQueryString(filters)}`),
  getById: (id: string) => apiFetch<TourPackageDetail>(`/packages/${id}`),
};

// ── Legacy: Bookings + Reviews (mock — no backend yet, used by BookingsPage) ──
// TODO(T15): Replace with real booking endpoints when backend is ready
// TODO(T18): Replace with real review endpoints when backend is ready

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

export const bookingsAPI = {
  getMyBookings: () => apiFetch<{ success: boolean; data: Booking[] }>('/guides/bookings/my'),
  createBooking: (body: {
    package_id: number;
    guide_id: number;
    booking_date: string;
    start_time?: string;
    people_count?: number;
    notes?: string;
  }) =>
    apiFetchWithRefresh<{ success: boolean; message: string; data: Booking }>('/guides/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const reviewsAPI = {
  getReviews: (guideId: number) =>
    apiFetch<{ success: boolean; data: Review[] }>(`/guides/${guideId}/reviews`),
  createReview: (guideId: number, body: { rating: number; comment: string }) =>
    apiFetch<{ success: boolean; data: Review }>(`/guides/${guideId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
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
  getWallet: () => apiFetchWithRefresh<{ success: boolean; data: Wallet }>('/payments/wallet'),
  topup: (body: { amount: number; method?: string }) =>
    apiFetchWithRefresh<{ success: boolean; message: string; data: { new_balance: number } }>(
      '/payments/wallet/topup',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  getTransactions: () =>
    apiFetchWithRefresh<{ success: boolean; data: Transaction[] }>('/payments/transactions'),
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
  getAll: () => apiFetchWithRefresh<{ success: boolean; data: Notification[] }>('/notifications'),
  getUnreadCount: () =>
    apiFetchWithRefresh<{ success: boolean; data: { count: number } }>(
      '/notifications/unread-count',
    ),
  markRead: (id: string) =>
    apiFetchWithRefresh<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PUT' }),
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
    apiFetchWithRefresh<{ success: boolean; data: SearchResult[]; total: number; query: string }>(
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
    apiFetchWithRefresh<{ success: boolean; data: ChatResponse }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversation_id: conversationId }),
    }),
};
