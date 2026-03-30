import { LISTING, LISTING_REVIEW, USER } from '../../../../../scripts/seed/shared-ids.js';

import { L11, L12, L13, L14, L15, L16 } from './listings.js';

export interface SeedListingReview {
  id: string;
  listingId: string;
  reviewerId: string;
  rating: number;
  title: string;
  comment: string;
  isActive: boolean;
  isVerifiedVisit: boolean;
}

// Extra review IDs (LR01–LR03 are in shared-ids; LR04–LR15 defined here)
const LR04 = '019d393d-c25b-78c0-9b19-455d0cd1a2b6';
const LR05 = '019d393d-c25b-7aa0-afd1-fee3c672990d';
const LR06 = '019d393d-c25b-791f-8c85-c2b6bd990356';
const LR07 = '019d393d-c25b-7d6f-b34b-5ce5d4ac9a12';
const LR08 = '019d393d-c25b-734d-942b-25aa8762d730';
const LR09 = '019d393d-c25b-7dee-94f9-45c502f19a2a';
const LR10 = '019d393d-c25b-71ca-9c36-a4536f94c9ff';
const LR11 = '019d393d-c25b-77aa-91bc-da790a074cfc';
const LR12 = '019d393d-c25b-7f4d-a947-3d4135995556';
const LR13 = '019d393d-c25b-7f33-88e8-4556c7fc1fd8';
const LR14 = '019d393d-c25b-7385-ba56-6acce64c4a6c';
const LR15 = '019d393d-c25b-78ff-9399-3b8dfe5d50ce';

/**
 * Showcase layer: 15 listing reviews on accommodation and restaurant listings.
 * Each (reviewerId, listingId) pair is unique to satisfy the partial unique index.
 */
export const showcaseListingReviews: SeedListingReview[] = [
  // ── فندق قصر البجوات (L04) ──────────────────────────────────────────
  {
    id: LISTING_REVIEW.LR01,
    listingId: LISTING.L04,
    reviewerId: USER.TOURIST_SALMA,
    rating: 5,
    title: 'تجربة لا تُنسى',
    comment:
      'الفندق رائع بكل معنى الكلمة. الغرف نظيفة ومريحة، والإطلالة على جبانة البجوات الأثرية سحرية عند الغروب. الموظفون ودودون ومفيدون جداً. سأعود بالتأكيد.',
    isActive: true,
    isVerifiedVisit: true,
  },
  {
    id: LR04,
    listingId: LISTING.L04,
    reviewerId: USER.TOURIST_LAYLA,
    rating: 4,
    title: 'جيد جداً مع بعض الملاحظات',
    comment:
      'الموقع ممتاز قريب من المعالم الأثرية. المطعم يقدم طعاماً لذيذاً. التكييف في غرفتي كان يُصدر صوتاً مزعجاً قليلاً لكن بشكل عام التجربة كانت مرضية.',
    isActive: true,
    isVerifiedVisit: true,
  },
  {
    id: LR11,
    listingId: LISTING.L04,
    reviewerId: USER.TOURIST_HASSAN,
    rating: 5,
    title: 'أفضل فندق في الوادي الجديد',
    comment:
      'زرت الوادي الجديد لأول مرة واخترت هذا الفندق بناء على توصية صديق. لم أندم أبداً! الغرف واسعة والخدمة ممتازة والإفطار شهي. المكان يستحق خمس نجوم.',
    isActive: true,
    isVerifiedVisit: false,
  },

  // ── لودج الطرفة الصحراوية (L05) ─────────────────────────────────────
  {
    id: LISTING_REVIEW.LR02,
    listingId: LISTING.L05,
    reviewerId: USER.TOURIST_HASSAN,
    rating: 5,
    title: 'جنة في قلب الصحراء',
    comment:
      'لودج الطرفة هو الوجهة المثالية لمحبي الطبيعة والهدوء. كل غرفة لها تراس خاص مطل على الواحة. الطعام ألذ ما أكلته في رحلاتي. الغروب من هنا تجربة روحية حقيقية.',
    isActive: true,
    isVerifiedVisit: true,
  },
  {
    id: LR05,
    listingId: LISTING.L05,
    reviewerId: USER.TOURIST_KARIM,
    rating: 3,
    title: 'جيد لكن يحتاج تحسينات',
    comment:
      'الموقع جميل والهواء نقي. لكن الوصول صعب بدون سيارة رباعية الدفع، والإنترنت ضعيف جداً. السعر مرتفع قليلاً مقارنة بالخدمة المقدمة. يصلح للعائلات الباحثة عن هروب من المدينة.',
    isActive: true,
    isVerifiedVisit: true,
  },
  {
    id: LR15,
    listingId: LISTING.L05,
    reviewerId: USER.TOURIST_SALMA,
    rating: 4,
    title: 'هادئ وجميل',
    comment:
      'قضيت ثلاثة أيام رائعة في لودج الطرفة. الغرف مريحة والحديقة خضراء وسط الصحراء. خدمة الإفطار ممتازة. الوحيد السلبي هو أن المسبح صغير نسبياً.',
    isActive: true,
    isVerifiedVisit: false,
  },

  // ── شقة مفروشة بالخارجة (L01) ──────────────────────────────────────
  {
    id: LISTING_REVIEW.LR03,
    listingId: LISTING.L01,
    reviewerId: USER.RESIDENT_MOHAMED,
    rating: 4,
    title: 'شقة نظيفة بموقع مميز',
    comment:
      'الشقة مفروشة بشكل جيد وقريبة من كل الخدمات. الأجهزة الكهربائية تعمل بكفاءة والمطبخ مجهز بالكامل. الموقع في قلب الخارجة يوفر سهولة في التنقل. أنصح بها للزيارات القصيرة.',
    isActive: true,
    isVerifiedVisit: true,
  },

  // ── مطعم الواحة (L06) ───────────────────────────────────────────────
  {
    id: LR06,
    listingId: LISTING.L06,
    reviewerId: USER.TOURIST_SALMA,
    rating: 5,
    title: 'أصيل ولذيذ',
    comment:
      'مطعم الواحة يقدم أجود المأكولات الصعيدية الأصيلة. الكباب طازج والفطير المشلتيت لا مثيل له. الخدمة سريعة والأسعار معقولة جداً. ساعة الغداء مكتظ قليلاً لكن يستحق الانتظار.',
    isActive: true,
    isVerifiedVisit: true,
  },
  {
    id: LR10,
    listingId: LISTING.L06,
    reviewerId: USER.TOURIST_LAYLA,
    rating: 4,
    title: 'طعام طازج وأجواء محلية',
    comment:
      'زرت مطعم الواحة مع مجموعة من الأصدقاء وأعجبتنا الأجواء الحميمة. الطعام طازج ويُطهى أمامك. أنصح بطبق الحمام بالفريك - نادر ومميز.',
    isActive: true,
    isVerifiedVisit: true,
  },

  // ── شاليه صحراوي بالفرافرة (L11) ──────────────────────────────────
  {
    id: LR07,
    listingId: L11,
    reviewerId: USER.TOURIST_HASSAN,
    rating: 4,
    title: 'تجربة أصيلة في الفرافرة',
    comment:
      'الشاليه بتصميمه الطيني التقليدي يمنحك إحساساً بأنك عدت لعصر آخر. المنطقة هادئة جداً وهواؤها نقي. الإضاءة الليلية بالشموع رومانسية. الوحيد أن الحمام صغير.',
    isActive: true,
    isVerifiedVisit: true,
  },

  // ── استراحة واحة الداخلة (L12) ─────────────────────────────────────
  {
    id: LR08,
    listingId: L12,
    reviewerId: USER.TOURIST_LAYLA,
    rating: 4,
    title: 'مريحة وبسعر عادل',
    comment:
      'استراحة بسيطة لكن نظيفة وودية. الموظفون يساعدونك في تنظيم الجولات المحلية. المياه الساخنة تعمل طوال اليوم وهذا مهم جداً. للباحثين عن إقامة ميسورة في الداخلة.',
    isActive: true,
    isVerifiedVisit: true,
  },

  // ── فندق الخارجة السياحي (L13) ─────────────────────────────────────
  {
    id: LR09,
    listingId: L13,
    reviewerId: USER.TOURIST_KARIM,
    rating: 5,
    title: 'ثلاث نجوم بخدمة خمس نجوم',
    comment:
      'فوجئت بجودة الخدمة في هذا الفندق. الموظفون محترفون ومتحدثون بالإنجليزية. قاعة الاجتماعات مجهزة تجهيزاً ممتازاً للمؤتمرات. الإفطار متنوع ولذيذ. الموقع المركزي يسهل الوصول لكل المعالم.',
    isActive: true,
    isVerifiedVisit: true,
  },

  // ── شقق مفروشة بالداخلة (L14) ──────────────────────────────────────
  {
    id: LR13,
    listingId: L14,
    reviewerId: USER.RESIDENT_MOHAMED,
    rating: 3,
    title: 'مناسب للإقامة الطويلة',
    comment:
      'الشقق جيدة للإقامة الأسبوعية أو الشهرية. المطبخ مجهز بالكامل والمساحة كافية. الإيجار يشمل الفواتير وهذا مريح. التشطيب قديم قليلاً لكن كل شيء يعمل بكفاءة.',
    isActive: true,
    isVerifiedVisit: false,
  },

  // ── استراحة باريس التراثية (L15) ───────────────────────────────────
  {
    id: LR14,
    listingId: L15,
    reviewerId: USER.TOURIST_KARIM,
    rating: 5,
    title: 'كنز خفي في باريس',
    comment:
      'استراحة باريس التراثية هي أجمل مكان أقمت فيه في حياتي. الطوب اللبن يحافظ على الجو بارداً في الصيف وهذا مذهل. قريبة من معبد دوش وبعض الغرف تطل على النخيل. صاحب الاستراحة مضياف وكريم جداً.',
    isActive: true,
    isVerifiedVisit: true,
  },

  // ── مخيم سياحي بالصحراء البيضاء (L16) ─────────────────────────────
  {
    id: LR12,
    listingId: L16,
    reviewerId: USER.TOURIST_SALMA,
    rating: 5,
    title: 'أجمل ليلة في حياتي',
    comment:
      'المخيم في الصحراء البيضاء تحت النجوم كان أجمل تجربة في رحلاتي الكثيرة. الخيام مريحة ودافئة ليلاً والنجوم بكثافة لم أشاهدها قبلاً. العشاء المطبوخ على الحطب له طعم خاص. لن أنساها أبداً.',
    isActive: true,
    isVerifiedVisit: true,
  },
];
