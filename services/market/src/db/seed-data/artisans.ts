import { ARTISAN, ARTISAN_PRODUCT, USER } from '../../../../../scripts/seed/shared-ids.js';

export interface SeedArtisanProfile {
  id: string;
  userId: string;
  nameAr: string;
  nameEn: string | null;
  bioAr: string | null;
  bioEn: string | null;
  craftTypes: string[];
  area: string;
  whatsapp: string;
  profileImageKey: string | null;
  verifiedAt: string | null;
}

export interface SeedArtisanProduct {
  id: string;
  artisanId: string;
  nameAr: string;
  nameEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  craftType: string;
  price: number | null;
  minOrderQty: number;
  imageKeys: string[];
  available: boolean;
}

export const essentialArtisanProfiles: SeedArtisanProfile[] = [
  {
    id: ARTISAN.FATIMA_KHARGA,
    userId: USER.TOURIST_SALMA,
    nameAr: 'فاطمة محمد',
    nameEn: 'Fatima Mohamed',
    bioAr:
      'حرفية متخصصة في صناعة سعف النخيل منذ أكثر من عشرين عاماً في الخارجة. تُعلّم بناتها وجارتها هذا الفن الأصيل لتُبقي الموروث الثقافي حياً.',
    bioEn:
      'Palm leaf artisan with over twenty years of experience in Kharga. She teaches her daughters and neighbors this ancient craft to keep cultural heritage alive.',
    craftTypes: ['palm_leaf'],
    area: 'kharga',
    whatsapp: '+201001000001',
    profileImageKey: '/images/artisans/fatima-profile.jpg',
    verifiedAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: ARTISAN.AISHA_DAKHLA,
    userId: USER.RESIDENT_MOHAMED,
    nameAr: 'عائشة سالم',
    nameEn: 'Aisha Salem',
    bioAr:
      'تصنع الفخار الغرة بتقنيات تقليدية موروثة جيلاً بعد جيل في الداخلة. حصلت على جائزة المرأة المنتجة من مديرية التضامن الاجتماعي.',
    bioEn:
      'Creates Garra pottery using traditional techniques passed down through generations in Dakhla. She received the Productive Woman award from the Social Solidarity Directorate.',
    craftTypes: ['pottery'],
    area: 'dakhla',
    whatsapp: '+201001000002',
    profileImageKey: '/images/artisans/aisha-profile.jpg',
    verifiedAt: '2026-01-20T10:00:00.000Z',
  },
  {
    id: ARTISAN.MARYAM_FARAFRA,
    userId: USER.STUDENT_NOUR,
    nameAr: 'مريم أحمد',
    nameEn: 'Maryam Ahmed',
    bioAr:
      'تنسج الكليم الواحاتي بألوان طبيعية مستخرجة من نباتات الصحراء. أسّست مجموعة نسائية صغيرة لإحياء فن النسيج في فرافرة.',
    bioEn:
      "Weaves oasis kilim rugs with natural dyes extracted from desert plants. She founded a small women's group to revive the weaving craft in Farafra.",
    craftTypes: ['kilim'],
    area: 'farafra',
    whatsapp: '+201001000003',
    profileImageKey: '/images/artisans/maryam-profile.jpg',
    verifiedAt: '2026-02-01T10:00:00.000Z',
  },
  {
    id: ARTISAN.KHADIJA_BARIS,
    userId: USER.MERCHANT_KHALED,
    nameAr: 'خديجة عبد الرحمن',
    nameEn: 'Khadija Abdel Rahman',
    bioAr:
      'متخصصة في التطريز الواحاتي على الملابس التقليدية والمفارش. تُدير ورشة منزلية تُوظّف فيها عشر سيدات من الحي.',
    bioEn:
      'Specializes in oasis embroidery on traditional garments and textiles. She runs a home workshop employing ten women from her neighborhood.',
    craftTypes: ['embroidery'],
    area: 'baris',
    whatsapp: '+201001000004',
    profileImageKey: '/images/artisans/khadija-profile.jpg',
    verifiedAt: null,
  },
  {
    id: ARTISAN.ZAHRA_BALAT,
    userId: USER.DRIVER_AMRO,
    nameAr: 'زهراء علي',
    nameEn: 'Zahra Ali',
    bioAr:
      'تجمع بين فن سعف النخيل والفخار لإنتاج تحف منزلية فريدة من قرية بلاط. فازت منتجاتها بأول جائزة في معرض الحرف الواحاتي الإقليمي.',
    bioEn:
      'Combines palm leaf weaving and pottery to create unique home pieces from Balat village. Her products won first prize at the regional oasis crafts fair.',
    craftTypes: ['palm_leaf', 'pottery'],
    area: 'balat',
    whatsapp: '+201001000005',
    profileImageKey: '/images/artisans/zahra-profile.jpg',
    verifiedAt: '2026-02-10T10:00:00.000Z',
  },
];

export const essentialArtisanProducts: SeedArtisanProduct[] = [
  {
    id: ARTISAN_PRODUCT.PALM_BASKET_1,
    artisanId: ARTISAN.FATIMA_KHARGA,
    nameAr: 'سلة نخيل كبيرة',
    nameEn: 'Large Palm Basket',
    descriptionAr: 'سلة مصنوعة يدوياً من سعف النخيل المجفف، مناسبة للتسوق والتزيين.',
    descriptionEn: 'Handmade from dried palm leaves, suitable for shopping and decoration.',
    craftType: 'palm_leaf',
    price: 15000,
    minOrderQty: 1,
    imageKeys: ['/images/artisans/palm-basket-1.jpg'],
    available: true,
  },
  {
    id: ARTISAN_PRODUCT.PALM_BASKET_2,
    artisanId: ARTISAN.FATIMA_KHARGA,
    nameAr: 'سلة نخيل صغيرة',
    nameEn: 'Small Palm Basket',
    descriptionAr: 'سلة صغيرة مضفورة يدوياً، هدية مثالية.',
    descriptionEn: 'Small hand-braided basket, a perfect gift.',
    craftType: 'palm_leaf',
    price: 8000,
    minOrderQty: 5,
    imageKeys: ['/images/artisans/palm-basket-2.jpg'],
    available: true,
  },
  {
    id: ARTISAN_PRODUCT.GARRA_POTTERY_1,
    artisanId: ARTISAN.AISHA_DAKHLA,
    nameAr: 'إبريق فخار غرة',
    nameEn: 'Garra Pottery Jug',
    descriptionAr: 'إبريق تقليدي مصنوع من طين الواحات بأسلوب الغرة العتيقة.',
    descriptionEn: 'Traditional jug made from oasis clay in the ancient Garra style.',
    craftType: 'pottery',
    price: 25000,
    minOrderQty: 1,
    imageKeys: ['/images/artisans/pottery.jpg'],
    available: true,
  },
  {
    id: ARTISAN_PRODUCT.GARRA_POTTERY_2,
    artisanId: ARTISAN.AISHA_DAKHLA,
    nameAr: 'صحن فخار مزخرف',
    nameEn: 'Decorated Pottery Plate',
    descriptionAr: 'صحن للتزيين بنقوش تقليدية واحاتية.',
    descriptionEn: 'Decorative plate with traditional oasis motifs.',
    craftType: 'pottery',
    price: 18000,
    minOrderQty: 2,
    imageKeys: ['/images/artisans/pottery.jpg'],
    available: true,
  },
  {
    id: ARTISAN_PRODUCT.KILIM_1,
    artisanId: ARTISAN.MARYAM_FARAFRA,
    nameAr: 'كليم واحاتي صغير',
    nameEn: 'Small Oasis Kilim',
    descriptionAr: 'كليم مصبوغ طبيعياً بأنماط هندسية بربرية، مقاس 60×90 سم.',
    descriptionEn: 'Naturally dyed kilim with Berber geometric patterns, 60×90 cm.',
    craftType: 'kilim',
    price: 45000,
    minOrderQty: 1,
    imageKeys: ['/images/artisans/kilim-small.jpg'],
    available: true,
  },
  {
    id: ARTISAN_PRODUCT.KILIM_2,
    artisanId: ARTISAN.MARYAM_FARAFRA,
    nameAr: 'كليم واحاتي كبير',
    nameEn: 'Large Oasis Kilim',
    descriptionAr: 'كليم فاخر مصبوغ طبيعياً، مقاس 120×180 سم، مناسب للجلوس.',
    descriptionEn: 'Premium naturally dyed kilim, 120×180 cm, suitable as a sitting rug.',
    craftType: 'kilim',
    price: 120000,
    minOrderQty: 1,
    imageKeys: ['/images/artisans/kilim-large.jpg'],
    available: true,
  },
  {
    id: ARTISAN_PRODUCT.EMBROIDERY_1,
    artisanId: ARTISAN.KHADIJA_BARIS,
    nameAr: 'طرحة مطرزة واحاتية',
    nameEn: 'Embroidered Oasis Headscarf',
    descriptionAr: 'طرحة من القطن المطرز بخيوط ملونة بأنماط واحاتية تقليدية.',
    descriptionEn:
      'Cotton headscarf embroidered with colored threads in traditional oasis patterns.',
    craftType: 'embroidery',
    price: 12000,
    minOrderQty: 3,
    imageKeys: ['/images/artisans/embroidery.jpg'],
    available: true,
  },
  {
    id: ARTISAN_PRODUCT.EMBROIDERY_2,
    artisanId: ARTISAN.KHADIJA_BARIS,
    nameAr: 'مفرش مطرز للسفرة',
    nameEn: 'Embroidered Table Runner',
    descriptionAr: 'مفرش طاولة مصنوع يدوياً بتطريز واحاتي غني.',
    descriptionEn: 'Handmade table runner with rich oasis embroidery.',
    craftType: 'embroidery',
    price: 22000,
    minOrderQty: 1,
    imageKeys: ['/images/artisans/embroidery-threads.jpg'],
    available: true,
  },
  {
    id: ARTISAN_PRODUCT.PALM_TRAY_1,
    artisanId: ARTISAN.ZAHRA_BALAT,
    nameAr: 'صينية سعف النخيل',
    nameEn: 'Palm Leaf Tray',
    descriptionAr: 'صينية مستديرة من سعف النخيل المنسوج، للتقديم أو الزينة.',
    descriptionEn: 'Round woven palm leaf tray, for serving or decoration.',
    craftType: 'palm_leaf',
    price: 10000,
    minOrderQty: 5,
    imageKeys: ['/images/artisans/palm-basket-1.jpg'],
    available: true,
  },
  {
    id: ARTISAN_PRODUCT.POTTERY_VASE_1,
    artisanId: ARTISAN.ZAHRA_BALAT,
    nameAr: 'مزهرية فخار واحاتية',
    nameEn: 'Oasis Pottery Vase',
    descriptionAr: 'مزهرية من طين بلاط مع زخارف ملونة يدوياً.',
    descriptionEn: 'Vase from Balat clay with hand-painted decorations.',
    craftType: 'pottery',
    price: 30000,
    minOrderQty: 1,
    imageKeys: ['/images/artisans/pottery.jpg'],
    available: true,
  },
];
