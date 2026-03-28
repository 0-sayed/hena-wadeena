import type { PaginatedResponse } from '../dto/pagination';
import type { KycDocType, KycStatus, NotificationType } from '../enums';

/** In-app notification record */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

/** Notification list response with unread count in envelope */
export interface NotificationListResponse extends PaginatedResponse<Notification> {
  unreadCount: number;
}

/** KYC document submission */
export interface KycSubmission {
  id: string;
  userId: string;
  docType: KycDocType;
  docUrl: string;
  status: KycStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}
