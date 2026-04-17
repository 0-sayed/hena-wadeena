/**
 * Hena Wadeena — API Service Layer
 * ==================================
 * Centralized API client for all backend communication.
 * Currently points to mock-server; switch BASE_URL for production.
 */

import {
  CommodityCategory,
  CommodityUnit,
  IncidentStatus as SharedIncidentStatus,
  IncidentType as SharedIncidentType,
  NvDistrict,
  PriceType,
  UserRole,
} from '@hena-wadeena/types';
import type {
  PaginatedResponse,
  NotificationListResponse,
  UnifiedSearchResponse,
  SearchResultType,
  WellLogDto,
  WellMonthlySummaryDto,
  SolarEstimateDto,
  NewsArticle,
  CreateNewsArticlePayload,
  UpdateNewsArticlePayload,
  ArtisanProfile,
  ArtisanProduct,
  ArtisanProfileWithProducts,
  WholesaleInquiry,
  QueryArtisansParams,
  QueryProductsParams,
  CreateArtisanProfilePayload,
  UpdateArtisanProfilePayload,
  CreateArtisanProductPayload,
  UpdateArtisanProductPayload,
  CreateWholesaleInquiryPayload,
  UpdateInquiryStatusPayload,
} from '@hena-wadeena/types';
import type {
  AttractionType,
  AttractionArea,
  BestSeason,
  BestTimeOfDay,
  Difficulty,
  JobCategory,
  JobStatus,
  ApplicationStatus,
  CompensationType,
} from '@/lib/format';
import { toQueryString } from '@/lib/query-string';
import { apiFetchRawWithRefresh, apiFetchWithRefresh } from './auth-manager';

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

async function buildApiError(response: Response): Promise<ApiError> {
  const error = (await response.json().catch(() => ({ message: 'Network error' }))) as Record<
    string,
    unknown
  >;
  const message =
    response.status === 429
      ? 'محاولات كثيرة جدًا، يُرجى الانتظار قليلًا'
      : ((error.detail as string) ?? (error.message as string) ?? `API Error ${response.status}`);
  return new ApiError(response.status, message, error);
}

function buildRequestHeaders(options?: RequestInit): Headers {
  const token = localStorage.getItem('access_token');
  const headers = new Headers(options?.headers);
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (
    !isFormData &&
    options?.body !== undefined &&
    options?.body !== null &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

// ── Generic fetch wrapper ───────────────────────────────────────────────────

export async function apiFetchRaw(endpoint: string, options?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: buildRequestHeaders(options),
  });
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await apiFetchRaw(endpoint, options);

  if (!res.ok) {
    throw await buildApiError(res);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
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
  phone: string | null;
  full_name: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  status: string;
  language: string;
}

export interface PublicUserProfile {
  id: string;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
}

interface AuthUserResponse {
  id: string;
  email: string;
  phone?: string | null;
  full_name?: string;
  fullName?: string;
  display_name?: string | null;
  displayName?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  role: UserRole | string;
  status?: string;
  language?: string;
}

function normalizeAuthUser(user: AuthUserResponse): AuthUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone ?? null,
    full_name: user.full_name ?? user.fullName ?? '',
    display_name: user.display_name ?? user.displayName ?? null,
    avatar_url: user.avatar_url ?? user.avatarUrl ?? null,
    role: user.role as UserRole,
    status: user.status ?? 'active',
    language: user.language ?? 'ar',
  };
}

interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUserResponse;
}

interface PendingKycAuthResponse {
  status: 'pending_kyc';
  kyc_session_token: string;
  required_documents: string[];
  user: AuthUserResponse;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export interface PendingKycAuth {
  status: 'pending_kyc';
  kyc_session_token: string;
  required_documents: string[];
  user: AuthUser;
}

export type AuthFlowResponse = AuthTokens | PendingKycAuth;

export interface AuthRefreshTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface RequestPasswordResetRequest {
  email: string;
}

export interface ConfirmPasswordResetRequest {
  email: string;
  otp: string;
  new_password: string;
}

export interface KycOnboardingSubmission {
  id: string;
  userId: string;
  docType: string;
  docUrl: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface KycOnboardingSessionResponse {
  user: AuthUserResponse;
  required_documents: string[];
  submissions: KycOnboardingSubmission[];
}

export interface KycOnboardingSession {
  user: AuthUser;
  required_documents: string[];
  submissions: KycOnboardingSubmission[];
}

export interface UpdateProfileRequest {
  full_name?: string;
  email?: string;
  phone?: string;
  display_name?: string;
  avatar_url?: string;
  language?: 'ar' | 'en';
}

function isPendingKycAuthResponse(
  response: AuthTokensResponse | PendingKycAuthResponse,
): response is PendingKycAuthResponse {
  return 'status' in response && response.status === 'pending_kyc';
}

function normalizeAuthFlowResponse(
  response: AuthTokensResponse | PendingKycAuthResponse,
): AuthFlowResponse {
  if (isPendingKycAuthResponse(response)) {
    return {
      status: 'pending_kyc',
      kyc_session_token: response.kyc_session_token,
      required_documents: response.required_documents,
      user: normalizeAuthUser(response.user),
    };
  }

  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    token_type: response.token_type,
    expires_in: response.expires_in,
    user: normalizeAuthUser(response.user),
  };
}

export const authAPI = {
  login: async (body: LoginRequest) => {
    const response = await apiFetch<AuthTokensResponse | PendingKycAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return normalizeAuthFlowResponse(response);
  },

  register: async (body: RegisterRequest) => {
    const response = await apiFetch<AuthTokensResponse | PendingKycAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return normalizeAuthFlowResponse(response);
  },

  refresh: (body: { refresh_token: string }) =>
    apiFetch<AuthRefreshTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMe: async () => normalizeAuthUser(await apiFetchWithRefresh<AuthUserResponse>('/auth/me')),

  updateMe: async (body: UpdateProfileRequest) =>
    normalizeAuthUser(
      await apiFetchWithRefresh<AuthUserResponse>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    ),

  changePassword: async (body: ChangePasswordRequest) => {
    const response = await apiFetchWithRefresh<AuthTokensResponse | PendingKycAuthResponse>(
      '/auth/change-password',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
    return normalizeAuthFlowResponse(response);
  },

  requestPasswordReset: (body: RequestPasswordResetRequest) =>
    apiFetch<{ message: string }>('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  confirmPasswordReset: async (body: ConfirmPasswordResetRequest) => {
    const response = await apiFetch<AuthTokensResponse | PendingKycAuthResponse>(
      '/auth/password-reset/confirm',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
    return normalizeAuthFlowResponse(response);
  },

  logout: (refresh_token?: string) =>
    apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token }) }),
};

export const kycOnboardingAPI = {
  getSession: async (kycSessionToken: string) => {
    const response = await apiFetch<KycOnboardingSessionResponse>('/auth/kyc/session', {
      headers: { Authorization: `Bearer ${kycSessionToken}` },
    });

    return {
      user: normalizeAuthUser(response.user),
      required_documents: response.required_documents,
      submissions: response.submissions,
    } satisfies KycOnboardingSession;
  },

  submitDocument: (kycSessionToken: string, body: { docType: string; docUrl: string }) =>
    apiFetch<KycOnboardingSubmission>('/auth/kyc/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${kycSessionToken}` },
      body: JSON.stringify(body),
    }),
};

export const usersAPI = {
  getPublicProfiles: (ids: string[]) =>
    apiFetch<PublicUserProfile[]>(
      `/users/public${toQueryString({ ids: ids.filter(Boolean).join(',') })}`,
    ),
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

export interface PriceHistoryEntry {
  date: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  sampleCount: number;
}

export interface PriceHistoryResponse {
  commodity: {
    id: string;
    nameAr: string;
    nameEn: string | null;
    unit: CommodityUnit;
  };
  data: PriceHistoryEntry[];
  period: '7d' | '30d' | '90d' | '1y';
  region: NvDistrict | null;
  priceType: PriceType | null;
}

export interface Commodity {
  id: string;
  nameAr: string;
  nameEn: string | null;
  category: CommodityCategory;
  unit: CommodityUnit;
  iconUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommodityLatestPrice {
  id: string;
  price: number;
  price_type: PriceType;
  region: NvDistrict;
  recorded_at: string;
}

export interface CommodityDetail extends Commodity {
  latestPricesByRegion: CommodityLatestPrice[];
}

export interface CommodityUpsertRequest {
  nameAr: string;
  nameEn?: string;
  category: CommodityCategory;
  unit: CommodityUnit;
  iconUrl?: string;
  sortOrder?: number;
}

export interface CommodityPriceUpsertRequest {
  commodityId: string;
  price: number;
  priceType: PriceType;
  region: NvDistrict;
  source?: string;
  notes?: string;
  recordedAt: string;
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
    q?: string;
    category?: string;
    region?: string;
    price_type?: string;
    limit?: number;
    offset?: number;
  }) => apiFetch<PaginatedResponse<PriceIndexEntry>>(`/price-index${toQueryString(params)}`),

  getSummary: () => apiFetch<PriceSummaryResponse>('/price-index/summary'),
};

export const commoditiesAPI = {
  getAll: (params?: { category?: CommodityCategory }) =>
    apiFetch<Commodity[]>(`/commodities${toQueryString(params)}`),
  getById: (id: string) => apiFetch<CommodityDetail>(`/commodities/${id}`),
  create: (body: CommodityUpsertRequest) =>
    apiFetchWithRefresh<Commodity>('/commodities', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<CommodityUpsertRequest>) =>
    apiFetchWithRefresh<Commodity>(`/commodities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deactivate: (id: string) =>
    apiFetchWithRefresh<Commodity>(`/commodities/${id}/deactivate`, {
      method: 'PATCH',
    }),
  getPriceHistory: (
    id: string,
    params?: { period?: '7d' | '30d' | '90d' | '1y'; region?: NvDistrict; price_type?: PriceType },
  ) => apiFetch<PriceHistoryResponse>(`/commodities/${id}/price-history${toQueryString(params)}`),
};

export const commodityPricesAPI = {
  create: (body: CommodityPriceUpsertRequest) =>
    apiFetchWithRefresh<Record<string, unknown>>('/commodity-prices', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<Omit<CommodityPriceUpsertRequest, 'commodityId'>>) =>
    apiFetchWithRefresh<Record<string, unknown>>(`/commodity-prices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id: string) =>
    apiFetchWithRefresh<void>(`/commodity-prices/${id}`, {
      method: 'DELETE',
    }),
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

export interface BusinessUpsertRequest {
  nameAr: string;
  nameEn?: string;
  category: string;
  description?: string;
  descriptionAr?: string;
  district: string;
  location?: { lat: number; lng: number };
  phone?: string;
  website?: string;
  logoUrl?: string;
  commodityIds?: string[];
}

export interface BusinessInquiry {
  id: string;
  businessId: string;
  businessName: string;
  businessOwnerId: string;
  senderId: string;
  receiverId: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  message: string;
  replyMessage: string | null;
  status: 'pending' | 'read' | 'replied';
  readAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatedBusinessInquiry {
  id: string;
  businessId: string;
  senderId: string;
  receiverId: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  message: string;
  replyMessage: string | null;
  status: 'pending' | 'read' | 'replied';
  readAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessInquiryRequest {
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  message: string;
}

export interface ReplyBusinessInquiryRequest {
  message: string;
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
  getMine: () => apiFetchWithRefresh<Business[]>('/businesses/mine'),
  create: (body: BusinessUpsertRequest) =>
    apiFetchWithRefresh<Business>('/businesses', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<BusinessUpsertRequest>) =>
    apiFetchWithRefresh<Business>(`/businesses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id: string) => apiFetchWithRefresh<void>(`/businesses/${id}`, { method: 'DELETE' }),
};

export const businessInquiriesAPI = {
  submit: (businessId: string, body: CreateBusinessInquiryRequest) =>
    apiFetchWithRefresh<CreatedBusinessInquiry>(`/businesses/${businessId}/inquiries`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getReceived: (params?: { status?: string; offset?: number; limit?: number }) =>
    apiFetchWithRefresh<PaginatedResponse<BusinessInquiry>>(
      `/business-inquiries/mine/received${toQueryString(params)}`,
    ),
  getSent: (params?: { status?: string; offset?: number; limit?: number }) =>
    apiFetchWithRefresh<PaginatedResponse<BusinessInquiry>>(
      `/business-inquiries/mine/sent${toQueryString(params)}`,
    ),
  markRead: (id: string) =>
    apiFetchWithRefresh<BusinessInquiry>(`/business-inquiries/${id}/read`, {
      method: 'PATCH',
    }),
  reply: (id: string, body: ReplyBusinessInquiryRequest) =>
    apiFetchWithRefresh<BusinessInquiry>(`/business-inquiries/${id}/reply`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
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
  priceRange: string | null;
  areaSqm: number | null;
  location: { x: number; y: number } | null;
  district: string | null;
  address: string | null;
  images: string[] | null;
  features: Record<string, unknown> | null;
  amenities: string[] | null;
  tags: string[] | null;
  contact: Record<string, unknown> | null;
  openingHours: string | null;
  slug: string;
  status: string;
  isVerified: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  featuredUntil: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  produceDetails?: ProduceDetailsResponse | null;
}

export interface ListingUpsertRequest {
  listingType: 'business' | 'real_estate' | 'land';
  transaction: 'sale' | 'rent';
  titleAr: string;
  titleEn?: string;
  description?: string;
  category: string;
  subCategory?: string;
  price: number;
  priceUnit?: string;
  priceRange?: string;
  areaSqm?: number;
  location?: { lat: number; lng: number };
  address?: string;
  district?: string;
  images?: string[];
  features?: Record<string, unknown>;
  amenities?: string[];
  tags?: string[];
  contact?: Record<string, unknown>;
  openingHours?: string;
  produce_details?: ProduceDetails;
}

export interface PriceAlertSubscription {
  id: string;
  commodityId: string;
  thresholdPrice: number; // piasters
  direction: 'above' | 'below';
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

export interface CreatePriceAlertRequest {
  commodityId: string;
  thresholdPrice: number; // piasters
  direction: 'above' | 'below';
}

export interface UpdatePriceAlertRequest {
  thresholdPrice?: number;
  direction?: 'above' | 'below';
}

export interface ProduceDetails {
  commodity_type: 'dates' | 'olives' | 'wheat' | 'other';
  storage_type: 'field' | 'warehouse' | 'cold_storage';
  preferred_buyer: 'any' | 'wholesaler' | 'exporter' | 'local';
  quantity_kg?: number;
  harvest_date?: string; // YYYY-MM-DD
  certifications?: Array<'organic' | 'gap' | 'other'>;
  contact_phone?: string;
  contact_whatsapp?: string;
}

// Camel-case shape returned by the NestJS API (response only)
export interface ProduceDetailsResponse {
  commodityType: 'dates' | 'olives' | 'wheat' | 'other';
  storageType: string;
  preferredBuyer: string;
  quantityKg?: string | null;
  harvestDate?: string | null;
  certifications?: string[];
  contactPhone?: string | null;
  contactWhatsapp?: string | null;
}

export interface ListingInquiry {
  id: string;
  listingId: string;
  listingTitle: string;
  listingOwnerId: string;
  senderId: string;
  receiverId: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  message: string;
  replyMessage: string | null;
  status: 'pending' | 'read' | 'replied';
  readAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingInquiryRequest {
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  message: string;
}

export interface ReplyListingInquiryRequest {
  message: string;
}

export const listingsAPI = {
  getAll: (params?: {
    category?: string;
    commodity_type?: string;
    district?: string;
    limit?: number;
    offset?: number;
    sort?: string;
    q?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.commodity_type) qs.set('commodity_type', params.commodity_type);
    if (params?.district) qs.set('area', params.district);
    if (params?.limit != null) qs.set('limit', String(params.limit));
    if (params?.offset != null) qs.set('offset', String(params.offset));
    if (params?.sort) qs.set('sort', params.sort);
    if (params?.q) qs.set('q', params.q);
    const query = qs.toString();
    return apiFetch<{
      data: Listing[];
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    }>(`/listings${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiFetch<Listing>(`/listings/${id}`),
  getMine: () => apiFetchWithRefresh<Listing[]>('/listings/mine'),
  create: (body: ListingUpsertRequest) =>
    apiFetchWithRefresh<Listing>('/listings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<ListingUpsertRequest>) =>
    apiFetchWithRefresh<Listing>(`/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id: string) =>
    apiFetchWithRefresh<void>(`/listings/${id}`, {
      method: 'DELETE',
    }),
};

export const listingInquiriesAPI = {
  submit: (listingId: string, body: CreateListingInquiryRequest) =>
    apiFetchWithRefresh<ListingInquiry>(`/listings/${listingId}/inquiries`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getReceived: (params?: { status?: string; offset?: number; limit?: number }) =>
    apiFetchWithRefresh<PaginatedResponse<ListingInquiry>>(
      `/listing-inquiries/mine/received${toQueryString(params)}`,
    ),
  getSent: (params?: { status?: string; offset?: number; limit?: number }) =>
    apiFetchWithRefresh<PaginatedResponse<ListingInquiry>>(
      `/listing-inquiries/mine/sent${toQueryString(params)}`,
    ),
  markRead: (id: string) =>
    apiFetchWithRefresh<ListingInquiry>(`/listing-inquiries/${id}/read`, {
      method: 'PATCH',
    }),
  reply: (id: string, body: ReplyListingInquiryRequest) =>
    apiFetchWithRefresh<ListingInquiry>(`/listing-inquiries/${id}/reply`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

export const priceAlertsAPI = {
  list: () => apiFetchWithRefresh<PriceAlertSubscription[]>('/price-alerts'),
  create: (body: CreatePriceAlertRequest) =>
    apiFetchWithRefresh<PriceAlertSubscription>('/price-alerts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: UpdatePriceAlertRequest) =>
    apiFetchWithRefresh<PriceAlertSubscription>(`/price-alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id: string) => apiFetchWithRefresh<void>(`/price-alerts/${id}`, { method: 'DELETE' }),
};

// ── Investment ──────────────────────────────────────────────────────────────

export interface Opportunity {
  id: string;
  ownerId?: string;
  titleAr: string;
  titleEn: string | null;
  description?: string | null;
  sector: string;
  area: string;
  location?: { x: number; y: number } | null;
  landAreaSqm?: number | null;
  minInvestment: number;
  maxInvestment: number;
  currency: string;
  expectedReturnPct: number;
  paybackPeriodYears: number;
  incentives: string[];
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    website?: string;
  } | null;
  documents?: string[] | null;
  status: string;
  images: string[];
  interestCount?: number;
  isVerified?: boolean;
  isFeatured?: boolean;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type Startup = BusinessEntry;

export const investmentAPI = {
  getOpportunities: () => apiFetchWithRefresh<PaginatedResponse<Opportunity>>('/investments'),

  getOpportunity: (id: string) => apiFetchWithRefresh<Opportunity>(`/investments/${id}`),

  getMine: () => apiFetchWithRefresh<Opportunity[]>('/investments/mine'),

  getBusinesses: () => apiFetchWithRefresh<PaginatedResponse<Startup>>('/businesses'),
};

export interface InvestmentApplication {
  id: string;
  opportunityId: string;
  investorId: string;
  amountProposed: number | null;
  message: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  documents: string[] | null;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: string;
}

export interface SubmitInvestmentInterestRequest {
  message?: string;
  contactEmail: string;
  contactPhone?: string;
  amountProposed?: number;
}

export const investmentApplicationsAPI = {
  submitInterest: (opportunityId: string, body: SubmitInvestmentInterestRequest) =>
    apiFetchWithRefresh<InvestmentApplication>(`/investments/${opportunityId}/interest`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getMine: (params?: { status?: string; offset?: number; limit?: number }) =>
    apiFetchWithRefresh<PaginatedResponse<InvestmentApplication>>(
      `/investments/mine/interests${toQueryString(params)}`,
    ),
  getByOpportunity: (
    opportunityId: string,
    params?: { status?: string; offset?: number; limit?: number },
  ) =>
    apiFetchWithRefresh<PaginatedResponse<InvestmentApplication>>(
      `/investments/${opportunityId}/interests${toQueryString(params)}`,
    ),
};

// ── Guides ──────────────────────────────────────────────────────────────────

export interface GuideListItem {
  id: string;
  userId: string;
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

export interface MyGuideProfileRequest {
  licenseNumber: string;
  basePrice: number;
  bioAr?: string;
  bioEn?: string;
  languages?: string[];
  specialties?: string[];
  profileImage?: string;
  coverImage?: string;
  areasOfOperation?: string[];
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

export const myGuideAPI = {
  get: () => apiFetchWithRefresh<GuideDetail>('/my/guide-profile'),
  create: (body: MyGuideProfileRequest) =>
    apiFetchWithRefresh<GuideDetail>('/my/guide-profile', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (body: Partial<MyGuideProfileRequest>) =>
    apiFetchWithRefresh<GuideDetail>('/my/guide-profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
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

export interface MyPackageUpsertRequest {
  titleAr: string;
  titleEn?: string;
  description?: string;
  durationHours: number;
  maxPeople: number;
  price: number;
  includes?: string[];
  images?: string[];
  attractionIds?: string[];
}

export const myPackagesAPI = {
  getAll: (params?: { status?: 'active' | 'inactive'; page?: number; limit?: number }) =>
    apiFetchWithRefresh<PaginatedResponse<GuidePackageListItem>>(
      `/my/packages${toQueryString(params)}`,
    ),
  create: (body: MyPackageUpsertRequest) =>
    apiFetchWithRefresh<GuidePackageListItem>('/my/packages', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<MyPackageUpsertRequest>) =>
    apiFetchWithRefresh<GuidePackageListItem>(`/my/packages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id: string) =>
    apiFetchWithRefresh<void>(`/my/packages/${id}`, {
      method: 'DELETE',
    }),
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

// ── Reviews ────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  bookingId: string;
  guideId: string;
  reviewerId: string;
  rating: number; // 1–5
  comment: string | null;
  guideReply: string | null;
  helpfulCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const reviewsAPI = {
  // GET /api/v1/guides/:id/reviews — public, paginated
  getGuideReviews: (guideId: string, params?: { offset?: number; limit?: number; sort?: string }) =>
    apiFetch<PaginatedResponse<Review>>(`/guides/${guideId}/reviews${toQueryString(params)}`),

  // POST /api/v1/guide-reviews — auth required, tourist only
  createReview: (body: { bookingId: string; rating: number; comment: string }) =>
    apiFetchWithRefresh<Review>('/guide-reviews', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // GET /api/v1/guide-reviews/mine — auth required
  getMyReviews: (params?: { offset?: number; limit?: number }) =>
    apiFetchWithRefresh<PaginatedResponse<Review>>(`/guide-reviews/mine${toQueryString(params)}`),

  // POST /api/v1/guide-reviews/:id/helpful — auth required
  markHelpful: (reviewId: string) =>
    apiFetchWithRefresh<Review>(`/guide-reviews/${reviewId}/helpful`, { method: 'POST' }),
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
  balance_after: number | null;
  description: string;
  status: string;
  created_at: string;
  reference_type?: string;
  reference_id?: string;
}

export const paymentsAPI = {
  getWallet: () => apiFetchWithRefresh<{ success: boolean; data: Wallet }>('/wallet'),
  topUp: (amount: number) =>
    apiFetchWithRefresh<{ success: boolean; data: { balance: number } }>('/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  deduct: (data: {
    amount: number;
    description?: string;
    reference_id?: string;
    reference_type?: string;
  }) =>
    apiFetchWithRefresh<{ success: boolean; data: { balance: number } }>('/wallet/deduct', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
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

export const searchAPI = {
  search: (q: string, type?: SearchResultType) =>
    apiFetchWithRefresh<UnifiedSearchResponse>(
      `/search?q=${encodeURIComponent(q.trim())}${type ? `&type=${type}` : ''}`,
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
  | 'government'
  | 'solar_installation';

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

export interface PoiWithStatus {
  id: string;
  nameAr: string;
  nameEn: string | null;
  category: string;
  location: { x: number; y: number }; // PostGIS point: x=lng, y=lat
  status: string | null;
  statusNoteAr: string | null;
  statusNoteEn: string | null;
  validUntil: string | null;
  statusUpdatedAt: string | null;
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

export type IncidentType = `${SharedIncidentType}`;
export type IncidentStatus = `${SharedIncidentStatus}`;

export interface EnvironmentalIncident {
  id: string;
  reporterId: string;
  incidentType: IncidentType;
  status: IncidentStatus;
  location: { x: number; y: number };
  descriptionAr: string | null;
  descriptionEn: string | null;
  photos: string[];
  eeaaReference: string | null;
  adminNotes: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const incidentsAPI = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: IncidentStatus;
    incidentType?: IncidentType;
  }) =>
    apiFetch<PaginatedResponse<EnvironmentalIncident>>(
      `/map/environmental-incidents${toQueryString(params)}`,
    ),

  report: (body: {
    incidentType: IncidentType;
    latitude: number;
    longitude: number;
    descriptionAr?: string;
    descriptionEn?: string;
    photos?: string[];
  }) =>
    apiFetchWithRefresh<EnvironmentalIncident>('/map/environmental-incidents', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  myIncidents: (params?: { page?: number; limit?: number }) =>
    apiFetchWithRefresh<PaginatedResponse<EnvironmentalIncident>>(
      `/map/environmental-incidents/my${toQueryString(params)}`,
    ),

  adminList: (params?: {
    page?: number;
    limit?: number;
    status?: IncidentStatus;
    incidentType?: IncidentType;
  }) =>
    apiFetchWithRefresh<PaginatedResponse<EnvironmentalIncident>>(
      `/admin/map/environmental-incidents${toQueryString(params)}`,
    ),

  adminGet: (id: string) =>
    apiFetchWithRefresh<EnvironmentalIncident>(`/admin/map/environmental-incidents/${id}`),

  adminUpdate: (
    id: string,
    body: { status?: IncidentStatus; adminNotes?: string; eeaaReference?: string },
  ) =>
    apiFetchWithRefresh<EnvironmentalIncident>(`/admin/map/environmental-incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getUploadUrl: (body: { filename: string; contentType: string }) =>
    apiFetchWithRefresh<{ uploadUrl: string; key: string }>(
      '/map/environmental-incidents/upload-url',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),
};

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

  activateRide: (id: string) =>
    apiFetchWithRefresh<CarpoolRide>(`/carpool/${id}/activate`, { method: 'PATCH' }),

  deleteRide: (id: string) =>
    apiFetchWithRefresh<{ deleted: true; id: string }>(`/carpool/${id}`, { method: 'DELETE' }),

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

  getStatusBoard: (page = 1, limit = 12, search?: string, status?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return apiFetch<PaginatedResponse<PoiWithStatus>>(
      `/map/sites/status-board?${params.toString()}`,
    );
  },
};

// ── Admin ───────────────────────────────────────────────────────────────────

export interface AdminStatsResponse {
  users: {
    total: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    newLast30Days: number;
  };
  kyc: {
    total: number;
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
  };
  listings: {
    total: number;
    verified: number;
    unverified: number;
    featured: number;
    byStatus: Record<string, number>;
  };
  investments: {
    total: number;
    verified: number;
    byStatus: Record<string, number>;
    totalApplications: number;
  };
  reviews: {
    listings: { total: number; averageRating: number };
    guides: { total: number; averageRating: number };
  };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  guides: { total: number; verified: number; active: number };
  packages: { total: number; active: number };
  pois: { total: number; approved: number; pending: number; rejected: number };
  carpoolRides: {
    total: number;
    open: number;
    full: number;
    departed: number;
    completed: number;
    cancelled: number;
  };
  meta: { sources: string[]; degraded: boolean; cachedAt: string };
}

export interface AdminUser {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: 'active' | 'pending_kyc' | 'suspended' | 'banned';
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditEvent {
  id: string;
  eventType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUser {
  verifiedAt: string | null;
  lastLoginAt: string | null;
  kycStatus: 'pending' | 'under_review' | 'approved' | 'rejected' | null;
  latestKycDocumentType: string | null;
  kycSubmittedAt: string | null;
  kycReviewedAt: string | null;
  recentAuditEvents: AdminAuditEvent[];
}

export interface AdminResetPasswordResponse {
  password: string;
}

export interface KycSubmission {
  id: string;
  userId: string;
  fullName: string;
  documentType: string;
  documentUrl: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  notes: string | null;
}

export interface AdminUserFilters {
  role?: UserRole;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminKycFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export interface AdminListingFilters {
  page?: number;
  limit?: number;
  status?: 'draft' | 'active' | 'suspended';
  is_verified?: boolean;
  owner_id?: string;
  category?: string;
  category_ne?: string;
  sort?: 'created_at|asc' | 'created_at|desc' | 'price|asc' | 'price|desc';
}

export interface AdminGuideFilters {
  status?: string;
  verified?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminBookingFilters {
  status?: string;
  guideId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface AiKnowledgeDocument {
  doc_id: string;
  batch_id: string | null;
  filename: string;
  source_type: string;
  title: string | null;
  language: string;
  total_pages: number;
  total_chunks: number;
  file_size_kb: number;
  uploaded_at: string;
  indexed_at: string | null;
  status: string;
  tags: string[];
  description: string | null;
  current_step: string | null;
  error_detail: string | null;
}

export interface AiKnowledgeDocumentListResponse {
  documents: AiKnowledgeDocument[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
  };
}

export interface AiKnowledgeBatchItem {
  doc_id: string;
  filename: string;
  status: string;
  current_step: string | null;
  error_detail: string | null;
  total_pages: number;
  total_chunks: number;
  language: string | null;
  indexed_at: string | null;
}

export interface AiKnowledgeBatchResponse {
  batch_id: string;
  status: string;
  total_files: number;
  pending_files: number;
  processing_files: number;
  indexed_files: number;
  failed_files: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  items: AiKnowledgeBatchItem[];
}

export interface AiKnowledgeDeleteResponse {
  doc_id: string;
  deleted: boolean;
  qdrant_points_deleted: number;
  mongo_chunks_deleted: number;
  mongo_document_deleted: boolean;
  deleted_at: string;
}

export interface AiKnowledgeUploadRequest {
  files: File[];
  title?: string;
  description?: string;
  tags?: string[];
  language?: string;
}

export interface AiCuratedKnowledgeEntry {
  slug: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  language: string;
}

export interface AiCuratedKnowledgeComposeRequest {
  text: string;
  language?: string;
}

export interface AiCuratedKnowledgeComposeResponse {
  strategy: string;
  entries: AiCuratedKnowledgeEntry[];
}

export interface AiCuratedKnowledgeFeedRequest {
  entries: AiCuratedKnowledgeEntry[];
}

export interface AiCuratedKnowledgeFeedItem {
  slug: string;
  title: string;
  status: string;
  filename: string | null;
  doc_id: string | null;
  indexed_at: string | null;
  total_chunks: number;
  error_detail: string | null;
}

export interface AiCuratedKnowledgeFeedResponse {
  total_entries: number;
  indexed_entries: number;
  failed_entries: number;
  items: AiCuratedKnowledgeFeedItem[];
}

function buildAiKnowledgeUploadFormData(body: AiKnowledgeUploadRequest): FormData {
  const formData = new FormData();

  for (const file of body.files) {
    formData.append('files', file);
  }

  if (body.title) {
    formData.append('title', body.title);
  }

  if (body.description) {
    formData.append('description', body.description);
  }

  if (body.tags && body.tags.length > 0) {
    formData.append('tags', body.tags.join(','));
  }

  formData.append('language', body.language ?? 'auto');
  return formData;
}

export const adminAPI = {
  // Stats
  getStats: () => apiFetchWithRefresh<AdminStatsResponse>('/admin/stats'),

  // Listings management
  getListings: (params?: AdminListingFilters) =>
    apiFetchWithRefresh<PaginatedResponse<Listing>>(
      `/admin/listings${toQueryString({
        status: params?.status,
        is_verified: params?.is_verified,
        owner_id: params?.owner_id,
        category: params?.category,
        category_ne: params?.category_ne,
        sort: params?.sort,
        offset: ((params?.page ?? 1) - 1) * (params?.limit ?? 20),
        limit: params?.limit,
      })}`,
    ),

  // Users
  getUsers: (params?: AdminUserFilters) =>
    apiFetchWithRefresh<PaginatedResponse<AdminUser>>(`/admin/users${toQueryString(params)}`),
  getUser: (id: string) => apiFetchWithRefresh<AdminUserDetail>(`/admin/users/${id}`),
  changeUserRole: (id: string, role: UserRole) =>
    apiFetchWithRefresh<AdminUser>(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  changeUserStatus: (id: string, status: string, reason?: string) =>
    apiFetchWithRefresh<AdminUser>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }),
  deleteUser: (id: string) => apiFetchWithRefresh<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  resetUserPassword: (id: string) =>
    apiFetchWithRefresh<AdminResetPasswordResponse>(`/admin/users/${id}/reset-password`, {
      method: 'POST',
    }),

  // KYC
  getKycSubmissions: (params?: AdminKycFilters) =>
    apiFetchWithRefresh<PaginatedResponse<KycSubmission>>(`/admin/kyc${toQueryString(params)}`),
  reviewKyc: (id: string, status: 'approved' | 'rejected', rejectionReason?: string) =>
    apiFetchWithRefresh<KycSubmission>(`/admin/kyc/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejectionReason }),
    }),

  // Listings moderation
  getPendingListings: (params?: { page?: number; limit?: number }) =>
    apiFetchWithRefresh<PaginatedResponse<Listing>>(
      `/admin/listings${toQueryString({
        is_verified: 'false',
        offset: ((params?.page ?? 1) - 1) * (params?.limit ?? 20),
        limit: params?.limit,
      })}`,
    ),
  verifyListing: (id: string, approved: boolean, notes?: string) =>
    apiFetchWithRefresh<Listing>(`/admin/listings/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ action: approved ? 'approve' : 'reject', reason: notes }),
    }),

  // Businesses moderation
  getPendingBusinesses: (params?: { page?: number; limit?: number }) =>
    apiFetchWithRefresh<PaginatedResponse<Business>>(`/businesses/pending${toQueryString(params)}`),
  verifyBusiness: (id: string, approved: boolean, rejectionReason?: string) =>
    apiFetchWithRefresh<Business>(`/businesses/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status: approved ? 'verified' : 'rejected', rejectionReason }),
    }),

  // Guides
  getGuides: (params?: AdminGuideFilters) =>
    apiFetchWithRefresh<PaginatedResponse<GuideDetail>>(`/admin/guides${toQueryString(params)}`),
  setGuideStatus: (id: string, active: boolean) =>
    apiFetchWithRefresh<GuideDetail>(`/admin/guides/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),
  verifyGuideLicense: (id: string, verified: boolean) =>
    apiFetchWithRefresh<GuideDetail>(`/admin/guides/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ verified }),
    }),

  // Bookings (admin view)
  getBookings: (params?: AdminBookingFilters) =>
    apiFetchWithRefresh<PaginatedResponse<Booking>>(`/admin/bookings${toQueryString(params)}`),
  cancelBooking: (id: string, reason: string) =>
    apiFetchWithRefresh<Booking>(`/admin/bookings/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ cancelReason: reason }),
    }),

  // POIs
  getPendingPois: (params?: { page?: number; limit?: number }) =>
    apiFetchWithRefresh<PaginatedResponse<Poi>>(
      `/map/admin/pois${toQueryString({ ...params, status: 'pending' })}`,
    ),
  approvePoi: (id: string) =>
    apiFetchWithRefresh<Poi>(`/map/admin/pois/${id}/approve`, { method: 'PATCH' }),
  rejectPoi: (id: string, reason?: string) =>
    apiFetchWithRefresh<Poi>(`/map/admin/pois/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
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

interface ChatStreamTokenEvent {
  type: 'token';
  delta: string;
}

interface ChatStreamStatusEvent {
  type: 'status';
  phase: string;
  message?: string;
}

interface ChatStreamCompleteEvent {
  type: 'complete';
  message: ChatMessageResponse;
}

interface ChatStreamErrorEvent {
  type: 'error';
  message: string;
}

type ChatStreamEvent =
  | ChatStreamStatusEvent
  | ChatStreamTokenEvent
  | ChatStreamCompleteEvent
  | ChatStreamErrorEvent;

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

async function consumeChatStream(
  response: Response,
  handlers: {
    onStatus?: (phase: string, message?: string) => void;
    onToken: (delta: string) => void;
    onComplete: (message: ChatMessageResponse) => void;
    onError?: (message: string) => void;
  },
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Streaming is not supported in this browser.');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  const handleEvent = (event: ChatStreamEvent) => {
    if (event.type === 'status') {
      handlers.onStatus?.(event.phase, event.message);
      return;
    }

    if (event.type === 'token') {
      handlers.onToken(event.delta);
      return;
    }

    if (event.type === 'complete') {
      handlers.onComplete(event.message);
      return;
    }

    handlers.onError?.(event.message);
    throw new Error(event.message);
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (line) {
        handleEvent(JSON.parse(line) as ChatStreamEvent);
      }

      newlineIndex = buffer.indexOf('\n');
    }

    if (done) {
      break;
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    handleEvent(JSON.parse(trailing) as ChatStreamEvent);
  }
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

  streamMessage: async (
    sessionId: string,
    body: { content: string; language?: string },
    handlers: {
      onStatus?: (phase: string, message?: string) => void;
      onToken: (delta: string) => void;
      onComplete: (message: ChatMessageResponse) => void;
      onError?: (message: string) => void;
    },
    options?: { signal?: AbortSignal },
  ) => {
    const response = await apiFetchRawWithRefresh(`/chat/sessions/${sessionId}/messages/stream`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { Accept: 'application/x-ndjson' },
      signal: options?.signal,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    await consumeChatStream(response, handlers);
  },

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

// ── Benefits ─────────────────────────────────────────────────────────────────

export const aiKnowledgeAPI = {
  listDocuments: (params?: {
    page?: number;
    per_page?: number;
    status?: string;
    language?: string;
    tags?: string;
  }) => apiFetchWithRefresh<AiKnowledgeDocumentListResponse>(`/documents${toQueryString(params)}`),

  uploadDocuments: (body: AiKnowledgeUploadRequest) =>
    apiFetchWithRefresh<AiKnowledgeBatchResponse>('/documents/inject', {
      method: 'POST',
      body: buildAiKnowledgeUploadFormData(body),
    }),

  getBatchStatus: (batchId: string) =>
    apiFetchWithRefresh<AiKnowledgeBatchResponse>(`/documents/batches/${batchId}`),

  deleteDocument: (docId: string) =>
    apiFetchWithRefresh<AiKnowledgeDeleteResponse>(`/documents/${docId}`, {
      method: 'DELETE',
    }),

  composeCuratedText: (body: AiCuratedKnowledgeComposeRequest) =>
    apiFetchWithRefresh<AiCuratedKnowledgeComposeResponse>('/documents/curated/compose', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  feedCuratedText: (body: AiCuratedKnowledgeFeedRequest) =>
    apiFetchWithRefresh<AiCuratedKnowledgeFeedResponse>('/documents/curated/feed', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export interface BenefitInfo {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  ministryAr: string;
  documentsAr: string[];
  officeNameAr: string;
  officePhone: string;
  officeAddressAr: string;
  enrollmentNotesAr: string;
  enrollmentNotesEn?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateBenefitBody = Omit<BenefitInfo, 'id' | 'createdAt' | 'updatedAt'>;

export const benefitsAPI = {
  list: () => apiFetch<BenefitInfo[]>('/benefits'),
  getBySlug: (slug: string) => apiFetch<BenefitInfo>(`/benefits/${slug}`),
  create: (body: CreateBenefitBody) =>
    apiFetchWithRefresh<BenefitInfo>('/benefits', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (
    slug: string,
    body: Partial<Omit<BenefitInfo, 'id' | 'slug' | 'createdAt' | 'updatedAt'>>,
  ) =>
    apiFetchWithRefresh<BenefitInfo>(`/benefits/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  delete: (slug: string) => apiFetchWithRefresh<void>(`/benefits/${slug}`, { method: 'DELETE' }),
};

// ── Employment Board ────────────────────────────────────────────────────────

export type ReviewDirection = 'worker_rates_poster' | 'poster_rates_worker';

export interface JobPost {
  id: string;
  posterId: string;
  title: string;
  descriptionAr: string;
  descriptionEn: string | null;
  category: JobCategory;
  area: string;
  compensation: number; // piasters
  compensationType: CompensationType;
  slots: number;
  status: JobStatus;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  applicantId: string;
  noteAr: string | null;
  status: ApplicationStatus;
  appliedAt: string;
  resolvedAt: string | null;
  jobTitle?: string;
}

export interface JobReview {
  id: string;
  jobId: string;
  applicationId: string;
  reviewerId: string;
  revieweeId: string;
  direction: ReviewDirection;
  rating: number; // 1–5
  comment: string | null;
  createdAt: string;
}

export const jobsAPI = {
  getAll: (params?: {
    category?: string;
    area?: string;
    compensationType?: string;
    offset?: number;
    limit?: number;
  }) => apiFetch<PaginatedResponse<JobPost>>(`/jobs${toQueryString(params)}`),

  getById: (id: string) => apiFetch<JobPost>(`/jobs/${id}`),

  create: (body: {
    title: string;
    descriptionAr: string;
    descriptionEn?: string;
    category: JobCategory;
    area: string;
    compensation: number;
    compensationType: CompensationType;
    slots?: number;
    startsAt?: string;
    endsAt?: string;
  }) => apiFetchWithRefresh<JobPost>('/jobs', { method: 'POST', body: JSON.stringify(body) }),

  apply: (jobId: string, body: { noteAr?: string }) =>
    apiFetchWithRefresh<JobApplication>(`/jobs/${jobId}/apply`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getApplications: (jobId: string) =>
    apiFetchWithRefresh<PaginatedResponse<JobApplication>>(`/jobs/${jobId}/applications`),

  updateApplication: (jobId: string, appId: string, body: { status: ApplicationStatus }) =>
    apiFetchWithRefresh<JobApplication>(`/jobs/${jobId}/applications/${appId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  withdrawApplication: (jobId: string, appId: string) =>
    apiFetchWithRefresh<void>(`/jobs/${jobId}/applications/${appId}`, { method: 'DELETE' }),

  submitReview: (
    jobId: string,
    appId: string,
    body: { direction: string; rating: number; comment?: string },
  ) =>
    apiFetchWithRefresh<JobReview>(`/jobs/${jobId}/applications/${appId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getUserReviews: (userId: string, role?: 'reviewer' | 'reviewee') =>
    apiFetch<PaginatedResponse<JobReview>>(
      `/users/${userId}/job-reviews${role ? `?role=${role}` : ''}`,
    ),

  getMyApplications: () =>
    apiFetchWithRefresh<PaginatedResponse<JobApplication>>('/jobs/my-applications'),

  getMyPosts: () => apiFetchWithRefresh<PaginatedResponse<JobPost>>('/jobs/my-posts'),

  updateJob: (
    id: string,
    body: Partial<{
      title: string;
      descriptionAr: string;
      descriptionEn: string;
      category: JobCategory;
      area: string;
      compensation: number;
      compensationType: CompensationType;
      slots: number;
      status: JobStatus;
      startsAt: string;
      endsAt: string;
    }>,
  ) =>
    apiFetchWithRefresh<JobPost>(`/jobs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteJob: (id: string) => apiFetchWithRefresh<void>(`/jobs/${id}`, { method: 'DELETE' }),
};

// ── News ────────────────────────────────────────────────────────────────────

export const newsAPI = {
  getList: (params?: { category?: string; offset?: number; limit?: number }) =>
    apiFetch<PaginatedResponse<NewsArticle>>(`/news${toQueryString(params)}`),

  getBySlug: (slug: string) => apiFetch<NewsArticle>(`/news/${slug}`),

  adminGetList: (params?: { category?: string; offset?: number; limit?: number }) =>
    apiFetchWithRefresh<PaginatedResponse<NewsArticle>>(`/admin/news${toQueryString(params)}`),

  adminCreate: (body: CreateNewsArticlePayload) =>
    apiFetchWithRefresh<NewsArticle>('/admin/news', { method: 'POST', body: JSON.stringify(body) }),

  adminUpdate: (id: string, body: UpdateNewsArticlePayload) =>
    apiFetchWithRefresh<NewsArticle>(`/admin/news/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  adminPublish: (id: string) =>
    apiFetchWithRefresh<NewsArticle>(`/admin/news/${id}/publish`, { method: 'PATCH' }),

  adminDelete: (id: string) => apiFetchWithRefresh<void>(`/admin/news/${id}`, { method: 'DELETE' }),

  adminUploadImage: (body: { filename: string; contentType: string }) =>
    apiFetchWithRefresh<{ uploadUrl: string; key: string }>('/admin/news/upload-image', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── Desert Trips (Guide Safety) ─────────────────────────────────────────────

export type DesertTripStatus = 'pending' | 'checked_in' | 'overdue' | 'alert_sent' | 'resolved';

export interface DesertTrip {
  id: string;
  bookingId: string;
  guideId: string;
  destinationName: string;
  emergencyContact: string;
  expectedArrivalAt: string;
  rangerStationName: string | null;
  status: DesertTripStatus;
  checkedInAt: string | null;
  alertTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterDesertTripRequest {
  destinationName: string;
  emergencyContact: string;
  expectedArrivalAt: string;
  rangerStationName?: string;
}

export const desertTripsAPI = {
  getByBooking: (bookingId: string) =>
    apiFetchWithRefresh<DesertTrip>(`/bookings/${bookingId}/desert-trip`),

  register: (bookingId: string, body: RegisterDesertTripRequest) =>
    apiFetchWithRefresh<DesertTrip>(`/bookings/${bookingId}/desert-trip`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  checkIn: (bookingId: string) =>
    apiFetchWithRefresh<DesertTrip>(`/bookings/${bookingId}/desert-trip/check-in`, {
      method: 'POST',
    }),
};

// ── Well Logs ─────────────────────────────────────────────────────────────────

export interface WellLogCreateRequest {
  area: NvDistrict;
  pump_hours: number;
  kwh_consumed: number;
  cost_piasters: number;
  water_m3_est?: number;
  depth_to_water_m?: number;
  logged_at: string; // ISO date YYYY-MM-DD
}

export const wellLogsAPI = {
  create: (body: WellLogCreateRequest) =>
    apiFetchWithRefresh<WellLogDto>('/well-logs', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getSummary: () =>
    apiFetchWithRefresh<{ months: WellMonthlySummaryDto[]; solar: SolarEstimateDto | null }>(
      '/well-logs/summary',
    ),
};

// ── Artisan Market ────────────────────────────────────────────────────────────

export type {
  ArtisanProfile,
  ArtisanProduct,
  ArtisanProfileWithProducts,
  WholesaleInquiry,
  CraftType,
  ArtisanArea,
  WholesaleInquiryStatus,
} from '@hena-wadeena/types';

export type ListArtisansParams = QueryArtisansParams;
export type ListProductsParams = QueryProductsParams;
export type CreateArtisanProfileRequest = CreateArtisanProfilePayload;
export type UpdateArtisanProfileRequest = UpdateArtisanProfilePayload;
export type CreateArtisanProductRequest = CreateArtisanProductPayload;
export type UpdateArtisanProductRequest = UpdateArtisanProductPayload;
export type SubmitInquiryRequest = CreateWholesaleInquiryPayload;
export type UpdateInquiryStatusRequest = UpdateInquiryStatusPayload;

export const artisansAPI = {
  // Public
  list: (params?: ListArtisansParams) => apiFetch<PaginatedResponse<ArtisanProfile>>(`/artisans${toQueryString(params ?? {})}`),

  getById: (id: string) => apiFetch<ArtisanProfileWithProducts>(`/artisans/${id}`),

  getProducts: (artisanId: string, params?: ListProductsParams) =>
    apiFetch<PaginatedResponse<ArtisanProduct>>(`/artisans/${artisanId}/products${toQueryString(params ?? {})}`),

  getProduct: (productId: string) =>
    apiFetch<ArtisanProduct & { artisan: ArtisanProfile }>(`/artisans/products/${productId}`),

  submitInquiry: (productId: string, body: SubmitInquiryRequest) =>
    apiFetchWithRefresh<WholesaleInquiry>(`/artisans/products/${productId}/inquiries`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Authenticated artisan
  getMyProfile: () => apiFetchWithRefresh<ArtisanProfile>('/artisans/profile/me'),

  createProfile: (body: CreateArtisanProfileRequest) =>
    apiFetchWithRefresh<ArtisanProfile>('/artisans/profile', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateMyProfile: (body: UpdateArtisanProfileRequest) =>
    apiFetchWithRefresh<ArtisanProfile>('/artisans/profile/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  listMyProducts: (params?: ListProductsParams) =>
    apiFetchWithRefresh<PaginatedResponse<ArtisanProduct>>(
      `/artisans/my-products${toQueryString(params ?? {})}`,
    ),

  createProduct: (body: CreateArtisanProductRequest) =>
    apiFetchWithRefresh<ArtisanProduct>('/artisans/products', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateProduct: (productId: string, body: UpdateArtisanProductRequest) =>
    apiFetchWithRefresh<ArtisanProduct>(`/artisans/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteProduct: (productId: string) =>
    apiFetchWithRefresh<void>(`/artisans/products/${productId}`, { method: 'DELETE' }),

  listMyInquiries: () => apiFetchWithRefresh<WholesaleInquiry[]>('/artisans/inquiries'),

  updateInquiryStatus: (inquiryId: string, body: UpdateInquiryStatusRequest) =>
    apiFetchWithRefresh<WholesaleInquiry>(`/artisans/inquiries/${inquiryId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // Admin
  adminList: (params?: ListArtisansParams) =>
    apiFetchWithRefresh<PaginatedResponse<ArtisanProfile>>(
      `/admin/artisans${toQueryString(params ?? {})}`,
    ),

  adminVerify: (id: string) =>
    apiFetchWithRefresh<ArtisanProfile>(`/admin/artisans/${id}/verify`, { method: 'PATCH' }),

  adminDelete: (id: string) =>
    apiFetchWithRefresh<void>(`/admin/artisans/${id}`, { method: 'DELETE' }),
};

// ── Re-exports from @hena-wadeena/types ─────────────────────────────────────

export type { PaginatedResponse } from '@hena-wadeena/types';
