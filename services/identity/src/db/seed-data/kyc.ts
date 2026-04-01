import { KYC, USER } from '../../../../../scripts/seed/shared-ids.js';

export interface SeedKyc {
  id: string;
  userId: string;
  docType:
    | 'national_id'
    | 'student_id'
    | 'guide_license'
    | 'commercial_register'
    | 'business_document';
  docUrl: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
}

// Sample document images (using placeholder document-like images)
const DOC_IMAGES = {
  // Egyptian national ID card samples (front-facing document images)
  nationalId1: '/images/seed/kyc/national-id-sample-1.jpg',
  nationalId2: '/images/seed/kyc/national-id-sample-2.jpg',
  // Student ID samples
  studentId1: '/images/seed/kyc/student-id-sample-1.jpg',
  // Guide license samples
  guideLicense1: '/images/seed/kyc/guide-license-sample-1.jpg',
  guideLicense2: '/images/seed/kyc/guide-license-sample-2.jpg',
  // Commercial register samples
  commercialReg1: '/images/seed/kyc/commercial-register-sample-1.jpg',
};

const now = new Date();
const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

/**
 * Essential KYC records: 3 pending (for admin moderation demo), 2 approved
 *
 * Pending records let admins demo the approval workflow.
 * Approved records show the expected end state.
 */
export const essentialKycRecords: SeedKyc[] = [
  // ── Pending records (for admin moderation demo) ──
  {
    id: KYC.KYC01,
    userId: USER.GUIDE_YOUSSEF,
    docType: 'guide_license',
    docUrl: DOC_IMAGES.guideLicense1,
    status: 'pending',
  },
  {
    id: KYC.KYC02,
    userId: USER.MERCHANT_KHALED,
    docType: 'commercial_register',
    docUrl: DOC_IMAGES.commercialReg1,
    status: 'pending',
  },
  {
    id: KYC.KYC03,
    userId: USER.STUDENT_NOUR,
    docType: 'student_id',
    docUrl: DOC_IMAGES.studentId1,
    status: 'pending',
  },
  // ── Approved records (show expected end state) ──
  {
    id: KYC.KYC04,
    userId: USER.RESIDENT_MOHAMED,
    docType: 'national_id',
    docUrl: DOC_IMAGES.nationalId1,
    status: 'approved',
    reviewedBy: USER.ADMIN_SAYED,
    reviewedAt: weekAgo,
  },
  {
    id: KYC.KYC05,
    userId: USER.DRIVER_AMRO,
    docType: 'national_id',
    docUrl: DOC_IMAGES.nationalId2,
    status: 'approved',
    reviewedBy: USER.ADMIN_ADLY,
    reviewedAt: weekAgo,
  },
];
