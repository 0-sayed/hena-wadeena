import { INVESTMENT, USER } from '../../../../../scripts/seed/shared-ids.js';

export interface SeedInvestment {
  id: string;
  ownerId: string;
  titleAr: string;
  titleEn: string;
  description: string;
  sector:
    | 'agriculture'
    | 'tourism'
    | 'industry'
    | 'real_estate'
    | 'services'
    | 'technology'
    | 'energy';
  area: string;
  minInvestment: number; // piasters
  maxInvestment: number; // piasters
  expectedReturnPct: number;
  paybackPeriodYears: number;
  incentives: string[];
  infrastructure: Record<string, boolean>;
  contact: { entity: string; phone: string; email: string };
  status: 'active';
  isVerified: boolean;
  source: string;
}

// Extra IDs for showcase investments (INV06–INV15) — not cross-service refs
const INV06 = '82a4c6e8-1f30-4b92-9d71-3e5a7c9a1b30';
const INV07 = '93b5d7f9-2a41-4c83-ae82-4f6b8d0c2a41';
const INV08 = 'a4c6e8f0-3b52-4d94-bf93-5a7c9e1b3b52';
const INV09 = 'b5d7f901-4c63-4ea5-ca04-6b8d0f2c4c63';
const INV10 = 'c6e8f012-5d74-4fb6-db15-7c9e1a3d5d74';
const INV11 = 'd7f90123-6e85-40c7-ec26-8d0f2b4e6e85';
const INV12 = 'e8f01234-7f96-41d8-fd37-9e1a3c5f7f96';
const INV13 = 'f9012345-8a07-42e9-0e48-0f2b4d6a8a07';
const INV14 = '01234567-9b18-43fa-1f59-1a3c5e7b9b18';
const INV15 = '12345678-0c29-440b-206a-2b4d6f8c0c29';

/** Essential layer: 2 investments (one industrial, one energy) */
export const essentialInvestments: SeedInvestment[] = [
  {
    id: INVESTMENT.INV01,
    ownerId: USER.INVESTOR_MAHMOUD,
    titleAr: 'مجمع حمض الفوسفوريك أبو طرطور',
    titleEn: 'Abu Tartur Phosphoric Acid Complex',
    description:
      'يقع مجمع أبو طرطور في منطقة الخارجة ويستثمر أحد أكبر احتياطيات الفوسفات في العالم. المشروع يشمل إنشاء مصنع لإنتاج حمض الفوسفوريك والأسمدة الفوسفاتية بطاقة إنتاجية تصل إلى مليون طن سنوياً، مما يجعله منافساً على المستوى العالمي في صناعة الأسمدة. تتوافر البنية التحتية الكاملة من طرق وكهرباء وخط سكك حديدية مربوط بشبكة النقل الوطنية.',
    sector: 'industry',
    area: 'الخارجة',
    minInvestment: 1_000_000_000, // 10M EGP
    maxInvestment: 2_000_000_000, // 20M EGP (int4 ceiling)
    expectedReturnPct: 18.0,
    paybackPeriodYears: 8.0,
    incentives: [
      'إعفاء ضريبي لمدة 10 سنوات',
      'تخصيص أرض بأسعار مخفضة',
      'إعفاء من الرسوم الجمركية على المعدات الرأسمالية',
      'دعم حكومي في البنية التحتية',
    ],
    infrastructure: { electricity: true, water: true, gas: true, road: true, internet: false },
    contact: {
      entity: 'هيئة التنمية الصناعية',
      phone: '+20923000001',
      email: 'invest@ida.gov.eg',
    },
    status: 'active',
    isVerified: true,
    source: 'هيئة التنمية الصناعية — مشروع أبو طرطور',
  },
  {
    id: INVESTMENT.INV02,
    ownerId: USER.INVESTOR_MAHMOUD,
    titleAr: 'محطة طاقة شمسية 4 جيجاوات بالخارجة',
    titleEn: '4 GW Solar Power Station in Kharga',
    description:
      'مشروع ضخم لتوليد الطاقة الشمسية يستفيد من إشعاع شمسي استثنائي يفوق 3400 ساعة سنوياً في الوادي الجديد. المحطة ستوفر طاقة نظيفة لملايين الأسر المصرية وتسهم في تحقيق أهداف مصر للطاقة المتجددة 2035. الموقع مسطح تماماً ومناخه مثالي للألواح الكهروضوئية.',
    sector: 'energy',
    area: 'الخارجة',
    minInvestment: 500_000_000, // 5M EGP
    maxInvestment: 2_000_000_000, // 20M EGP (int4 ceiling)
    expectedReturnPct: 12.0,
    paybackPeriodYears: 12.0,
    incentives: [
      'اتفاقية شراء الطاقة مع الحكومة',
      'إعفاء ضريبي لمدة 15 سنة',
      'توفير أرض مجاناً لمدة 50 سنة',
      'ضمان سعر بيع ثابت للكيلوواط',
    ],
    infrastructure: { electricity: true, water: false, gas: false, road: true, internet: true },
    contact: {
      entity: 'الهيئة العامة للاستثمار والمناطق الحرة (جافي)',
      phone: '+20923000002',
      email: 'energy@gafi.gov.eg',
    },
    status: 'active',
    isVerified: true,
    source: 'وزارة الكهرباء والطاقة المتجددة',
  },
];

/** Showcase layer: additional investments */
export const showcaseInvestments: SeedInvestment[] = [
  {
    id: INVESTMENT.INV03,
    ownerId: USER.INVESTOR_MAHMOUD,
    titleAr: 'مشروع 2.5 مليون نخلة تمور بالداخلة',
    titleEn: '2.5 Million Date Palm Project in Dakhla',
    description:
      'مشروع قومي لاستصلاح الأراضي وزراعة 2.5 مليون نخلة تمور في واحة الداخلة التي تتميز بتربتها الخصبة ومياهها الجوفية الوفيرة. يُتوقع أن يضع مصر ضمن كبار منتجي التمور عالمياً بحلول 2030. المشروع يشمل محطات تعبئة وتغليف وخطوط تصدير مباشرة.',
    sector: 'agriculture',
    area: 'الداخلة',
    minInvestment: 200_000_000, // 2M EGP
    maxInvestment: 1_000_000_000, // 10M EGP
    expectedReturnPct: 22.0,
    paybackPeriodYears: 7.0,
    incentives: [
      'أرض زراعية مجانية لمدة 25 سنة',
      'قرض ميسر من البنك الزراعي المصري',
      'إعفاء من ضريبة الدخل 5 سنوات',
      'دعم خدمات ري بالتنقيط',
    ],
    infrastructure: { electricity: true, water: true, gas: false, road: true, internet: false },
    contact: {
      entity: 'وزارة الزراعة واستصلاح الأراضي',
      phone: '+20923000003',
      email: 'agri@nvgov.eg',
    },
    status: 'active',
    isVerified: true,
    source: 'مشروع توشكى ونيو فالي الزراعي',
  },
  {
    id: INVESTMENT.INV04,
    ownerId: USER.INVESTOR_MAHMOUD,
    titleAr: 'مشروع زراعة الزيتون الضخم بالفرافرة',
    titleEn: 'Large-Scale Olive Cultivation Project in Farafra',
    description:
      'مزارع زيتون واسعة النطاق تستفيد من المناخ الجاف ونظافة بيئة الفرافرة لإنتاج زيت زيتون عضوي فاخر. المشروع يضم مصانع عصر وتعبئة متكاملة، وتُصدر منتجاته إلى الأسواق الأوروبية والخليجية. تتميز الفرافرة بأعلى إنتاجية لفدان الزيتون في مصر.',
    sector: 'agriculture',
    area: 'الفرافرة',
    minInvestment: 300_000_000, // 3M EGP
    maxInvestment: 1_500_000_000, // 15M EGP
    expectedReturnPct: 20.0,
    paybackPeriodYears: 6.0,
    incentives: [
      'إعفاء ضريبي 10 سنوات للمحاصيل التصديرية',
      'دعم شهادات الجودة الأوروبية',
      'تخصيص أرض بسعر رمزي',
    ],
    infrastructure: { electricity: true, water: true, gas: false, road: true, internet: false },
    contact: {
      entity: 'الهيئة العامة للاستثمار والمناطق الحرة (جافي)',
      phone: '+20923000004',
      email: 'invest@gafi.gov.eg',
    },
    status: 'active',
    isVerified: true,
    source: 'هيئة الاستثمار — محافظة الوادي الجديد',
  },
  {
    id: INVESTMENT.INV05,
    ownerId: USER.INVESTOR_MAHMOUD,
    titleAr: 'منتجع سياحة علاجية بالعيون الحارة بالداخلة',
    titleEn: 'Medical Tourism Resort at Dakhla Hot Springs',
    description:
      'منتجع صحي فاخر يستثمر العيون الكبريتية الحارة في واحة الداخلة المشهورة بفوائدها العلاجية للروماتيزم والأمراض الجلدية. يضم المنتجع فنادق، وحمامات علاجية، وعيادات متخصصة، ويستهدف السياح الأوروبيين والخليجيين الباحثين عن علاج طبيعي.',
    sector: 'tourism',
    area: 'الداخلة',
    minInvestment: 100_000_000, // 1M EGP
    maxInvestment: 500_000_000, // 5M EGP
    expectedReturnPct: 25.0,
    paybackPeriodYears: 5.0,
    incentives: [
      'تصنيف "مشروع سياحي متميز" من وزارة السياحة',
      'دعم التسويق الدولي',
      'إعفاء ضريبي 7 سنوات',
    ],
    infrastructure: { electricity: true, water: true, gas: false, road: true, internet: true },
    contact: {
      entity: 'وزارة السياحة والآثار',
      phone: '+20923000005',
      email: 'invest@tourism.gov.eg',
    },
    status: 'active',
    isVerified: true,
    source: 'مبادرة سياحة الشفاء — الوادي الجديد',
  },
  {
    id: INV06,
    ownerId: USER.INVESTOR_MAHMOUD,
    titleAr: 'مدينة سكنية جديدة بمنطقة أبو طرطور',
    titleEn: 'New Residential City at Abu Tartur Zone',
    description:
      'مدينة سكنية متكاملة تستوعب عمال المشاريع الصناعية في منطقة أبو طرطور. تشمل وحدات سكنية بأسعار متنوعة، ومدارس، ومستشفى، ومراكز تجارية. المشروع ضمن خطة الدولة لتخفيف الضغط عن وادي النيل وتنمية الصحراء الغربية.',
    sector: 'real_estate',
    area: 'الخارجة',
    minInvestment: 2_000_000_000, // 20M EGP
    maxInvestment: 2_000_000_000, // 20M EGP (int4 ceiling)
    expectedReturnPct: 15.0,
    paybackPeriodYears: 10.0,
    incentives: [
      'أراضي مخصصة بقرار وزاري',
      'بنية تحتية مكتملة على حساب الدولة',
      'إعفاء ضريبي للمطورين 10 سنوات',
      'قروض رهن عقاري ميسرة للمشترين',
    ],
    infrastructure: { electricity: true, water: true, gas: true, road: true, internet: true },
    contact: {
      entity: 'هيئة المجتمعات العمرانية الجديدة',
      phone: '+20923000006',
      email: 'invest@newcities.gov.eg',
    },
    status: 'active',
    isVerified: true,
    source: 'هيئة المجتمعات العمرانية الجديدة',
  },
  {
    id: INV07,
    ownerId: USER.INVESTOR_MAHMOUD,
    titleAr: 'مجمع صناعات غذائية متكامل بالداخلة',
    titleEn: 'Integrated Food Processing Complex in Dakhla',
    description:
      'مجمع صناعي يضم خطوط تصنيع لتعبئة التمور والزيتون والمنتجات الزراعية المحلية. يستهدف تصدير 60% من إنتاجه لأسواق الشرق الأوسط وأوروبا. يوفر المجمع نحو 500 فرصة عمل مباشرة ويساهم في تطوير سلاسل إمداد زراعية متكاملة.',
    sector: 'industry',
    area: 'الداخلة',
    minInvestment: 500_000_000, // 5M EGP
    maxInvestment: 2_000_000_000, // 20M EGP (int4 ceiling)
    expectedReturnPct: 19.0,
    paybackPeriodYears: 7.0,
    incentives: [
      'إعفاء جمركي على خطوط الإنتاج',
      'دعم التصدير من صندوق تنمية الصادرات',
      'إعفاء ضريبي 5 سنوات',
    ],
    infrastructure: { electricity: true, water: true, gas: true, road: true, internet: true },
    contact: {
      entity: 'هيئة التنمية الصناعية',
      phone: '+20923000007',
      email: 'industry@nvgov.eg',
    },
    status: 'active',
    isVerified: true,
    source: 'هيئة التنمية الصناعية — إقليم الصعيد',
  },
  {
    id: INV08,
    ownerId: USER.INVESTOR_MAHMOUD,
    titleAr: 'محطة تحلية مياه بالطاقة الشمسية بالفرافرة',
    titleEn: 'Solar-Powered Water Desalination Plant in Farafra',
    description:
      'محطة تحلية تجمع بين تقنيتي الطاقة الشمسية وتحلية المياه لإنتاج مياه نقية بتكلفة منخفضة ودون انبعاثات كربونية. ستخدم الفرافرة وباريس وستُعزز الاستدامة الزراعية في المنطقة. المشروع نموذج لحلول المياه في المناطق الصحراوية النامية.',
    sector: 'technology',
    area: 'الفرافرة',
    minInvestment: 200_000_000, // 2M EGP
    maxInvestment: 1_000_000_000, // 10M EGP
    expectedReturnPct: 14.0,
    paybackPeriodYears: 9.0,
    incentives: [
      'تعاقد مضمون لبيع المياه لمحافظة الوادي الجديد',
      'إعفاء ضريبي 10 سنوات',
      'دعم من صندوق مصر للتنمية المستدامة',
    ],
    infrastructure: { electricity: false, water: false, gas: false, road: true, internet: false },
    contact: {
      entity: 'شركة مياه الشرب والصرف الصحي بالوادي الجديد',
      phone: '+20923000008',
      email: 'water@nvgov.eg',
    },
    status: 'active',
    isVerified: true,
    source: 'شركة مياه الشرب بالوادي الجديد',
  },
  {
    id: INV09,
    ownerId: USER.INVESTOR_MAHMOUD,
    titleAr: 'مشروع إيكو لودج صحراوي بالفرافرة',
    titleEn: 'Desert Eco-Lodge Project in Farafra',
    description:
      'سلسلة من الإيكو لودج المتناثرة في الصحراء البيضاء، مصممة من مواد طينية محلية وتعمل بالطاقة الشمسية بالكامل. تستهدف سياح المغامرات الأوروبيين والأمريكيين ومحبي السفر المستدام. حجوزات مسبقة لمدة 18 شهراً تثبت الطلب القوي على هذا المنتج.',
    sector: 'tourism',
    area: 'الفرافرة',
    minInvestment: 50_000_000, // 500K EGP
    maxInvestment: 200_000_000, // 2M EGP
    expectedReturnPct: 30.0,
    paybackPeriodYears: 4.0,
    incentives: [
      'تصريح بناء مسرّع في المناطق السياحية',
      'شراكة تسويقية مع وزارة السياحة',
      'إعفاء ضريبي 5 سنوات',
    ],
    infrastructure: { electricity: false, water: false, gas: false, road: true, internet: false },
    contact: {
      entity: 'اتحاد غرف السياحة المصرية',
      phone: '+20923000009',
      email: 'tourism@nvgov.eg',
    },
    status: 'active',
    isVerified: true,
    source: 'اتحاد غرف السياحة المصرية',
  },
  {
    id: INV10,
    ownerId: USER.INVESTOR_MAHMOUD,
    titleAr: 'مزرعة أعشاب طبية وعطرية ببلاط',
    titleEn: 'Medicinal and Aromatic Herb Farm in Balat',
    description:
      'مزرعة متخصصة في زراعة الأعشاب الطبية والعطرية في بلاط، المشهورة بتربتها الخصبة ومياهها الجوفية النقية. تشمل مصنعاً للتقطير واستخلاص الزيوت الأساسية المصدرة للصيدليات والشركات الدوائية. الطلب العالمي على الأعشاب العضوية في ارتفاع مستمر.',
    sector: 'agriculture',
    area: 'بلاط',
    minInvestment: 30_000_000, // 300K EGP
    maxInvestment: 150_000_000, // 1.5M EGP
    expectedReturnPct: 28.0,
    paybackPeriodYears: 4.0,
    incentives: [
      'شهادة عضوية دولية مدعومة',
      'قرض ميسر من البنك الزراعي',
      'إعفاء ضريبي للمنتجات التصديرية',
    ],
    infrastructure: { electricity: true, water: true, gas: false, road: true, internet: false },
    contact: {
      entity: 'محافظة الوادي الجديد — مديرية الزراعة',
      phone: '+20923000010',
      email: 'agri@balat.nvgov.eg',
    },
    status: 'active',
    isVerified: true,
    source: 'مديرية الزراعة — محافظة الوادي الجديد',
  },
  {
    id: INV11,
    ownerId: USER.INVESTOR_MAHMOUD,
    titleAr: 'مصنع تعبئة وتغليف التمور بالداخلة',
    titleEn: 'Date Packaging and Processing Factory in Dakhla',
    description:
      'مصنع متكامل لفرز وغسيل وتعبئة وتغليف التمور بمعايير التصدير إلى الاتحاد الأوروبي وأمريكا الشمالية. يخدم مزارعي الداخلة وتوشكى ويقلل الفاقد في ما بعد الحصاد. يوفر 200 وظيفة مباشرة ويرفع القيمة المضافة للمنتج المحلي.',
    sector: 'industry',
    area: 'الداخلة',
    minInvestment: 100_000_000, // 1M EGP
    maxInvestment: 500_000_000, // 5M EGP
    expectedReturnPct: 21.0,
    paybackPeriodYears: 5.0,
    incentives: [
      'دعم التصدير من الحكومة',
      'إعفاء جمركي على معدات التعبئة',
      'دعم البنية التحتية للمصانع الصغيرة',
    ],
    infrastructure: { electricity: true, water: true, gas: false, road: true, internet: true },
    contact: {
      entity: 'هيئة التنمية الصناعية',
      phone: '+20923000011',
      email: 'dates@nvgov.eg',
    },
    status: 'active',
    isVerified: true,
    source: 'هيئة التنمية الصناعية',
  },
  {
    id: INV12,
    ownerId: USER.INVESTOR_MAHMOUD,
    titleAr: 'مشروع استزراع سمكي متكامل بباريس',
    titleEn: 'Integrated Fish Farming Project in Baris',
    description:
      'مزارع أسماك تستخدم المياه الجوفية الدافئة في باريس لاستزراع البلطي والقاروص طوال العام. يستهدف تلبية الطلب المحلي في المحافظة وتصدير الفائض لأسواق الصعيد. المياه الجوفية في باريس تتميز بحرارة مثالية لنمو الأسماك دون حاجة لتكاليف تدفئة.',
    sector: 'agriculture',
    area: 'باريس',
    minInvestment: 50_000_000, // 500K EGP
    maxInvestment: 250_000_000, // 2.5M EGP
    expectedReturnPct: 26.0,
    paybackPeriodYears: 4.0,
    incentives: [
      'قرض ميسر من هيئة الثروة السمكية',
      'تدريب مجاني للعمالة المحلية',
      'إعفاء ضريبي 5 سنوات',
    ],
    infrastructure: { electricity: true, water: true, gas: false, road: true, internet: false },
    contact: {
      entity: 'هيئة تنمية الثروة السمكية',
      phone: '+20923000012',
      email: 'fish@nvgov.eg',
    },
    status: 'active',
    isVerified: true,
    source: 'هيئة تنمية الثروة السمكية',
  },
  {
    id: INV13,
    ownerId: USER.INVESTOR_MAHMOUD,
    titleAr: 'مجمع خدمات لوجستية بالخارجة',
    titleEn: 'Logistics Services Complex in Kharga',
    description:
      'مجمع لوجستي متكامل يضم مستودعات مبردة، وشركات شحن وتوزيع، وخدمات جمركية لتسهيل تدفق البضائع بين الوادي الجديد ووادي النيل. يستثمر موقع الخارجة كنقطة تقاطع طرق رئيسية. المجمع يقلل تكاليف لوجستيات المنتجات الزراعية بنسبة تصل إلى 30%.',
    sector: 'services',
    area: 'الخارجة',
    minInvestment: 300_000_000, // 3M EGP
    maxInvestment: 1_500_000_000, // 15M EGP
    expectedReturnPct: 16.0,
    paybackPeriodYears: 7.0,
    incentives: [
      'إعفاء من رسوم الأراضي الصناعية',
      'اتفاقية تشغيل مع الهيئة القومية للطرق',
      'إعفاء ضريبي 5 سنوات',
    ],
    infrastructure: { electricity: true, water: true, gas: false, road: true, internet: true },
    contact: {
      entity: 'محافظة الوادي الجديد',
      phone: '+20923000013',
      email: 'logistics@nvgov.eg',
    },
    status: 'active',
    isVerified: true,
    source: 'الهيئة العامة للاستثمار والمناطق الحرة (جافي)',
  },
  {
    id: INV14,
    ownerId: USER.INVESTOR_MAHMOUD,
    titleAr: 'مشروع سياحة المغامرات الصحراوية بالفرافرة',
    titleEn: 'Desert Adventure Tourism Project in Farafra',
    description:
      'شركة متخصصة في رحلات المغامرات الصحراوية تشمل السفاري بالدراجات الرباعية، والتخييم الليلي في الصحراء البيضاء، وركوب الجمال، والتصوير الفوتوغرافي. تستهدف السياح الأجانب والمصريين الباحثين عن تجارب أصيلة. الفرافرة تحتل مرتبة بين أفضل 50 وجهة سياحية في أفريقيا.',
    sector: 'tourism',
    area: 'الفرافرة',
    minInvestment: 20_000_000, // 200K EGP
    maxInvestment: 100_000_000, // 1M EGP
    expectedReturnPct: 35.0,
    paybackPeriodYears: 3.0,
    incentives: [
      'شراكة تسويقية مع وزارة السياحة',
      'تيسير الحصول على تراخيص السياحة',
      'إعفاء ضريبي 5 سنوات',
    ],
    infrastructure: { electricity: false, water: false, gas: false, road: true, internet: false },
    contact: {
      entity: 'اتحاد مرشدي السياحة — محافظة الوادي الجديد',
      phone: '+20923000014',
      email: 'adventure@nvgov.eg',
    },
    status: 'active',
    isVerified: true,
    source: 'اتحاد مرشدي السياحة المصريين',
  },
  {
    id: INV15,
    ownerId: USER.INVESTOR_MAHMOUD,
    titleAr: 'مزرعة طاقة شمسية مجتمعية ببلاط',
    titleEn: 'Community Solar Farm in Balat',
    description:
      'مزرعة شمسية صغيرة الحجم تخدم مجتمعات بلاط والقرى المحيطة بتقنية الإنتاج الموزع. يمكن للمستثمرين الأفراد امتلاك حصص من الألواح الشمسية والحصول على عوائد شهرية من بيع الكهرباء. نموذج مبتكر يجمع بين التمكين المجتمعي والعائد الاقتصادي الجيد.',
    sector: 'energy',
    area: 'بلاط',
    minInvestment: 10_000_000, // 100K EGP
    maxInvestment: 50_000_000, // 500K EGP
    expectedReturnPct: 10.0,
    paybackPeriodYears: 8.0,
    incentives: [
      'عقود بيع طاقة لـ 20 سنة',
      'إعفاء ضريبي على العوائد',
      'دعم من مبادرة الطاقة الشمسية المجتمعية',
    ],
    infrastructure: { electricity: true, water: false, gas: false, road: true, internet: false },
    contact: {
      entity: 'وزارة الكهرباء والطاقة المتجددة',
      phone: '+20923000015',
      email: 'solar@nvgov.eg',
    },
    status: 'active',
    isVerified: true,
    source: 'وزارة الكهرباء والطاقة المتجددة',
  },
];
