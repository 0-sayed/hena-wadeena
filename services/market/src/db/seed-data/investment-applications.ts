import { INVESTMENT, USER } from '../../../../../scripts/seed/shared-ids.js';

const APP01 = 'b2000000-0000-4000-8000-000000000001';
const APP02 = 'b2000000-0000-4000-8000-000000000002';
const APP03 = 'b2000000-0000-4000-8000-000000000003';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

export const showcaseInvestmentApplications = [
  // Tourist Karim expressing interest in solar farm investment (INV02)
  {
    id: APP01,
    opportunityId: INVESTMENT.INV02,
    investorId: USER.TOURIST_KARIM,
    amountProposed: 50_000_000, // 500,000 EGP
    message:
      'مهتم جداً بهذا المشروع. أمتلك خبرة في مجال الطاقة المتجددة وأودّ معرفة المزيد عن هيكل الملكية وآلية توزيع الأرباح.',
    contactEmail: 'karim@hena-wadeena.online',
    contactPhone: '+201000000014',
    status: 'pending' as const,
    createdAt: daysAgo(3),
  },
  // Hassan expressing interest in Nile agriculture cooperative (INV03)
  {
    id: APP02,
    opportunityId: INVESTMENT.INV03,
    investorId: USER.TOURIST_HASSAN,
    amountProposed: 100_000_000, // 1,000,000 EGP
    message:
      'أودّ الاستفسار عن إمكانية الاستثمار في هذا المشروع الزراعي. هل توجد حصة أدنى للمشاركة؟',
    contactEmail: 'hassan@hena-wadeena.online',
    contactPhone: '+201000000012',
    status: 'pending' as const,
    createdAt: daysAgo(6),
  },
  // Investor Mahmoud applying to tourism resort investment (INV04)
  {
    id: APP03,
    opportunityId: INVESTMENT.INV04,
    investorId: USER.INVESTOR_MAHMOUD,
    amountProposed: 200_000_000, // 2,000,000 EGP
    message: 'مهتم بالاستثمار في قطاع السياحة. أرجو التواصل لمناقشة تفاصيل المشروع وزيارة الموقع.',
    contactEmail: 'investor@hena-wadeena.online',
    contactPhone: '+201000000007',
    status: 'reviewed' as const,
    createdAt: daysAgo(10),
  },
];
