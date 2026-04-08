export enum UserRole {
  TOURIST = 'tourist',
  RESIDENT = 'resident',
  MERCHANT = 'merchant',
  GUIDE = 'guide',
  INVESTOR = 'investor',
  STUDENT = 'student',
  DRIVER = 'driver',
  MODERATOR = 'moderator',
  REVIEWER = 'reviewer',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  PENDING_KYC = 'pending_kyc',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export enum KycStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ListingType {
  REAL_ESTATE = 'real_estate',
  LAND = 'land',
  BUSINESS = 'business',
}

export enum TransactionType {
  SALE = 'sale',
  RENT = 'rent',
}

export enum ListingStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SOLD = 'sold',
  RENTED = 'rented',
  SUSPENDED = 'suspended',
}

export enum ListingCategory {
  PLACE = 'place',
  ACCOMMODATION = 'accommodation',
  RESTAURANT = 'restaurant',
  SERVICE = 'service',
  ACTIVITY = 'activity',
  TRANSPORT = 'transport',
  EDUCATION = 'education',
  HEALTHCARE = 'healthcare',
  SHOPPING = 'shopping',
  AGRICULTURAL_PRODUCE = 'agricultural_produce',
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

export enum OpportunityStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  ACTIVE = 'active',
  CLOSED = 'closed',
  TAKEN = 'taken',
}

export enum InvestmentSector {
  AGRICULTURE = 'agriculture',
  TOURISM = 'tourism',
  INDUSTRY = 'industry',
  REAL_ESTATE = 'real_estate',
  SERVICES = 'services',
  TECHNOLOGY = 'technology',
  ENERGY = 'energy',
}

export enum ApplicationStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export enum BusinessStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
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

export enum KycDocType {
  NATIONAL_ID = 'national_id',
  STUDENT_ID = 'student_id',
  GUIDE_LICENSE = 'guide_license',
  COMMERCIAL_REGISTER = 'commercial_register',
  BUSINESS_DOCUMENT = 'business_document',
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
  BALAT = 'balat',
}

export enum CommodityUnit {
  KG = 'kg',
  TON = 'ton',
  ARDEB = 'ardeb',
  KANTAR = 'kantar',
  BOX = 'box',
  PIECE = 'piece',
  LITER = 'liter',
}

export enum CommodityCategory {
  FRUITS = 'fruits',
  GRAINS = 'grains',
  VEGETABLES = 'vegetables',
  OILS = 'oils',
  LIVESTOCK = 'livestock',
  OTHER = 'other',
}

export enum PriceType {
  WHOLESALE = 'wholesale',
  RETAIL = 'retail',
  FARM_GATE = 'farm_gate',
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

export enum AlertDirection {
  ABOVE = 'above',
  BELOW = 'below',
}
