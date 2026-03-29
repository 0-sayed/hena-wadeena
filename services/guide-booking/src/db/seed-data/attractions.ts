import { ATTRACTION } from '../../../../../scripts/seed/shared-ids.js';

export interface SeedAttraction {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  type: 'attraction' | 'historical' | 'natural' | 'festival' | 'adventure';
  area: 'kharga' | 'dakhla' | 'farafra' | 'baris' | 'balat';
  descriptionAr: string;
  descriptionEn: string;
  historyAr?: string;
  bestSeason: 'winter' | 'summer' | 'spring' | 'all_year';
  bestTimeOfDay: 'morning' | 'evening' | 'any';
  entryFee: { adults_egp: number; children_egp: number } | null;
  openingHours: string;
  durationHours: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  tips: string[];
  nearbySlugs: string[];
  lat: number;
  lon: number;
  isActive: true;
  isFeatured: boolean;
}

// Extra IDs for showcase attractions (A11–A25) — not cross-service refs
const A11 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567811';
const A12 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567812';
const A13 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567813';
const A14 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567814';
const A15 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567815';
const A16 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567816';
const A17 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567817';
const A18 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567818';
const A19 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567819';
const A20 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567820';
const A21 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567821';
const A22 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567822';
const A23 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567823';
const A24 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567824';
const A25 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567825';

/** Essential layer: 3 attractions (one per type) */
export const essentialAttractions: SeedAttraction[] = [
  {
    id: ATTRACTION.A01,
    nameAr: 'معبد هيبس',
    nameEn: 'Temple of Hibis',
    slug: 'temple-of-hibis',
    type: 'historical',
    area: 'kharga',
    descriptionAr:
      'أكبر معبد في واحة الخارجة، يعود تاريخه إلى 550 قبل الميلاد في العصر الفارسي. يُعد أفضل المعابد المحفوظة من العصر الفارسي في مصر، وهو مكرس للإله آمون.',
    descriptionEn:
      'The largest temple in Kharga Oasis, dating to 550 BC. Best-preserved Persian-era temple in Egypt, dedicated to Amun.',
    historyAr:
      'بُني المعبد في عهد الملك الفارسي داريوس الأول، ويقع على بعد 2 كم شمال مدينة الخارجة. يتميز بنقوشه الفريدة التي تجمع بين الفن المصري والفارسي.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: { adults_egp: 6000, children_egp: 3000 },
    openingHours: '8:00 - 17:00',
    durationHours: 2,
    difficulty: 'easy',
    tips: [
      'يُنصح بزيارة المعبد في الصباح الباكر لتجنب الحرارة',
      'أحضر ماءً كافياً وقبعة للحماية من الشمس',
    ],
    nearbySlugs: ['bagawat-necropolis', 'nadura-temple'],
    lat: 25.452,
    lon: 30.547,
    isActive: true,
    isFeatured: true,
  },
  {
    id: ATTRACTION.A02,
    nameAr: 'الصحراء البيضاء',
    nameEn: 'White Desert National Park',
    slug: 'white-desert',
    type: 'natural',
    area: 'farafra',
    descriptionAr:
      'محمية طبيعية تمتد على مساحة 300 كم² تتميز بتشكيلات صخرية بيضاء من الطباشير نحتتها الرياح على شكل فطر ومخروطات وخيام. أجمل المناظر عند شروق وغروب الشمس.',
    descriptionEn:
      'A 300 km² protected area with surreal white chalk formations shaped like mushrooms and cones by wind erosion. Best at sunrise/sunset.',
    bestSeason: 'winter',
    bestTimeOfDay: 'evening',
    entryFee: null,
    openingHours: '8:00 - 20:00',
    durationHours: 8,
    difficulty: 'moderate',
    tips: [
      'التخييم ليلاً تجربة لا تُنسى',
      'يجب الذهاب مع مرشد محلي ذو خبرة بالصحراء',
      'أحضر ملابس دافئة لليل الصحراء',
    ],
    nearbySlugs: ['crystal-mountain', 'agabat-valley', 'black-desert'],
    lat: 27.25,
    lon: 28.05,
    isActive: true,
    isFeatured: true,
  },
  {
    id: ATTRACTION.A03,
    nameAr: 'القصر القديمة',
    nameEn: 'Al-Qasr Old Town',
    slug: 'al-qasr-old-town',
    type: 'historical',
    area: 'dakhla',
    descriptionAr:
      'بلدة محصنة من القرن الثاني عشر بنيت على أنقاض حصن روماني. متاهة من الأزقة الضيقة بجدران طينية ونقوش خشبية. تشتهر بمئذنة مسجد نصر الدين الخشبية التي بنيت بدون مسامير معدنية.',
    descriptionEn:
      'A 12th-century Ayyubid fortified town built on Roman fort remains. Famous for its wooden minaret built without nails.',
    historyAr:
      'يعود أصل البلدة إلى الفترة الأيوبية في القرن الثاني عشر الميلادي، وتحتوي على مئذنة مسجد نصر الدين المبنية بالكامل من الخشب دون استخدام مسمار واحد.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: null,
    openingHours: '8:00 - 18:00',
    durationHours: 3,
    difficulty: 'easy',
    tips: [
      'استمتع بالتجول في الأزقة الضيقة',
      'قم بزيارة المئذنة الخشبية الفريدة',
      'يوجد حرفيون محليون يصنعون الفخار والسلال',
    ],
    nearbySlugs: ['deir-el-hagar', 'muzawwaqa-tombs'],
    lat: 25.7,
    lon: 28.888,
    isActive: true,
    isFeatured: true,
  },
];

/** Showcase layer: additional attractions */
export const showcaseAttractions: SeedAttraction[] = [
  // ── Kharga ──────────────────────────────────────────────────────
  {
    id: ATTRACTION.A04,
    nameAr: 'جبانة البجوات',
    nameEn: 'Bagawat Necropolis',
    slug: 'bagawat-necropolis',
    type: 'historical',
    area: 'kharga',
    descriptionAr:
      'أقدم وأكبر جبانة مسيحية في العالم، تعود للقرن الرابع الميلادي. تضم أكثر من 260 مقبرة مسيحية بقباب من الطوب اللبن مزينة بلوحات تصويرية رائعة.',
    descriptionEn:
      'One of the oldest and largest Christian cemeteries in the world, dating to the 4th century. Contains 260+ chapels with remarkable painted murals.',
    historyAr:
      'تُعد جبانة البجوات شاهداً فريداً على الوجود المسيحي المبكر في مصر وتطور الفن المسيحي القبطي.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: { adults_egp: 6000, children_egp: 3000 },
    openingHours: '8:00 - 17:00',
    durationHours: 2,
    difficulty: 'easy',
    tips: ['الظل محدود، احضر قبعة', 'ارتدِ أحذية مريحة للمشي على الرمال'],
    nearbySlugs: ['temple-of-hibis', 'nadura-temple'],
    lat: 25.458,
    lon: 30.544,
    isActive: true,
    isFeatured: true,
  },
  {
    id: ATTRACTION.A05,
    nameAr: 'قصر الغويطة',
    nameEn: 'Qasr al-Ghuytta',
    slug: 'qasr-al-ghuytta',
    type: 'historical',
    area: 'kharga',
    descriptionAr:
      'معبد فرعوني على قمة هضبة، يعود إلى عهد الأسرة التاسعة والعشرين الفرعونية. يُهيمن على المنطقة المحيطة ويوفر مناظر بانورامية خلابة للواحة.',
    descriptionEn:
      'A Pharaonic temple on a hilltop from the 29th Dynasty. Dominates the surrounding area with panoramic views of the oasis.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: { adults_egp: 4000, children_egp: 2000 },
    openingHours: '8:00 - 17:00',
    durationHours: 1.5,
    difficulty: 'moderate',
    tips: ['التسلق لقمة التل يكافئ بمناظر رائعة', 'احضر ماء كافياً'],
    nearbySlugs: ['qasr-al-zayan', 'temple-of-hibis'],
    lat: 25.31,
    lon: 30.56,
    isActive: true,
    isFeatured: false,
  },
  {
    id: ATTRACTION.A06,
    nameAr: 'دير الحجر',
    nameEn: 'Deir el-Hagar',
    slug: 'deir-el-hagar',
    type: 'historical',
    area: 'dakhla',
    descriptionAr:
      'معبد مصري قديم بُني في عهد الأباطرة الرومان نيرون وفسبسيان. يتميز بنقوشه الهيروغليفية الملونة المحفوظة جيداً وبوابته الرومانية الضخمة.',
    descriptionEn:
      'An ancient Egyptian temple built during the Roman emperors Nero and Vespasian. Notable for its well-preserved colored hieroglyphs and massive Roman gateway.',
    historyAr:
      'المعبد مكرس لآمون ومعبود في واحة الداخلة. يمثل نموذجاً فريداً لتمازج الفن المصري والروماني.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: { adults_egp: 4000, children_egp: 2000 },
    openingHours: '8:00 - 17:00',
    durationHours: 1.5,
    difficulty: 'easy',
    tips: ['النقوش الملونة داخل المعبد رائعة الجمال', 'أحضر مصباحاً للداخل'],
    nearbySlugs: ['al-qasr-old-town', 'muzawwaqa-tombs'],
    lat: 25.67,
    lon: 28.75,
    isActive: true,
    isFeatured: false,
  },
  {
    id: ATTRACTION.A07,
    nameAr: 'عين موط تلاتة',
    nameEn: 'Ain Moat Talata Hot Springs',
    slug: 'ain-moat-talata',
    type: 'natural',
    area: 'dakhla',
    descriptionAr:
      'ينبوع مائي حار يبلغ 43 درجة مئوية. يُستخدم للعلاج بالمياه المعدنية والدفن في الرمال الحارة. محاط بنخيل وأشجار زيتون.',
    descriptionEn:
      'A hot spring at 43°C used for mineral water therapy and hot sand burial treatment. Surrounded by palms and olive trees.',
    bestSeason: 'winter',
    bestTimeOfDay: 'any',
    entryFee: null,
    openingHours: '7:00 - 19:00',
    durationHours: 2,
    difficulty: 'easy',
    tips: [
      'الماء ساخن جداً، ابدأ ببطء',
      'الدفن بالرمال الحارة علاج رائع للمفاصل',
      'احضر ملابس سباحة وبدّل ملابس',
    ],
    nearbySlugs: ['al-qasr-old-town', 'deir-el-hagar'],
    lat: 25.5,
    lon: 28.98,
    isActive: true,
    isFeatured: false,
  },
  {
    id: ATTRACTION.A08,
    nameAr: 'الجبل الكريستالي',
    nameEn: 'Crystal Mountain',
    slug: 'crystal-mountain',
    type: 'natural',
    area: 'farafra',
    descriptionAr:
      'قوس صخري مميز مكوّن من بلورات الكالسيت والباريت. يلمع تحت أشعة الشمس بألوان رائعة. يقع على الطريق الصحراوي بين الفرافرة والداخلة.',
    descriptionEn:
      'A distinctive rock arch formed from calcite and barite crystals. Sparkles spectacularly in sunlight. Located on the desert road between Farafra and Dakhla.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: null,
    openingHours: '8:00 - 18:00',
    durationHours: 1.5,
    difficulty: 'easy',
    tips: [
      'لا تأخذ الكريستالات — محمية بالقانون',
      'أحضر كاميرا جيدة للتصوير',
      'الموقع قريب من الصحراء البيضاء',
    ],
    nearbySlugs: ['white-desert', 'agabat-valley'],
    lat: 27.65,
    lon: 28.15,
    isActive: true,
    isFeatured: true,
  },
  {
    id: ATTRACTION.A09,
    nameAr: 'وادي العقبات',
    nameEn: 'Agabat Valley',
    slug: 'agabat-valley',
    type: 'natural',
    area: 'farafra',
    descriptionAr:
      'وادٍ صحراوي ضخم يمتد لعشرات الكيلومترات. يتميز بصخوره السوداء والبيضاء المتناقضة وكثبانه الرملية العالية. مثالي للتخييم وجولات السفاري.',
    descriptionEn:
      'A massive desert valley extending for dozens of kilometers. Features contrasting black and white rocks with high sand dunes. Ideal for camping and safari tours.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: null,
    openingHours: '8:00 - 18:00',
    durationHours: 4,
    difficulty: 'moderate',
    tips: ['رفقة مرشد متمرس ضرورية', 'أحضر جميع احتياجات التخييم', 'منظر النجوم ليلاً لا يوصف'],
    nearbySlugs: ['white-desert', 'crystal-mountain'],
    lat: 27.2,
    lon: 28.02,
    isActive: true,
    isFeatured: false,
  },
  {
    id: ATTRACTION.A10,
    nameAr: 'معبد دوش',
    nameEn: 'Temple of Dush',
    slug: 'temple-of-dush',
    type: 'historical',
    area: 'baris',
    descriptionAr:
      'معبد مصري قديم من العصر البطلمي الروماني في الطرف الجنوبي لواحة الخارجة. يقع على قمة تل ومكرس للآلهة سيرابيس وإيزيس.',
    descriptionEn:
      'An ancient Egyptian temple from the Greco-Roman period at the southern tip of Kharga Oasis. Located on a hilltop and dedicated to Serapis and Isis.',
    historyAr:
      'معبد دوش من أبرز المواقع الأثرية في الجنوب الغربي المصري، ويتميز بموقعه الاستراتيجي على الطريق القديم بين مصر والسودان.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: { adults_egp: 6000, children_egp: 3000 },
    openingHours: '8:00 - 17:00',
    durationHours: 2,
    difficulty: 'easy',
    tips: ['الموقع بعيد جنوباً — تأكد من الوقود', 'احضر ماء كافياً', 'رفقة دليل محلي مفيدة جداً'],
    nearbySlugs: ['hassan-fathy-village'],
    lat: 24.58,
    lon: 30.72,
    isActive: true,
    isFeatured: false,
  },
  // ── Kharga — additional ──────────────────────────────────────────
  {
    id: A11,
    nameAr: 'قصر الزيان',
    nameEn: 'Qasr al-Zayan',
    slug: 'qasr-al-zayan',
    type: 'historical',
    area: 'kharga',
    descriptionAr:
      'معبد من العصر البطلمي الروماني على قمة تل مُهيمن. يضم جدران مزينة بنقوش هيروغليفية من عهد الإمبراطور أنطونيوس بيوس.',
    descriptionEn:
      'A Greco-Roman temple on a commanding hilltop with hieroglyphic reliefs from the reign of Emperor Antoninus Pius.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: { adults_egp: 4000, children_egp: 2000 },
    openingHours: '8:00 - 17:00',
    durationHours: 1,
    difficulty: 'moderate',
    tips: ['التسلق يستحق المنظر الرائع', 'الموقع هادئ وبعيد عن الازدحام'],
    nearbySlugs: ['qasr-al-ghuytta', 'temple-of-hibis'],
    lat: 25.28,
    lon: 30.57,
    isActive: true,
    isFeatured: false,
  },
  {
    id: A12,
    nameAr: 'قصر اللبخة',
    nameEn: 'Qasr al-Labkha',
    slug: 'qasr-al-labkha',
    type: 'historical',
    area: 'kharga',
    descriptionAr:
      'حصن روماني صغير محفوظ بشكل جيد من القرنين الثالث والرابع الميلاديين. جزء من سلسلة حصون رومانية كانت تحمي طريق درب الأربعين.',
    descriptionEn:
      'A well-preserved small Roman fort from the 3rd–4th century CE. Part of a chain of Roman forts protecting the Darb al-Arbain trade route.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: null,
    openingHours: '8:00 - 18:00',
    durationHours: 1,
    difficulty: 'easy',
    tips: ['الموقع شمال الخارجة يستحق الزيارة', 'عمارة رومانية نادرة في الواحات'],
    nearbySlugs: ['bagawat-necropolis', 'temple-of-hibis'],
    lat: 25.75,
    lon: 30.53,
    isActive: true,
    isFeatured: false,
  },
  {
    id: A13,
    nameAr: 'معبد الناضورة',
    nameEn: 'Temple of Al-Nadura',
    slug: 'nadura-temple',
    type: 'historical',
    area: 'kharga',
    descriptionAr:
      'معبد روماني صغير على تل مشرف على مدينة الخارجة. يعود إلى عهد الإمبراطور هادريان ويوفر إطلالة بانورامية على الواحة.',
    descriptionEn:
      'A small Roman temple on a hill overlooking Kharga city, dating to the reign of Emperor Hadrian. Offers a panoramic view of the oasis.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: { adults_egp: 4000, children_egp: 2000 },
    openingHours: '8:00 - 17:00',
    durationHours: 1,
    difficulty: 'easy',
    tips: ['الإطلالة على مدينة الخارجة رائعة', 'قريب من وسط المدينة'],
    nearbySlugs: ['temple-of-hibis', 'bagawat-necropolis'],
    lat: 25.43,
    lon: 30.55,
    isActive: true,
    isFeatured: false,
  },
  {
    id: A14,
    nameAr: 'متحف الوادي الجديد',
    nameEn: 'New Valley Museum',
    slug: 'new-valley-museum',
    type: 'attraction',
    area: 'kharga',
    descriptionAr:
      'متحف أثري حديث يعرض مقتنيات من جميع أنحاء محافظة الوادي الجديد. يضم قطعاً أثرية فرعونية وقبطية وإسلامية، ومعروضات عن الحياة اليومية القديمة.',
    descriptionEn:
      'A modern archaeological museum displaying artifacts from across New Valley Governorate. Pharaonic, Coptic, and Islamic pieces alongside exhibits on ancient daily life.',
    bestSeason: 'all_year',
    bestTimeOfDay: 'any',
    entryFee: { adults_egp: 8000, children_egp: 4000 },
    openingHours: '9:00 - 17:00',
    durationHours: 2,
    difficulty: 'easy',
    tips: [
      'مكيف الهواء — ملاذ في الصيف',
      'يوجد مرشد متخصص عند الطلب',
      'أفضل بداية لفهم تاريخ المنطقة',
    ],
    nearbySlugs: ['temple-of-hibis', 'bagawat-necropolis'],
    lat: 25.44,
    lon: 30.55,
    isActive: true,
    isFeatured: false,
  },
  // ── Dakhla — additional ──────────────────────────────────────────
  {
    id: A15,
    nameAr: 'مقابر المزوقة',
    nameEn: 'Muzawwaqa Tombs',
    slug: 'muzawwaqa-tombs',
    type: 'historical',
    area: 'dakhla',
    descriptionAr:
      'مقبرتان رومانيتان مزينتان بلوحات فريدة تجمع بين الفن المصري والروماني. لوحات الجدران محفوظة بشكل مذهل وتصور مشاهد الحياة الآخرة.',
    descriptionEn:
      'Two Roman-era painted tombs with unique murals blending Egyptian and Roman art. Remarkably preserved wall paintings depicting afterlife scenes.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: { adults_egp: 4000, children_egp: 2000 },
    openingHours: '8:00 - 17:00',
    durationHours: 1.5,
    difficulty: 'easy',
    tips: ['لوحات الألوان محفوظة بشكل رائع', 'الإضاءة الداخلية جيدة'],
    nearbySlugs: ['al-qasr-old-town', 'deir-el-hagar'],
    lat: 25.54,
    lon: 28.85,
    isActive: true,
    isFeatured: false,
  },
  {
    id: A16,
    nameAr: 'قرية بشندي',
    nameEn: 'Bashindi Village',
    slug: 'bashindi-village',
    type: 'historical',
    area: 'dakhla',
    descriptionAr:
      'قرية أثرية تاريخية تضم بقايا معبد أيوبي وأبراج مراقبة وبيوت طينية تقليدية. تعكس نمط الحياة في واحة الداخلة عبر العصور.',
    descriptionEn:
      'A historic archaeological village with remains of an Ayyubid temple, watchtowers, and traditional mud-brick houses. Reflects life in Dakhla oasis across the ages.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: null,
    openingHours: '8:00 - 18:00',
    durationHours: 1.5,
    difficulty: 'easy',
    tips: ['احترم خصوصية السكان المحليين', 'التصوير في الضوء الذهبي ساعة الغروب'],
    nearbySlugs: ['al-qasr-old-town', 'muzawwaqa-tombs'],
    lat: 25.52,
    lon: 29.23,
    isActive: true,
    isFeatured: false,
  },
  {
    id: A17,
    nameAr: 'بئر الجبل',
    nameEn: 'Bir al-Jabal',
    slug: 'bir-al-jabal',
    type: 'natural',
    area: 'dakhla',
    descriptionAr:
      'بئر ارتوازية طبيعية في منطقة جبلية مميزة. المياه عذبة وباردة. المنطقة المحيطة جميلة بالنخيل والطبيعة الصحراوية.',
    descriptionEn:
      'A natural artesian well in a distinctive mountainous area. Fresh, cool water with surrounding palms and desert scenery.',
    bestSeason: 'all_year',
    bestTimeOfDay: 'morning',
    entryFee: null,
    openingHours: '8:00 - 18:00',
    durationHours: 1.5,
    difficulty: 'easy',
    tips: ['الموقع بعيد — تأكد من الوقود', 'مثالي للاسترخاء والسباحة'],
    nearbySlugs: ['ain-moat-talata', 'al-qasr-old-town'],
    lat: 25.65,
    lon: 28.97,
    isActive: true,
    isFeatured: false,
  },
  // ── Balat ────────────────────────────────────────────────────────
  {
    id: A18,
    nameAr: 'عين أصيل',
    nameEn: 'Ain Asil',
    slug: 'ain-asil',
    type: 'historical',
    area: 'balat',
    descriptionAr:
      'موقع أثري من عصر الدولة القديمة، أقدم مستوطنة حضرية معروفة في واحات الصحراء الغربية. اكتُشفت خلال التنقيبات الفرنسية ويعود تاريخها لأكثر من 4000 سنة.',
    descriptionEn:
      'An archaeological site from the Old Kingdom period — the oldest known urban settlement in the Western Desert oases. Discovered during French excavations and dates back over 4,000 years.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: null,
    openingHours: '8:00 - 17:00',
    durationHours: 1.5,
    difficulty: 'easy',
    tips: ['موقع أثري نادر من الدولة القديمة', 'يتطلب تنسيقاً مسبقاً مع المجلس الأعلى للآثار'],
    nearbySlugs: ['balat-old-city', 'qalat-al-duba'],
    lat: 25.58,
    lon: 29.28,
    isActive: true,
    isFeatured: false,
  },
  {
    id: A19,
    nameAr: 'قلعة الضبعة',
    nameEn: 'Qalat al-Duba',
    slug: 'qalat-al-duba',
    type: 'historical',
    area: 'balat',
    descriptionAr:
      'قلعة تاريخية من العصر الأيوبي على مشارف بلاط. استُخدمت كنقطة حراسة ومخزن للقوافل. تتميز بأبراجها الأربعة وجدرانها الطينية السميكة.',
    descriptionEn:
      'A historic Ayyubid-era fortress on the outskirts of Balat. Used as a watchtower and caravan storage point. Features four towers and thick mud walls.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: null,
    openingHours: '8:00 - 18:00',
    durationHours: 1,
    difficulty: 'easy',
    tips: ['جدران الطين محفوظة بشكل جيد', 'الإطلالة من الأبراج جميلة'],
    nearbySlugs: ['balat-old-city', 'ain-asil'],
    lat: 25.57,
    lon: 29.26,
    isActive: true,
    isFeatured: false,
  },
  {
    id: A20,
    nameAr: 'مدينة بلاط القديمة',
    nameEn: 'Balat Old City',
    slug: 'balat-old-city',
    type: 'historical',
    area: 'balat',
    descriptionAr:
      'مدينة إسلامية قديمة محفوظة جيداً من القرن الثاني عشر. تتميز بشوارعها الضيقة الملتوية المغطاة بالعوارض الخشبية لتخفيف الحرارة، ومنازلها الطينية ذات الأبواب الخشبية المنقوشة.',
    descriptionEn:
      'A well-preserved medieval Islamic city from the 12th century. Known for its narrow covered streets with wooden beams to reduce heat, and mud-brick houses with carved wooden doors.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: null,
    openingHours: '8:00 - 18:00',
    durationHours: 2,
    difficulty: 'easy',
    tips: [
      'استكشف الأزقة الضيقة بحذر وصبر',
      'الأبواب الخشبية المنقوشة تحفة فنية',
      'صحبة مرشد محلي تثري التجربة',
    ],
    nearbySlugs: ['ain-asil', 'qalat-al-duba'],
    lat: 25.5667,
    lon: 29.2667,
    isActive: true,
    isFeatured: false,
  },
  // ── Farafra — additional ─────────────────────────────────────────
  {
    id: A21,
    nameAr: 'الصحراء السوداء',
    nameEn: 'Black Desert',
    slug: 'black-desert',
    type: 'natural',
    area: 'farafra',
    descriptionAr:
      'مناطق شاسعة مغطاة بالحجارة البازلتية السوداء الناتجة عن الانفجارات البركانية القديمة. تقع بين الفرافرة وواحة البهنسا. منظر سريالي مذهل يتناقض مع الرمال الصفراء.',
    descriptionEn:
      'Vast areas covered with black basalt rocks from ancient volcanic eruptions. Located between Farafra and Bahnasa. A surreal landscape contrasting with yellow sand.',
    bestSeason: 'winter',
    bestTimeOfDay: 'evening',
    entryFee: null,
    openingHours: '8:00 - 18:00',
    durationHours: 3,
    difficulty: 'easy',
    tips: [
      'الصخور السوداء تمتص الحرارة بشدة، احذر في الصيف',
      'ارتدِ أحذية قوية',
      'قريب من الصحراء البيضاء',
    ],
    nearbySlugs: ['white-desert', 'crystal-mountain'],
    lat: 27.85,
    lon: 28.35,
    isActive: true,
    isFeatured: false,
  },
  {
    id: A22,
    nameAr: 'بئر ستة',
    nameEn: 'Bir Sitta Hot Spring',
    slug: 'bir-sitta',
    type: 'natural',
    area: 'farafra',
    descriptionAr:
      'بئر مياه حارة طبيعي قرب مدينة الفرافرة. المياه دافئة وكبريتية ذات خصائص علاجية. محاط بواحة خضراء صغيرة تشكل ملاذاً رائعاً وسط الصحراء.',
    descriptionEn:
      'A natural hot spring near Farafra town. Warm sulfuric water with therapeutic properties. Surrounded by a small green oasis providing a wonderful desert retreat.',
    bestSeason: 'winter',
    bestTimeOfDay: 'any',
    entryFee: null,
    openingHours: '7:00 - 19:00',
    durationHours: 1.5,
    difficulty: 'easy',
    tips: [
      'مياه دافئة لا ساخنة — مريحة للاسترخاء',
      'احضر ملابس سباحة',
      'موقع مناسب للتخييم القريب',
    ],
    nearbySlugs: ['white-desert', 'badr-museum'],
    lat: 27.08,
    lon: 27.95,
    isActive: true,
    isFeatured: false,
  },
  {
    id: A23,
    nameAr: 'متحف بدر',
    nameEn: 'Badr Museum',
    slug: 'badr-museum',
    type: 'attraction',
    area: 'farafra',
    descriptionAr:
      'متحف خاص يعرض أعمال الفنان المحلي بدر عبد المعطي. لوحات وتماثيل مصنوعة من مواد الصحراء الطبيعية تصور الحياة اليومية والتراث البدوي.',
    descriptionEn:
      'A private museum showcasing the work of local artist Badr Abd el-Moghni. Paintings and sculptures made from natural desert materials depicting daily life and Bedouin heritage.',
    bestSeason: 'all_year',
    bestTimeOfDay: 'any',
    entryFee: { adults_egp: 5000, children_egp: 2500 },
    openingHours: '9:00 - 17:00',
    durationHours: 1,
    difficulty: 'easy',
    tips: ['متحف صغير ودافئ المشاعر', 'الفنان نفسه يرحب بالزوار أحياناً', 'تحف يدوية للبيع'],
    nearbySlugs: ['white-desert', 'bir-sitta'],
    lat: 27.057,
    lon: 27.97,
    isActive: true,
    isFeatured: false,
  },
  // ── Baris — additional ───────────────────────────────────────────
  {
    id: A24,
    nameAr: 'قرية حسن فتحي',
    nameEn: 'Hassan Fathy Village',
    slug: 'hassan-fathy-village',
    type: 'attraction',
    area: 'baris',
    descriptionAr:
      'قرية تجريبية صممها المعماري العالمي حسن فتحي في الستينيات كنموذج للسكن الشعبي المستدام. مبنية من الطوب اللبن المحلي وتعتمد التهوية الطبيعية. مدرجة ضمن التراث المعماري العالمي.',
    descriptionEn:
      'An experimental village designed by world-famous architect Hassan Fathy in the 1960s as a model for sustainable vernacular housing. Built from local mud brick with natural ventilation. Listed in world architectural heritage.',
    bestSeason: 'winter',
    bestTimeOfDay: 'morning',
    entryFee: null,
    openingHours: '8:00 - 17:00',
    durationHours: 2,
    difficulty: 'easy',
    tips: ['خذ جولة موجهة لفهم فلسفة المعمار المستدام', 'مناسب للمهتمين بالعمارة والتصميم البيئي'],
    nearbySlugs: ['temple-of-dush'],
    lat: 24.65,
    lon: 30.59,
    isActive: true,
    isFeatured: false,
  },
  {
    id: A25,
    nameAr: 'عيون باريس',
    nameEn: 'Baris Springs',
    slug: 'baris-springs',
    type: 'natural',
    area: 'baris',
    descriptionAr:
      'مجموعة من العيون الطبيعية المنتشرة حول مدينة باريس. مياهها عذبة ومحاطة بمزارع النخيل والزيتون. موقع استرخاء رائع يجمع بين الطبيعة والهدوء.',
    descriptionEn:
      'A collection of natural springs scattered around Baris town. Fresh water surrounded by date palm and olive farms. A wonderful relaxation spot combining nature and tranquility.',
    bestSeason: 'all_year',
    bestTimeOfDay: 'morning',
    entryFee: null,
    openingHours: '8:00 - 18:00',
    durationHours: 1.5,
    difficulty: 'easy',
    tips: [
      'مثالي للاسترخاء بعد زيارة معبد دوش',
      'أفضل وقت الصباح الباكر',
      'الطبيعة الزراعية المحيطة خلابة',
    ],
    nearbySlugs: ['temple-of-dush', 'hassan-fathy-village'],
    lat: 24.66,
    lon: 30.57,
    isActive: true,
    isFeatured: false,
  },
];
