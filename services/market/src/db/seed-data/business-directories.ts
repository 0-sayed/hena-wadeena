import { BUSINESS, USER } from '../../../../../scripts/seed/shared-ids.js';

export interface SeedBusiness {
  id: string;
  ownerId: string;
  nameAr: string;
  nameEn: string;
  category: string;
  descriptionAr: string;
  district: string;
  phone: string;
  logoUrl: string;
  status: 'active';
  verificationStatus: 'verified';
  lat: number;
  lon: number;
}

/** Showcase layer only: 5 business directory entries */
export const showcaseBusinesses: SeedBusiness[] = [
  {
    id: BUSINESS.BD01,
    ownerId: USER.MERCHANT_KHALED,
    nameAr: 'مزارع الواحات للتمور',
    nameEn: 'Oasis Date Farms',
    category: 'زراعة',
    descriptionAr:
      'مزارع متخصصة في إنتاج وتصدير أجود أنواع التمور من واحة الداخلة. تضم أكثر من 15,000 نخلة بلح مثمرة من أصناف سيوى والبرحي والمجدول. تصدر منتجاتها لأكثر من 10 دول.',
    district: 'الداخلة',
    phone: '+201100000001',
    logoUrl: '/images/seed/biz-ARpmY5qq7Lk.jpg', // Date palms
    status: 'active',
    verificationStatus: 'verified',
    lat: 25.4946,
    lon: 28.9781,
  },
  {
    id: BUSINESS.BD02,
    ownerId: USER.MERCHANT_KHALED,
    nameAr: 'مصنع زيت الوادي',
    nameEn: 'Valley Oil Factory',
    category: 'تصنيع',
    descriptionAr:
      'مصنع لعصر وتعبئة زيت الزيتون البكر الممتاز من محاصيل الفرافرة. يستخدم تقنية الضغط البارد للحفاظ على خصائص الزيت. الإنتاج السنوي 50 طناً من الزيت العضوي المعتمد.',
    district: 'الفرافرة',
    phone: '+201100000002',
    logoUrl: '/images/seed/biz-WiCo1iTLMRY.jpg', // Olive oil bottles
    status: 'active',
    verificationStatus: 'verified',
    lat: 27.0567,
    lon: 27.9703,
  },
  {
    id: BUSINESS.BD03,
    ownerId: USER.MERCHANT_KHALED,
    nameAr: 'تعاونية الفرافرة الزراعية',
    nameEn: 'Farafra Agricultural Cooperative',
    category: 'زراعة',
    descriptionAr:
      'تعاونية زراعية تضم أكثر من 200 مزارع من واحة الفرافرة لتسويق المحاصيل بأسعار عادلة وتوفير مستلزمات الإنتاج بتكلفة مخفضة. تعمل منذ عام 1985 وهي من أقدم التعاونيات في المنطقة.',
    district: 'الفرافرة',
    phone: '+201100000003',
    logoUrl: '/images/seed/biz-jSYDNAw-P1E.jpg', // Farmers at community farm
    status: 'active',
    verificationStatus: 'verified',
    lat: 27.06,
    lon: 27.965,
  },
  {
    id: BUSINESS.BD04,
    ownerId: USER.MERCHANT_KHALED,
    nameAr: 'شركة الواحة للنقل',
    nameEn: 'Oasis Transport Co.',
    category: 'خدمات',
    descriptionAr:
      'شركة نقل بري تربط واحات الوادي الجديد بالقاهرة وأسيوط. أسطول من 30 سيارة وحافلة، وخدمات شحن بضائع مبردة ومعتادة. ترحيلة يومية من الخارجة للقاهرة في الساعة السادسة صباحاً.',
    district: 'الخارجة',
    phone: '+201100000004',
    logoUrl: '/images/seed/biz-e2Pmt5AzQGs.jpg', // Desert truck
    status: 'active',
    verificationStatus: 'verified',
    lat: 25.4363,
    lon: 30.555,
  },
  {
    id: BUSINESS.BD05,
    ownerId: USER.MERCHANT_KHALED,
    nameAr: 'مخبز الوادي الجديد',
    nameEn: 'New Valley Bakery',
    category: 'تجارة',
    descriptionAr:
      'مخبز تقليدي يقدم الخبز البلدي والمعجنات الطازجة يومياً. يستخدم قمح الوادي الجديد المطحون محلياً. يعمل منذ عام 1992 ويخدم أكثر من 500 أسرة يومياً في الخارجة.',
    district: 'الخارجة',
    phone: '+201100000005',
    logoUrl: '/images/seed/biz-dUtGp6goa7A.jpg', // Fresh bread
    status: 'active',
    verificationStatus: 'verified',
    lat: 25.438,
    lon: 30.553,
  },
];
