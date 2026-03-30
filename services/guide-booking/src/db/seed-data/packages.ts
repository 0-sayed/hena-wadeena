import { GUIDE_PROFILE, PACKAGE } from '../../../../../scripts/seed/shared-ids.js';

export interface SeedPackage {
  id: string;
  guideId: string;
  titleAr: string;
  titleEn: string;
  description: string;
  durationHours: number;
  maxPeople: number;
  price: number; // piasters
  includes: string[];
  status: 'active';
}

export const essentialPackages: SeedPackage[] = [
  {
    id: PACKAGE.PK01,
    guideId: GUIDE_PROFILE.GP01,
    titleAr: 'جولة معابد الخارجة',
    titleEn: 'Kharga Temples Tour',
    description:
      'جولة شاملة لأهم المعابد والآثار في واحة الخارجة تشمل معبد هيبس وجبانة البجوات ومعبد الناضورة.',
    durationHours: 6,
    maxPeople: 8,
    price: 200000, // 2000 EGP
    includes: ['مواصلات داخلية', 'دليل أثري متخصص', 'مياه وعصائر', 'تذاكر الدخول'],
    status: 'active',
  },
  {
    id: PACKAGE.PK02,
    guideId: GUIDE_PROFILE.GP01,
    titleAr: 'جولة بلاط الأثرية',
    titleEn: 'Balat Archaeological Tour',
    description: 'استكشاف مدينة بلاط القديمة وموقع عين أصيل الأثري النادر من عهد الدولة القديمة.',
    durationHours: 5,
    maxPeople: 6,
    price: 170000, // 1700 EGP
    includes: ['مواصلات', 'دليل متخصص', 'مياه', 'تذاكر الدخول'],
    status: 'active',
  },
];

export const showcasePackages: SeedPackage[] = [
  {
    id: PACKAGE.PK03,
    guideId: GUIDE_PROFILE.GP02,
    titleAr: 'سفاري الصحراء البيضاء',
    titleEn: 'White Desert Safari',
    description: 'مغامرة صحراوية في محمية الصحراء البيضاء مع التخييم ليلاً تحت النجوم.',
    durationHours: 24,
    maxPeople: 10,
    price: 500000, // 5000 EGP
    includes: ['سيارة 4×4', 'معدات تخييم كاملة', 'وجبات', 'دليل صحراوي خبير'],
    status: 'active',
  },
  {
    id: PACKAGE.PK04,
    guideId: GUIDE_PROFILE.GP02,
    titleAr: 'جولة الصحراء البيضاء والسوداء',
    titleEn: 'White & Black Desert Day Tour',
    description: 'جولة يومية تشمل الصحراء البيضاء والصحراء السوداء والجبل الكريستالي.',
    durationHours: 10,
    maxPeople: 8,
    price: 300000, // 3000 EGP
    includes: ['سيارة 4×4', 'دليل صحراوي', 'غداء خفيف', 'مياه'],
    status: 'active',
  },
  {
    id: PACKAGE.PK05,
    guideId: GUIDE_PROFILE.GP03,
    titleAr: 'مغامرة التزلج على الرمال',
    titleEn: 'Sandboarding Adventure',
    description: 'رحلة مغامرات وتزلج على الكثبان الرملية العالية في وادي العقبات.',
    durationHours: 8,
    maxPeople: 6,
    price: 250000, // 2500 EGP
    includes: ['ألواح التزلج', 'سيارة 4×4', 'دليل مغامرات', 'وجبة خفيفة'],
    status: 'active',
  },
  {
    id: PACKAGE.PK06,
    guideId: GUIDE_PROFILE.GP03,
    titleAr: 'رحلة تخييم وادي العقبات',
    titleEn: 'Agabat Valley Camping',
    description: 'تخييم ليلي في وادي العقبات مع جولة نهارية واستكشاف الجغرافيا الصحراوية الفريدة.',
    durationHours: 20,
    maxPeople: 8,
    price: 400000, // 4000 EGP
    includes: ['خيام وأغطية', 'وجبات', 'سيارة 4×4', 'دليل متمرس'],
    status: 'active',
  },
  {
    id: PACKAGE.PK07,
    guideId: GUIDE_PROFILE.GP04,
    titleAr: 'برنامج العلاج بالمياه الحارة',
    titleEn: 'Hot Springs Wellness Program',
    description:
      'برنامج علاجي متكامل يشمل الاستحمام في عين موط تلاتة والدفن العلاجي في الرمال الحارة.',
    durationHours: 6,
    maxPeople: 4,
    price: 180000, // 1800 EGP
    includes: ['جلسة دفن بالرمال', 'استحمام معدني', 'مرشد علاجي', 'ملابس سباحة'],
    status: 'active',
  },
  {
    id: PACKAGE.PK08,
    guideId: GUIDE_PROFILE.GP04,
    titleAr: 'يوم الاسترخاء في الداخلة',
    titleEn: 'Dakhla Relaxation Day',
    description: 'يوم استرخاء كامل في واحة الداخلة يجمع بين العيون الحارة وزيارة القصر القديمة.',
    durationHours: 8,
    maxPeople: 6,
    price: 220000, // 2200 EGP
    includes: ['جلسة مياه حارة', 'زيارة أثرية', 'غداء محلي', 'مواصلات'],
    status: 'active',
  },
  {
    id: PACKAGE.PK09,
    guideId: GUIDE_PROFILE.GP05,
    titleAr: 'جولة التصوير الفوتوغرافي',
    titleEn: 'Photography Tour',
    description: 'جولة تصوير متخصصة في أجمل مواقع الوادي الجديد مع إرشادات فوتوغرافية احترافية.',
    durationHours: 8,
    maxPeople: 4,
    price: 280000, // 2800 EGP
    includes: ['دليل فوتوغرافي محترف', 'مواصلات', 'حقيبة كاميرا احتياطية', 'مياه ووجبة خفيفة'],
    status: 'active',
  },
  {
    id: PACKAGE.PK10,
    guideId: GUIDE_PROFILE.GP05,
    titleAr: 'جولة الغروب الفوتوغرافي',
    titleEn: 'Sunset Photography Tour',
    description: 'جولة تصوير خاصة لأجمل لحظات الغروب في الصحراء البيضاء والمناطق الطبيعية.',
    durationHours: 5,
    maxPeople: 4,
    price: 200000, // 2000 EGP
    includes: ['دليل فوتوغرافي', 'سيارة 4×4', 'مياه وعصائر'],
    status: 'active',
  },
];
