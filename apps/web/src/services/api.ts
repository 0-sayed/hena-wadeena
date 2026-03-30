/**
 * Hena Wadeena — API Service Layer
 * ==================================
 * Centralized API client for all backend communication.
 * Currently points to mock-server; switch BASE_URL for production.
 */

import { UserRole } from '@hena-wadeena/types';
import type { PaginatedResponse, NotificationListResponse } from '@hena-wadeena/types';
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

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Build ?key=value&... from object, skipping undefined values */
function toQueryString(params?: object): string {
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

// ── Businesses ────────────────────────────────────────────────────────────
// NOTE: Field names match backend DB schema (business_directories table).

export interface Business {
  id: string;
  ownerId: string;
  nameAr: string;
  nameEn: string | null;
  category: string;
  description: string | null;
  descriptionAr: string | null;
  district: string | null;
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
}

// NOTE: GET /businesses/mine returns BusinessDirectory[] (plain array, no wrapper).
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
  getMine: () => apiFetch<Business[]>('/businesses/mine'),
  create: (body: { nameAr: string; description?: string; category: string; district: string }) =>
    apiFetch<Business>('/businesses', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<{ nameAr: string; description: string }>) =>
    apiFetch<Business>(`/businesses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id: string) => apiFetch<void>(`/businesses/${id}`, { method: 'DELETE' }),
};

// ── Listings ──────────────────────────────────────────────────────────────
// NOTE: Field names match backend DB schema (listings table).
// GET /listings returns PaginatedResponse<Listing> = { data, total, page, limit, hasMore }.

export interface Listing {
  id: string;
  ownerId: string;
  listingType: string;
  transaction: string;
  titleAr: string;
  titleEn: string | null;
  description: string | null;
  category: string;
  subCategory: string | null;
  price: number;
  priceUnit: string;
  district: string | null;
  address: string | null;
  slug: string;
  status: string;
  isVerified: boolean;
  isFeatured: boolean;
  ratingAvg: number | null;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
}

export const listingsAPI = {
  getAll: (params?: { category?: string; district?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.district) qs.set('area', params.district);
    if (params?.limit != null) qs.set('limit', String(params.limit));
    if (params?.offset != null) qs.set('offset', String(params.offset));
    const query = qs.toString();
    return apiFetch<{
      data: Listing[];
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    }>(`/listings${query ? `?${query}` : ''}`);
  },
};

// ── Investment ──────────────────────────────────────────────────────────────

export interface Opportunity {
  id: string;
  titleAr: string;
  titleEn: string | null;
  sector: string;
  area: string;
  minInvestment: number;
  maxInvestment: number;
  currency: string;
  expectedReturnPct: number;
  paybackPeriodYears: number;
  incentives: string[];
  status: string;
  images: string[];
}

export interface Startup {
  id: string;
  nameAr: string;
  nameEn: string | null;
  category: string;
  descriptionAr: string | null;
  district: string;
  location: { x: number; y: number } | null;
  phone: string | null;
  logoUrl: string | null;
  status: string;
}

export const investmentAPI = {
  getOpportunities: () => apiFetchWithRefresh<PaginatedResponse<Opportunity>>('/investments'),

  getOpportunity: (id: string) => apiFetchWithRefresh<Opportunity>(`/investments/${id}`),

  getStartups: () => apiFetchWithRefresh<PaginatedResponse<Startup>>('/businesses?type=startup'),
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

// ── Bookings ───────────────────────────────────────────────────────────────

export interface Booking {
  id: string;
  packageId: string;
  guideId: string;
  touristId: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS from Postgres
  peopleCount: number;
  totalPrice: number; // integer piasters
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  // Present in list responses (joined from tour_packages)
  packageTitleAr?: string | null;
  packageTitleEn?: string | null;
}

// ── Reviews ────────────────────────────────────────────────────────────────
// TODO(T18): Replace with real review endpoints when backend is ready

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
  getMyBookings: (params?: { status?: string; offset?: number; limit?: number }) =>
    apiFetchWithRefresh<PaginatedResponse<Booking>>(`/bookings/mine${toQueryString(params)}`),

  createBooking: (body: {
    packageId: string;
    bookingDate: string;
    startTime: string;
    peopleCount: number;
    notes?: string;
  }) =>
    apiFetchWithRefresh<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  confirmBooking: (id: string) =>
    apiFetchWithRefresh<Booking>(`/bookings/${id}/confirm`, { method: 'PATCH' }),

  startBooking: (id: string) =>
    apiFetchWithRefresh<Booking>(`/bookings/${id}/start`, { method: 'PATCH' }),

  cancelBooking: (id: string, cancelReason: string) =>
    apiFetchWithRefresh<Booking>(`/bookings/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ cancelReason }),
    }),

  completeBooking: (id: string) =>
    apiFetchWithRefresh<Booking>(`/bookings/${id}/complete`, { method: 'PATCH' }),
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

export const notificationsAPI = {
  getAll: (page = 1, limit = 20, unreadOnly = false) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (unreadOnly) params.set('unreadOnly', 'true');
    return apiFetchWithRefresh<NotificationListResponse>(`/notifications?${params}`);
  },

  getUnreadCount: () => apiFetchWithRefresh<{ count: number }>('/notifications/unread-count'),

  markRead: (id: string) =>
    apiFetchWithRefresh<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllRead: () =>
    apiFetchWithRefresh<{ success: boolean }>('/notifications/read-all', {
      method: 'PATCH',
    }),
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

// ── Map / POI ──────────────────────────────────────────────────────────────

export type PoiCategory =
  | 'historical'
  | 'natural'
  | 'religious'
  | 'recreational'
  | 'accommodation'
  | 'restaurant'
  | 'service'
  | 'government';

export type PoiStatus = 'pending' | 'approved' | 'rejected';

export interface Poi {
  id: string;
  nameAr: string;
  nameEn: string | null;
  description: string | null;
  category: PoiCategory;
  location: { x: number; y: number }; // PostGIS point: x=lng, y=lat
  address: string | null;
  phone: string | null;
  website: string | null;
  images: string[] | null;
  ratingAvg: string | null;
  ratingCount: number;
  status: PoiStatus;
  submittedBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

// ── Carpool ────────────────────────────────────────────────────────────────

export type CarpoolRideStatus = 'open' | 'full' | 'departed' | 'completed' | 'cancelled';
export type PassengerStatus = 'requested' | 'confirmed' | 'declined' | 'cancelled';

export interface CarpoolRide {
  id: string;
  driverId: string;
  origin: { x: number; y: number };
  destination: { x: number; y: number };
  originName: string;
  destinationName: string;
  departureTime: string;
  seatsTotal: number;
  seatsTaken: number;
  pricePerSeat: number;
  notes: string | null;
  status: CarpoolRideStatus;
  createdAt: string;
}

export interface CarpoolPassenger {
  id: string;
  rideId: string;
  userId: string;
  seats: number;
  status: PassengerStatus;
  joinedAt: string;
}

export interface RideWithPassengers extends CarpoolRide {
  passengers?: CarpoolPassenger[];
}

export const mapAPI = {
  // ── POIs ──
  getPois: (params?: {
    page?: number;
    limit?: number;
    category?: PoiCategory;
    q?: string;
    lat?: number;
    lng?: number;
    radius?: number;
  }) => apiFetch<PaginatedResponse<Poi>>(`/map/pois${toQueryString(params)}`),

  getPoi: (id: string) => apiFetch<Poi>(`/map/pois/${id}`),

  suggestPoi: (body: {
    nameAr: string;
    nameEn?: string;
    description?: string;
    category: PoiCategory;
    location: { lat: number; lng: number };
    address?: string;
    phone?: string;
    website?: string;
    images?: string[];
  }) =>
    apiFetchWithRefresh<Poi>('/map/pois', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // ── Carpool ──
  getRides: (params?: {
    page?: number;
    limit?: number;
    originLat?: number;
    originLng?: number;
    destinationLat?: number;
    destinationLng?: number;
    radius?: number;
    date?: string;
  }) => apiFetch<PaginatedResponse<CarpoolRide>>(`/carpool${toQueryString(params)}`),

  getRide: (id: string) => apiFetch<RideWithPassengers>(`/carpool/${id}`),

  createRide: (body: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    originName: string;
    destinationName: string;
    departureTime: string;
    seatsTotal: number;
    pricePerSeat?: number;
    notes?: string;
  }) =>
    apiFetchWithRefresh<CarpoolRide>('/carpool', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  joinRide: (id: string, seats?: number) =>
    apiFetchWithRefresh<CarpoolPassenger>(`/carpool/${id}/join`, {
      method: 'POST',
      body: JSON.stringify({ seats: seats ?? 1 }),
    }),

  cancelJoin: (id: string) =>
    apiFetchWithRefresh<{ message: string }>(`/carpool/${id}/join`, { method: 'DELETE' }),

  cancelRide: (id: string) =>
    apiFetchWithRefresh<CarpoolRide>(`/carpool/${id}/cancel`, { method: 'PATCH' }),

  confirmPassenger: (rideId: string, passengerId: string) =>
    apiFetchWithRefresh<CarpoolPassenger>(`/carpool/${rideId}/passengers/${passengerId}/confirm`, {
      method: 'PATCH',
    }),

  declinePassenger: (rideId: string, passengerId: string) =>
    apiFetchWithRefresh<CarpoolPassenger>(`/carpool/${rideId}/passengers/${passengerId}/decline`, {
      method: 'PATCH',
    }),

  myRides: () =>
    apiFetchWithRefresh<{ asDriver: CarpoolRide[]; asPassenger: CarpoolPassenger[] }>(
      '/carpool/my',
    ),
};

// ── AI Chatbot ─────────────────────────────────────────────────────────────

export interface ChatSource {
  chunk_id: string;
  doc_id: string;
  section_title: string | null;
  relevance_score: number;
  text_snippet: string;
}

export interface ChatSession {
  session_id: string;
  user_id: string;
  created_at: string;
  language_preference: string;
  message_count: number;
  is_active: boolean;
  welcome_message: string;
}

export interface ChatMessageResponse {
  message_id: string;
  session_id: string;
  role: 'assistant';
  content: string;
  language: string;
  created_at: string;
  sources: ChatSource[];
  domain_relevant: boolean;
  latency_ms: number | null;
}

export interface ChatSessionMessage {
  message_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  language: string;
  created_at: string;
  sources: ChatSource[];
}

export interface ChatSessionView {
  session_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  message_count: number;
  messages: ChatSessionMessage[];
  pagination: {
    page: number;
    per_page: number;
    total_messages: number;
    total_pages: number;
  };
}

export interface LegacyChatResponse {
  response: string;
  conversation_id: string;
  sources: ChatSource[];
}

export const aiAPI = {
  createSession: (
    body?: { language_preference?: string; metadata?: Record<string, unknown> },
    forceNew = false,
  ) =>
    apiFetchWithRefresh<ChatSession>(`/chat/sessions${forceNew ? '?force_new=true' : ''}`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),

  getSession: (sessionId: string, page = 1, perPage = 20) =>
    apiFetchWithRefresh<ChatSessionView>(
      `/chat/sessions/${sessionId}?page=${page}&per_page=${perPage}`,
    ),

  sendMessage: (sessionId: string, body: { content: string; language?: string }) =>
    apiFetchWithRefresh<ChatMessageResponse>(`/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  closeSession: (sessionId: string) =>
    apiFetchWithRefresh<{
      session_id: string;
      closed: boolean;
      message_count: number;
      closed_at: string;
    }>(`/chat/sessions/${sessionId}`, { method: 'DELETE' }),

  // Deprecated compatibility adapter kept during migration.
  chat: (message: string, conversationId?: string) =>
    apiFetchWithRefresh<{ success: boolean; data: LegacyChatResponse }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversation_id: conversationId }),
    }),
};
