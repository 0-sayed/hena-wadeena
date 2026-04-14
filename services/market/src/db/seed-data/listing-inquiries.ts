import { LISTING, USER } from '../../../../../scripts/seed/shared-ids.js';

const INQ01 = 'a1000000-0000-4000-8000-000000000001';
const INQ02 = 'a1000000-0000-4000-8000-000000000002';
const INQ03 = 'a1000000-0000-4000-8000-000000000003';
const INQ04 = 'a1000000-0000-4000-8000-000000000004';
const INQ05 = 'a1000000-0000-4000-8000-000000000005';
const INQ06 = 'a1000000-0000-4000-8000-000000000006';
const INQ07 = 'a1000000-0000-4000-8000-000000000007';
const INQ08 = 'a1000000-0000-4000-8000-000000000008';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

export const showcaseListingInquiries = [
  // Tourist asking about the furnished apartment (L01) — pending
  {
    id: INQ01,
    listingId: LISTING.L01,
    senderId: USER.TOURIST_SALMA,
    receiverId: USER.RESIDENT_MOHAMED,
    contactName: 'سلمى الزائرة',
    contactEmail: 'tourist@hena-wadeena.online',
    contactPhone: '+201000000001',
    message: 'مرحباً، أود الاستفسار عن الشقة. هل هي متاحة من أول مايو؟ وما هي شروط الإيجار؟',
    status: 'pending' as const,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  // Tourist asking about the hotel lodge (L03) — responded
  {
    id: INQ02,
    listingId: LISTING.L03,
    senderId: USER.TOURIST_HASSAN,
    receiverId: USER.MERCHANT_KHALED,
    contactName: 'حسن الرحالة',
    contactEmail: 'hassan@hena-wadeena.online',
    contactPhone: '+201000000012',
    message: 'هل يمكن الحجز لمدة 3 ليالي في شهر أبريل؟ هل تتوفر غرفة مزدوجة؟',
    replyMessage:
      'أهلاً وسهلاً! نعم، متاحون طوال أبريل. الغرفة المزدوجة بـ 1200 جنيه/ليلة. تواصل معنا للحجز.',
    status: 'replied' as const,
    readAt: daysAgo(4),
    respondedAt: daysAgo(4),
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
  },
  // Resident asking about commercial shop (L05) — pending
  {
    id: INQ03,
    listingId: LISTING.L05,
    senderId: USER.RESIDENT_MOHAMED,
    receiverId: USER.MERCHANT_KHALED,
    contactName: 'محمد الواحاتي',
    contactEmail: 'resident@hena-wadeena.online',
    contactPhone: '+201000000002',
    message: 'ما هي مساحة المحل؟ وهل يمكن استخدامه كمحل لبيع المواد الغذائية؟',
    status: 'pending' as const,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  // Tourist asking about date farm land (L02) — responded
  {
    id: INQ04,
    listingId: LISTING.L02,
    senderId: USER.TOURIST_KARIM,
    receiverId: USER.INVESTOR_MAHMOUD,
    contactName: 'كريم الباحث',
    contactEmail: 'karim@hena-wadeena.online',
    contactPhone: '+201000000014',
    message: 'هل الأرض مزروعة بالكامل؟ وما هو مصدر المياه الرئيسي للمزرعة؟',
    replyMessage: 'نعم، المزرعة مزروعة بـ 15,000 نخلة. المياه من الآبار الجوفية والري بالتنقيط.',
    status: 'replied' as const,
    readAt: daysAgo(7),
    respondedAt: daysAgo(7),
    createdAt: daysAgo(8),
    updatedAt: daysAgo(7),
  },
  // Tourist Layla asking about listing L04 — read but not replied (triggers "تمت القراءة" badge)
  {
    id: INQ05,
    listingId: LISTING.L04,
    senderId: USER.TOURIST_LAYLA,
    receiverId: USER.MERCHANT_KHALED,
    contactName: 'ليلى المسافرة',
    message: 'ما هي مواعيد العمل؟ وهل يوجد توصيل للمنازل؟',
    status: 'pending' as const,
    readAt: daysAgo(1),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
  // Student Nour asking about listing L06 — pending (student sees sent tab)
  {
    id: INQ06,
    listingId: LISTING.L06,
    senderId: USER.STUDENT_NOUR,
    receiverId: USER.RESIDENT_MOHAMED,
    contactName: 'نور الطالبة',
    contactEmail: 'student@hena-wadeena.online',
    contactPhone: '+201000000003',
    message: 'هل الوحدة مناسبة للطلاب؟ وهل هناك إنترنت وكهرباء مستقرة؟',
    status: 'pending' as const,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  // Tourist Karim asking about listing L07 — replied (admin Sayed has received inbox)
  {
    id: INQ07,
    listingId: LISTING.L07,
    senderId: USER.TOURIST_KARIM,
    receiverId: USER.ADMIN_SAYED,
    contactName: 'كريم الباحث',
    contactEmail: 'karim@hena-wadeena.online',
    contactPhone: '+201000000014',
    message: 'هل هذا المكان مفتوح للزيارة طوال الأسبوع؟ وكيف يمكنني التواصل للحجز؟',
    replyMessage: 'نعم، مفتوح يومياً من 9 صباحاً حتى 6 مساءً. تواصل معنا عبر البريد أو الهاتف.',
    status: 'replied' as const,
    readAt: daysAgo(2),
    respondedAt: daysAgo(2),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  },
  // Tourist Hassan asking about listing L08 — pending, no email/phone (tests conditional contact block)
  {
    id: INQ08,
    listingId: LISTING.L08,
    senderId: USER.TOURIST_HASSAN,
    receiverId: USER.MERCHANT_KHALED,
    contactName: 'حسن الرحالة',
    message: 'هل يمكن الاطلاع على المزيد من التفاصيل والصور قبل اتخاذ القرار؟',
    status: 'pending' as const,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];
