import {
  BOOKING,
  GUIDE_PROFILE,
  GUIDE_REVIEW,
  USER,
} from '../../../../../scripts/seed/shared-ids.js';

export interface SeedGuideReview {
  id: string;
  bookingId: string;
  guideId: string;
  reviewerId: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  guideReply?: string;
  isActive: boolean;
}

/** Showcase layer only: 3 reviews on completed bookings */
export const showcaseGuideReviews: SeedGuideReview[] = [
  {
    id: GUIDE_REVIEW.RV01,
    bookingId: BOOKING.BK01,
    guideId: GUIDE_PROFILE.GP01,
    reviewerId: USER.TOURIST_SALMA,
    rating: 5,
    title: 'تجربة رائعة',
    comment: 'يوسف مرشد ممتاز! شرح تاريخ المعابد بطريقة شيقة جداً. أنصح الجميع بهذه الجولة.',
    guideReply: 'شكراً سلمى، سعيد إنك استمتعتي بالجولة. نورتينا الواحة!',
    isActive: true,
  },
  {
    id: GUIDE_REVIEW.RV02,
    bookingId: BOOKING.BK02,
    guideId: GUIDE_PROFILE.GP02,
    reviewerId: USER.TOURIST_HASSAN,
    rating: 5,
    title: 'سفاري لا تُنسى',
    comment:
      'فاطمة محترفة جداً في تنظيم رحلات الصحراء. التخييم تحت النجوم كان أجمل تجربة في حياتي.',
    isActive: true,
  },
  {
    id: GUIDE_REVIEW.RV03,
    bookingId: BOOKING.BK05,
    guideId: GUIDE_PROFILE.GP05,
    reviewerId: USER.TOURIST_SALMA,
    rating: 4,
    title: 'جولة تصوير جميلة',
    comment: 'عمر مصور محترف وعنده عين فنية. الأماكن اللي اختارها للتصوير كانت مذهلة.',
    isActive: true,
  },
];
