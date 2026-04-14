import { GUIDE_PROFILE, USER } from '../../../../../scripts/seed/shared-ids.js';

export interface SeedGuide {
  id: string;
  userId: string;
  displayName?: string | null;
  bioAr: string;
  bioEn: string;
  languages: string[];
  specialties: string[];
  areasOfOperation: string[];
  licenseNumber: string;
  licenseVerified: boolean;
  basePrice: number; // piasters
  active: boolean;
}

export const essentialGuides: SeedGuide[] = [
  {
    id: GUIDE_PROFILE.GP01,
    userId: USER.GUIDE_YOUSSEF,
    displayName: 'يوسف علي',
    bioAr:
      'مرشد سياحي متخصص في الآثار والتاريخ المصري القديم بالوادي الجديد. خبرة 10 سنوات في تنظيم الجولات الأثرية.',
    bioEn:
      'Tour guide specializing in Egyptian archaeology and ancient history in the New Valley. 10 years of experience.',
    languages: ['arabic', 'english'],
    specialties: ['history', 'culture'],
    areasOfOperation: ['kharga', 'dakhla', 'balat'],
    licenseNumber: 'NV-GUIDE-001',
    licenseVerified: true,
    basePrice: 150000, // 1500 EGP
    active: true,
  },
];

export const showcaseGuides: SeedGuide[] = [
  {
    id: GUIDE_PROFILE.GP02,
    userId: USER.GUIDE_FATMA,
    displayName: 'فاطمة حسن',
    bioAr:
      'مرشدة سياحة صحراوية متخصصة في رحلات السفاري والتخييم في الصحراء البيضاء والسوداء. تعشق مشاركة جمال الصحراء مع الزوار.',
    bioEn:
      'Desert tourism guide specializing in safari and camping trips in the White and Black Deserts.',
    languages: ['arabic', 'english', 'french'],
    specialties: ['nature', 'adventure'],
    areasOfOperation: ['farafra'],
    licenseNumber: 'NV-GUIDE-002',
    licenseVerified: true,
    basePrice: 200000, // 2000 EGP
    active: true,
  },
  {
    id: GUIDE_PROFILE.GP03,
    userId: USER.GUIDE_AHMED,
    displayName: 'أحمد محمد',
    bioAr: 'مرشد مغامرات وتخييم. متخصص في رحلات التزلج على الرمال واستكشاف الوديان الصحراوية.',
    bioEn:
      'Adventure and camping guide. Specializes in sandboarding and desert valley exploration.',
    languages: ['arabic', 'english'],
    specialties: ['adventure', 'nature'],
    areasOfOperation: ['farafra', 'dakhla'],
    licenseNumber: 'NV-GUIDE-003',
    licenseVerified: true,
    basePrice: 180000, // 1800 EGP
    active: true,
  },
  {
    id: GUIDE_PROFILE.GP04,
    userId: USER.GUIDE_MARIAM,
    displayName: 'مريم خالد',
    bioAr:
      'متخصصة في السياحة العلاجية والعيون الحارة. تنظم برامج علاجية بالمياه المعدنية والدفن بالرمال.',
    bioEn:
      'Medical/wellness tourism specialist. Organizes hot springs and sand burial therapy programs.',
    languages: ['arabic'],
    specialties: ['nature', 'culture'],
    areasOfOperation: ['dakhla'],
    licenseNumber: 'NV-GUIDE-004',
    licenseVerified: true,
    basePrice: 120000, // 1200 EGP
    active: true,
  },
  {
    id: GUIDE_PROFILE.GP05,
    userId: USER.GUIDE_OMAR,
    displayName: 'عمر عبدالله',
    bioAr: 'مصور محترف ومرشد سياحي. يقدم جولات تصوير فوتوغرافي في أجمل مواقع الوادي الجديد.',
    bioEn:
      'Professional photographer and tour guide. Offers photography tours at the most scenic New Valley locations.',
    languages: ['arabic', 'english', 'german'],
    specialties: ['photography', 'nature'],
    areasOfOperation: ['farafra', 'dakhla', 'kharga'],
    licenseNumber: 'NV-GUIDE-005',
    licenseVerified: true,
    basePrice: 250000, // 2500 EGP
    active: true,
  },
];
