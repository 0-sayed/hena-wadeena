export enum UserRole {
  TOURIST = 'tourist',
  RESIDENT = 'resident',
  MERCHANT = 'merchant',
  GUIDE = 'guide',
  INVESTOR = 'investor',
  STUDENT = 'student',
  DRIVER = 'driver',
  ADMIN = 'admin',
}

export enum KycStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ListingStatus {
  DRAFT = 'draft',
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  SOLD = 'sold',
}

export enum ListingCategory {
  REAL_ESTATE = 'real_estate',
  AGRICULTURAL = 'agricultural',
  COMMERCIAL = 'commercial',
  VEHICLE = 'vehicle',
  EQUIPMENT = 'equipment',
  OTHER = 'other',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum GuideLanguage {
  ARABIC = 'arabic',
  ENGLISH = 'english',
  FRENCH = 'french',
  GERMAN = 'german',
  ITALIAN = 'italian',
}

export enum GuideSpecialty {
  HISTORY = 'history',
  NATURE = 'nature',
  ADVENTURE = 'adventure',
  CULTURE = 'culture',
  PHOTOGRAPHY = 'photography',
  FOOD = 'food',
}

export enum PoiCategory {
  HISTORICAL = 'historical',
  NATURAL = 'natural',
  RELIGIOUS = 'religious',
  RECREATIONAL = 'recreational',
  ACCOMMODATION = 'accommodation',
  RESTAURANT = 'restaurant',
  SERVICE = 'service',
  GOVERNMENT = 'government',
}

export enum PoiStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum CarpoolStatus {
  OPEN = 'open',
  FULL = 'full',
  DEPARTED = 'departed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PassengerStatus {
  REQUESTED = 'requested',
  CONFIRMED = 'confirmed',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
}

export enum InvestmentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  FUNDED = 'funded',
  CLOSED = 'closed',
}

export enum InvestmentSector {
  AGRICULTURE = 'agriculture',
  TOURISM = 'tourism',
  REAL_ESTATE = 'real_estate',
  MANUFACTURING = 'manufacturing',
  SERVICES = 'services',
  ENERGY = 'energy',
  TECHNOLOGY = 'technology',
}

export enum ApplicationStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum NotificationType {
  BOOKING_REQUESTED = 'booking_requested',
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_CANCELLED = 'booking_cancelled',
  BOOKING_COMPLETED = 'booking_completed',
  REVIEW_SUBMITTED = 'review_submitted',
  KYC_APPROVED = 'kyc_approved',
  KYC_REJECTED = 'kyc_rejected',
  SYSTEM = 'system',
}

export enum SavedItemType {
  LISTING = 'listing',
  GUIDE = 'guide',
  ATTRACTION = 'attraction',
  OPPORTUNITY = 'opportunity',
  POI = 'poi',
}

export enum ReviewTargetType {
  LISTING = 'listing',
  GUIDE = 'guide',
  PACKAGE = 'package',
}

export enum NvDistrict {
  KHARGA = 'kharga',
  DAKHLA = 'dakhla',
  FARAFRA = 'farafra',
  BARIS = 'baris',
}

export enum CommodityUnit {
  KG = 'kg',
  TON = 'ton',
  BOX = 'box',
  PIECE = 'piece',
  LITER = 'liter',
}
