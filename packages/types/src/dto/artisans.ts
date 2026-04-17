export const CRAFT_TYPES = ['palm_leaf', 'pottery', 'kilim', 'embroidery', 'other'] as const;
export type CraftType = (typeof CRAFT_TYPES)[number];

export const ARTISAN_AREAS = ['kharga', 'dakhla', 'farafra', 'baris', 'balat'] as const;
export type ArtisanArea = (typeof ARTISAN_AREAS)[number];

export const WHOLESALE_INQUIRY_STATUSES = ['pending', 'read', 'replied'] as const;
export type WholesaleInquiryStatus = (typeof WHOLESALE_INQUIRY_STATUSES)[number];

export interface ArtisanProfile {
  id: string;
  userId: string;
  nameAr: string;
  nameEn: string | null;
  bioAr: string | null;
  bioEn: string | null;
  craftTypes: CraftType[];
  area: string;
  whatsapp: string;
  profileImageKey: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArtisanProduct {
  id: string;
  artisanId: string;
  nameAr: string;
  nameEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  craftType: CraftType;
  price: number | null;
  minOrderQty: number;
  imageKeys: string[];
  qrCodeKey: string | null;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WholesaleInquiry {
  id: string;
  productId: string;
  artisanId: string;
  name: string;
  email: string | null;
  phone: string;
  message: string | null;
  quantity: number | null;
  status: WholesaleInquiryStatus;
  createdAt: string;
  readAt: string | null;
}

export interface ArtisanProfileWithProducts extends ArtisanProfile {
  products: ArtisanProduct[];
}

export interface CreateArtisanProfilePayload {
  nameAr: string;
  nameEn?: string | null;
  bioAr?: string | null;
  bioEn?: string | null;
  craftTypes: CraftType[];
  area: string;
  whatsapp: string;
  profileImageKey?: string | null;
}

export type UpdateArtisanProfilePayload = Partial<CreateArtisanProfilePayload>;

export interface CreateArtisanProductPayload {
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  craftType: CraftType;
  price?: number | null;
  minOrderQty?: number;
  imageKeys?: string[];
  available?: boolean;
}

export type UpdateArtisanProductPayload = Partial<CreateArtisanProductPayload>;

export interface CreateWholesaleInquiryPayload {
  name: string;
  email?: string | null;
  phone: string;
  message?: string | null;
  quantity?: number | null;
}

export interface UpdateInquiryStatusPayload {
  status: WholesaleInquiryStatus;
}

export interface QueryArtisansParams {
  area?: string;
  craftType?: CraftType;
  limit?: number;
  offset?: number;
}

export interface QueryProductsParams {
  craftType?: CraftType;
  available?: boolean;
  limit?: number;
  offset?: number;
}
