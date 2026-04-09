import { USER } from '../../../../../scripts/seed/shared-ids.js';

export const JOB_DEMO_USERS = {
  merchant: USER.MERCHANT_KHALED,
  resident: USER.RESIDENT_MOHAMED,
  student: USER.STUDENT_NOUR,
} as const;

export interface SeedJobPost {
  id: string;
  posterId: string;
  title: string;
  descriptionAr: string;
  descriptionEn: string | null;
  category: 'agriculture' | 'tourism' | 'skilled_trade' | 'domestic' | 'logistics' | 'handicraft';
  area: 'kharga' | 'dakhla' | 'farafra' | 'baris' | 'balat';
  compensation: number;
  compensationType: 'fixed' | 'daily' | 'per_kg' | 'negotiable';
  slots: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface SeedJobApplication {
  id: string;
  jobId: string;
  applicantId: string;
  noteAr: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'in_progress' | 'completed';
  appliedAt: string;
  resolvedAt: string | null;
}

export interface SeedJobReview {
  id: string;
  jobId: string;
  applicationId: string;
  reviewerId: string;
  revieweeId: string;
  direction: 'worker_rates_poster' | 'poster_rates_worker';
  rating: number;
  comment: string | null;
  createdAt: string;
}

export const essentialJobPosts: SeedJobPost[] = [
  {
    id: '40f0c3c7-1d2c-4cb2-8840-c16d2f6a1111',
    posterId: JOB_DEMO_USERS.merchant,
    title: 'عامل فرز وتعبئة تمور تصديرية',
    descriptionAr:
      'مطلوب 8 عمال لفرز التمور عالية الجودة وتعبئتها في عبوات تصديرية داخل مركز تجهيز بالخارجة خلال ذروة الموسم.',
    descriptionEn: 'Seasonal export-grade date sorting and packing role in Kharga.',
    category: 'agriculture',
    area: 'kharga',
    compensation: 60000,
    compensationType: 'daily',
    slots: 8,
    status: 'open',
    startsAt: '2026-09-20',
    endsAt: '2026-10-30',
    createdAt: '2026-04-09T08:15:00.000Z',
  },
  {
    id: '40f0c3c7-1d2c-4cb2-8840-c16d2f6a2222',
    posterId: JOB_DEMO_USERS.merchant,
    title: 'منسق حجوزات سفاري وواحات',
    descriptionAr:
      'فرصة لإدارة الحجوزات والرد على الاستفسارات وترتيب برامج زيارة المعابد والعيون الساخنة ورحلات السفاري في الداخلة.',
    descriptionEn: 'Coordinate oasis safari bookings and answer guest inquiries in Dakhla.',
    category: 'tourism',
    area: 'dakhla',
    compensation: 180000,
    compensationType: 'fixed',
    slots: 1,
    status: 'open',
    startsAt: '2026-04-15',
    endsAt: null,
    createdAt: '2026-04-09T07:30:00.000Z',
  },
  {
    id: '40f0c3c7-1d2c-4cb2-8840-c16d2f6a3333',
    posterId: JOB_DEMO_USERS.resident,
    title: 'سائق تجميع وشحن منتجات زراعية',
    descriptionAr:
      'مطلوب سائق بسيارة ربع نقل لتجميع الطرود الزراعية بين مزارع الداخلة ومخازن الخارجة مع التزام بمواعيد التحميل المبكر.',
    descriptionEn: 'Pickup driver for moving farm products between Dakhla and Kharga.',
    category: 'logistics',
    area: 'dakhla',
    compensation: 95000,
    compensationType: 'fixed',
    slots: 2,
    status: 'open',
    startsAt: null,
    endsAt: null,
    createdAt: '2026-04-09T06:45:00.000Z',
  },
  {
    id: '40f0c3c7-1d2c-4cb2-8840-c16d2f6a4444',
    posterId: JOB_DEMO_USERS.merchant,
    title: 'فني تشغيل مخلفات النخيل وإنتاج كمبوست',
    descriptionAr:
      'مطلوب فني لمتابعة فرم سعف النخيل وتجهيز الخلطات العضوية ومراقبة جودة الكمبوست في مشروع تدوير مخلفات زراعية ببلاط.',
    descriptionEn: 'Operate palm-waste shredding and compost preparation in Balat.',
    category: 'skilled_trade',
    area: 'balat',
    compensation: 220000,
    compensationType: 'fixed',
    slots: 2,
    status: 'open',
    startsAt: '2026-04-20',
    endsAt: null,
    createdAt: '2026-04-09T06:10:00.000Z',
  },
  {
    id: '40f0c3c7-1d2c-4cb2-8840-c16d2f6a5555',
    posterId: JOB_DEMO_USERS.student,
    title: 'مساعد تشغيل مخيم بيئي في الوايت ديزرت',
    descriptionAr:
      'مطلوب 4 مساعدين لاستقبال الزوار وتجهيز نقاط التخييم ومتابعة السلامة الأساسية في رحلات الفرافرة والوايت ديزرت.',
    descriptionEn: 'Support eco-camp operations and guest readiness for White Desert trips.',
    category: 'tourism',
    area: 'farafra',
    compensation: 75000,
    compensationType: 'daily',
    slots: 4,
    status: 'open',
    startsAt: '2026-04-18',
    endsAt: '2026-05-30',
    createdAt: '2026-04-09T05:40:00.000Z',
  },
  {
    id: '40f0c3c7-1d2c-4cb2-8840-c16d2f6a6666',
    posterId: JOB_DEMO_USERS.resident,
    title: 'حرفية كليم ومنتجات نخيل',
    descriptionAr:
      'فرصة للانضمام إلى ورشة إنتاج كليم ومشغولات من خامات محلية مع أولوية للخبرة في التطريز أو تجهيز منتجات النخيل اليدوية.',
    descriptionEn: 'Handicraft role for kilim, embroidery, and palm-based products.',
    category: 'handicraft',
    area: 'kharga',
    compensation: 140000,
    compensationType: 'fixed',
    slots: 3,
    status: 'open',
    startsAt: null,
    endsAt: null,
    createdAt: '2026-04-09T05:00:00.000Z',
  },
  {
    id: '40f0c3c7-1d2c-4cb2-8840-c16d2f6a7777',
    posterId: JOB_DEMO_USERS.merchant,
    title: 'فني تجفيف وتعبئة نباتات طبية وعطرية',
    descriptionAr:
      'مطلوب فني لمراقبة التجفيف والوزن والتعبئة الأولية لمحاصيل نباتات طبية وعطرية موجهة للبيع المحلي في الخارجة.',
    descriptionEn: 'Drying and packing technician for medicinal and aromatic plants.',
    category: 'agriculture',
    area: 'kharga',
    compensation: 160000,
    compensationType: 'fixed',
    slots: 2,
    status: 'open',
    startsAt: '2026-04-22',
    endsAt: null,
    createdAt: '2026-04-09T04:20:00.000Z',
  },
  {
    id: '40f0c3c7-1d2c-4cb2-8840-c16d2f6a8888',
    posterId: JOB_DEMO_USERS.student,
    title: 'مجهز هدايا ومنتجات محلية للزوار',
    descriptionAr:
      'مطلوب شخص لتجهيز عبوات هدايا تضم تموراً ومنتجات يدوية ورملية محلية ورفع الطلبيات الصغيرة الخاصة بالزوار.',
    descriptionEn: 'Prepare tourist gift bundles with local foods and handmade products.',
    category: 'handicraft',
    area: 'dakhla',
    compensation: 115000,
    compensationType: 'negotiable',
    slots: 2,
    status: 'open',
    startsAt: null,
    endsAt: null,
    createdAt: '2026-04-08T18:10:00.000Z',
  },
  {
    id: '40f0c3c7-1d2c-4cb2-8840-c16d2f6a9999',
    posterId: JOB_DEMO_USERS.merchant,
    title: 'جامع بلح بعقد إنتاج',
    descriptionAr:
      'مطلوب عمال لجمع البلح من المزرعة والالتزام بسلامة الرفع والفرز الأولي، والدفع يتم حسب الكمية السليمة المسلمة يومياً.',
    descriptionEn: 'Date harvest role paid against delivered sorted quantity.',
    category: 'agriculture',
    area: 'baris',
    compensation: 1800,
    compensationType: 'per_kg',
    slots: 6,
    status: 'open',
    startsAt: '2026-09-10',
    endsAt: '2026-10-10',
    createdAt: '2026-04-08T12:00:00.000Z',
  },
];

export const essentialJobApplications: SeedJobApplication[] = [
  {
    id: '50f0c3c7-1d2c-4cb2-8840-c16d2f6a1111',
    jobId: '40f0c3c7-1d2c-4cb2-8840-c16d2f6a2222',
    applicantId: JOB_DEMO_USERS.resident,
    noteAr: 'أجيد التنسيق مع الزوار والرد السريع على الاستفسارات.',
    status: 'pending',
    appliedAt: '2026-04-09T09:00:00.000Z',
    resolvedAt: null,
  },
  {
    id: '50f0c3c7-1d2c-4cb2-8840-c16d2f6a2222',
    jobId: '40f0c3c7-1d2c-4cb2-8840-c16d2f6a4444',
    applicantId: JOB_DEMO_USERS.student,
    noteAr: 'لدي خبرة سابقة في متابعة المعدات والتحميل.',
    status: 'completed',
    appliedAt: '2026-04-09T08:15:00.000Z',
    resolvedAt: '2026-04-12T16:00:00.000Z',
  },
  {
    id: '50f0c3c7-1d2c-4cb2-8840-c16d2f6a3333',
    jobId: '40f0c3c7-1d2c-4cb2-8840-c16d2f6a1111',
    applicantId: JOB_DEMO_USERS.student,
    noteAr: 'أستطيع العمل في الوردية الصباحية طوال الموسم.',
    status: 'accepted',
    appliedAt: '2026-04-09T10:15:00.000Z',
    resolvedAt: '2026-04-09T14:00:00.000Z',
  },
];

export const essentialJobReviews: SeedJobReview[] = [
  {
    id: '60f0c3c7-1d2c-4cb2-8840-c16d2f6a1111',
    jobId: '40f0c3c7-1d2c-4cb2-8840-c16d2f6a4444',
    applicationId: '50f0c3c7-1d2c-4cb2-8840-c16d2f6a2222',
    reviewerId: JOB_DEMO_USERS.merchant,
    revieweeId: JOB_DEMO_USERS.student,
    direction: 'poster_rates_worker',
    rating: 5,
    comment: 'ملتزم بالمواعيد ويتعامل جيداً مع التشغيل الميداني.',
    createdAt: '2026-04-12T18:00:00.000Z',
  },
  {
    id: '60f0c3c7-1d2c-4cb2-8840-c16d2f6a2222',
    jobId: '40f0c3c7-1d2c-4cb2-8840-c16d2f6a4444',
    applicationId: '50f0c3c7-1d2c-4cb2-8840-c16d2f6a2222',
    reviewerId: JOB_DEMO_USERS.student,
    revieweeId: JOB_DEMO_USERS.merchant,
    direction: 'worker_rates_poster',
    rating: 4,
    comment: 'التعليمات كانت واضحة وصرف الأجر تم في الوقت المتفق عليه.',
    createdAt: '2026-04-12T18:30:00.000Z',
  },
];
