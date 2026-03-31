#!/usr/bin/env python3
"""Seed the AI knowledge base with New Valley Governorate information."""

import asyncio
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8005/api/v1")
# For seeding, we need a valid JWT. You can get one by logging in via the identity service.
# Or set this env var with a valid admin token.
AUTH_TOKEN = os.getenv("SEED_AUTH_TOKEN", "")

DOCUMENTS = [
    # Arabic Documents
    {
        "title": "نظرة عامة على محافظة الوادي الجديد",
        "description": "معلومات عامة عن محافظة الوادي الجديد",
        "tags": ["overview", "geography", "arabic"],
        "content": """# محافظة الوادي الجديد

## نظرة عامة
محافظة الوادي الجديد هي إحدى محافظات جمهورية مصر العربية، تقع في الجزء الجنوبي الغربي من البلاد، في جنوب الصحراء الغربية المصرية التي تعد جزءاً من الصحراء الكبرى.

## المساحة والسكان
- **المساحة**: حوالي 440,098 كيلومتر مربع (43.6% من إجمالي مساحة مصر)
- **أكبر محافظة** في مصر من حيث المساحة
- **أقل محافظة** كثافة سكانية في مصر
- **عدد السكان**: حوالي 270,854 نسمة (يناير 2024)

## العاصمة
عاصمة محافظة الوادي الجديد هي **الخارجة**، وهي أيضاً أكبر مدينة في المحافظة.

## الواحات الرئيسية
1. **واحة الخارجة** - العاصمة الإدارية وأكبر واحة
2. **واحة الداخلة** - سلة غذاء المحافظة
3. **واحة الفرافرة** - مشهورة بالصحراء البيضاء
4. **واحة باريس** - واحة أصغر في الجنوب

## الموقع الجغرافي
تقع محافظة الوادي الجديد في الصحراء الغربية لمصر:
- غرب نهر النيل
- شمال السودان
- شرق ليبيا
""",
    },
    {
        "title": "واحة الخارجة - دليل سياحي",
        "description": "المعالم السياحية في واحة الخارجة",
        "tags": ["tourism", "kharga", "arabic"],
        "content": """# واحة الخارجة

## نظرة عامة
الخارجة هي أكبر واحات الصحراء الغربية وتعمل كمركز إداري لمحافظة الوادي الجديد. وهي أقرب واحة لوادي النيل، على بعد **ساعتين فقط من الأقصر**.

## المعالم السياحية الرئيسية

### متحف الخارجة الأثري
يقع في قصر الخارجة، ويضم قطعاً أثرية من المنطقة تمتد لآلاف السنين.

### معبد هيبس
أحد أفضل المعابد المحفوظة في الصحراء الغربية، يعود للعصر الفارسي (القرن السادس قبل الميلاد).

### مقابر البجوات
من أقدم وأفضل المقابر المسيحية المحفوظة في العالم، تحتوي على 263 مصلى من الطوب اللبن.

### قصر الغويطة
معبد من العصر الروماني مكرس للآلهة آمون وموت وخونسو.

## معلومات عملية
- **المسافة من الأقصر**: ~200 كم (ساعتان بالسيارة)
- **المسافة من القاهرة**: ~600 كم
- **أفضل وقت للزيارة**: من أكتوبر إلى أبريل
""",
    },
    {
        "title": "واحة الداخلة - دليل سياحي",
        "description": "المعالم السياحية في واحة الداخلة",
        "tags": ["tourism", "dakhla", "arabic", "hot springs"],
        "content": """# واحة الداخلة

## نظرة عامة
تقع واحة الداخلة في محافظة الوادي الجديد، على بعد 350 كم من وادي النيل. الداخلة هي **أخضر واحة** في الوادي الجديد و**الأكثر سكاناً**، بـ 16 قرية.

## المناظر الطبيعية
تشتهر الداخلة بمناظرها الخلابة:
- منحدرات الحجر الرملي الوردي
- كثبان رملية كبيرة
- بساتين خضراء
- أشجار النخيل
- ينابيع المياه الساخنة الطبيعية

## المعالم السياحية الرئيسية

### القصر
المدينة الإسلامية القديمة مع تاريخ يعود للعصور الفرعونية والرومانية والإسلامية. يمكن للزوار استكشاف:
- شوارع متاهية من القرون الوسطى
- مسجد قديم بمئذنة من القرن الثاني عشر
- معصرة زيت الزيتون التقليدية

### معبد دير الحجر
معبد روماني محفوظ جيداً بني في القرن الأول الميلادي.

### مقابر المزوقة
أكثر من 300 مقبرة محفورة في الصخر من العصر الروماني مع لوحات جدارية حية.

### العيون الساخنة
الداخلة بها عدة ينابيع ساخنة طبيعية علاجية:
- **بئر الطرفاوي** - مشهور بخصائصه العلاجية
- **بئر الجبل** - نبع كبريتي طبيعي
- **موط تلاتة** - نبع ساخن بالقرب من مدينة موط

## معلومات عملية
- **المسافة من الخارجة**: ~190 كم
- **المدن الرئيسية**: موط (العاصمة)، القصر، بلاط
- **المنتجات المحلية**: التمور، الزيتون، الأرز، القمح
""",
    },
    {
        "title": "الصحراء البيضاء والفرافرة",
        "description": "معلومات عن واحة الفرافرة والصحراء البيضاء",
        "tags": ["tourism", "farafra", "white desert", "arabic"],
        "content": """# الصحراء البيضاء وواحة الفرافرة

## واحة الفرافرة
الفرافرة هي أصغر وأكثر الواحات عزلة في محافظة الوادي الجديد. على الرغم من صغر حجمها، فهي بوابة لإحدى أكثر العجائب الطبيعية إثارة في مصر.

### عن الفرافرة
- **السكان**: حوالي 5,000 نسمة
- **المنطقة الرئيسية**: قصر الفرافرة
- **مشهورة بـ**: الثقافة البدوية التقليدية، الينابيع الساخنة

## الصحراء البيضاء

### نظرة عامة
محمية الصحراء البيضاء (الصحراء البيضاء) تقع بين الفرافرة والبحرية. إنها من **أكثر الوجهات التي يجب زيارتها** في الوادي الجديد.

### التكوينات الجيولوجية
تستمد الصحراء اسمها من التكوينات الصخرية الطباشيرية البيضاء السريالية الناتجة عن قرون من التعرية بفعل الرياح:
- صخور على شكل فطر
- أعمدة ومسلات
- أشكال تشبه الحيوانات والأشياء

### أفضل تجربة
- **التخييم تحت النجوم**: الطريقة الأكثر شعبية لتجربة الصحراء البيضاء
- **شروق وغروب الشمس**: تتغير ألوان الصخور بشكل دراماتيكي
- **ليالي البدر**: أجواء ساحرة بشكل خاص
- **جولات سفاري 4x4**: استكشاف التكوينات المختلفة

### معلومات عملية
- **الدخول**: يتطلب تصريح (يمكن ترتيبه من خلال منظمي الرحلات)
- **أفضل وقت للزيارة**: من أكتوبر إلى أبريل
- **ما يجب إحضاره**: ملابس دافئة لليالي الصحراء الباردة
""",
    },
    # English Documents
    {
        "title": "New Valley Governorate Overview",
        "description": "General information about New Valley Governorate",
        "tags": ["overview", "geography", "administration"],
        "content": """# New Valley Governorate (محافظة الوادي الجديد)

## Overview
New Valley Governorate (El Wadi El Gedid / الوادي الجديد) is a governorate of Egypt located in the southwestern part of the country, in the south of Egypt's Western Desert, which is part of the Sahara Desert. It lies between the Nile, northern Sudan, and southeastern Libya.

## Size and Population
- **Area**: Approximately 440,098 km² (43.6% of Egypt's total area)
- **Largest governorate** in Egypt by area
- **Most sparsely populated** governorate in Egypt
- **Population**: Approximately 270,854 (as of January 2024)
- **Urbanization rate**: 46.7%

## Administrative Capital
The capital of New Valley Governorate is **Kharga** (الخارجة), which is also the largest city in the governorate.

## Major Cities and Oases
1. **Kharga Oasis** (الخارجة) - Administrative capital, largest oasis
2. **Dakhla Oasis** (الداخلة) - The "breadbasket" of the governorate
3. **Farafra Oasis** (الفرافرة) - Known for the White Desert
4. **Baris Oasis** (باريس) - Smaller oasis in the south

## Location
New Valley Governorate is located in Egypt's Western Desert, positioned:
- West of the Nile River
- North of Sudan
- East of Libya
- South of Matrouh Governorate
""",
    },
    {
        "title": "Kharga Oasis Tourism Guide",
        "description": "Tourist attractions and information about Kharga Oasis",
        "tags": ["tourism", "kharga", "attractions", "history"],
        "content": """# Kharga Oasis (واحة الخارجة)

## Overview
Kharga is the largest of the Western Desert oases and serves as the administrative center of New Valley Governorate. It is the nearest oasis to the Nile Valley, being only **two hours from Luxor**.

## Historical Significance
Kharga has been inhabited since prehistoric times and contains archaeological sites from multiple periods:
- Pharaonic temples
- Roman fortresses
- Coptic churches and cemeteries
- Ancient rural communities
- Prehistoric rock inscriptions

## Main Attractions

### Kharga Archaeological Museum
Located in Qasr Kharga, the museum houses artifacts from the region spanning thousands of years of history.

### Temple of Hibis
One of the best-preserved temples in the Western Desert, dating to the Persian Period (6th century BC). It was dedicated to the god Amun.

### Necropolis of El-Bagawat
One of the earliest and best-preserved Christian cemeteries in the world, containing 263 mud-brick chapels dating from the 3rd to 7th centuries AD.

### Qasr el-Ghueita
A Roman-era temple dedicated to Amun, Mut, and Khonsu.

### Qasr el-Zayyan
Another Roman temple dating to the Ptolemaic and Roman periods.

### Darb el-Arbain (Road of Forty Days)
Historic caravan route connecting Sudan to Egypt, passing through Kharga.

## Practical Information
- **Distance from Luxor**: ~200 km (2 hours by car)
- **Distance from Cairo**: ~600 km
- **Climate**: Desert climate, hot summers (up to 45°C), mild winters
- **Best time to visit**: October to April
""",
    },
    {
        "title": "Dakhla Oasis Tourism Guide",
        "description": "Tourist attractions and information about Dakhla Oasis",
        "tags": ["tourism", "dakhla", "attractions", "history", "hot springs"],
        "content": """# Dakhla Oasis (واحة الداخلة)

## Overview
Dakhla Oasis lies in New Valley Governorate, 350 km from the Nile Valley. It measures approximately 80 km from east to west and 25 km from north to south.

Dakhla is the **greenest oasis** in the New Valley and the **most populated**, with 16 villages. While Kharga is the administrative center, **Dakhla is the breadbasket** of New Valley, with fields and orchards producing abundant crops.

## Landscape
Dakhla is famous for its stunning landscape featuring:
- Pink sandstone cliffs
- Large sand dunes
- Lush green orchards
- Date palm groves
- Natural hot springs

## Main Attractions

### Al-Qasr (القصر)
The old Islamic city with history dating from Pharaonic, Roman, and Islamic times. Now beautifully restored and preserved, visitors can explore:
- Maze-like medieval streets
- Ancient mosque with a 12th-century minaret
- Traditional school (kuttab)
- Olive oil factory
- Ancient court building

### Deir el-Hagar Temple
A well-preserved Roman temple built in the 1st century AD with cartouches of Emperors Nero, Vespasian, Titus, and Domitian. Contains beautiful reliefs depicting Egyptian gods.

### Muzawaka Tombs
Over 300 rock-hewn tombs from the Roman period, including the famous tombs of Petosiris and Petubastis. Features vivid wall paintings depicting funerary processions and offerings to gods.

### Hot Springs (العيون الساخنة)
Dakhla has several therapeutic natural hot springs:
- **Bir Tarfawi** - Popular for its healing properties
- **Bir Al-Gebel** - Natural sulphur spring
- **Mut Talata** - Hot spring near Mut city
These springs are fed by underground aquifers and maintain temperatures around 30-40°C.

### Mut (موط)
The capital of Dakhla Oasis, featuring traditional architecture and a lively local market.

## Practical Information
- **Distance from Kharga**: ~190 km
- **Distance from Cairo**: ~800 km
- **Main towns**: Mut (capital), Al-Qasr, Balat, Bashendi
- **Best time to visit**: October to April
- **Local products**: Dates, olives, rice, wheat, citrus fruits
""",
    },
    {
        "title": "Farafra Oasis and White Desert",
        "description": "Information about Farafra Oasis and the White Desert National Park",
        "tags": ["tourism", "farafra", "white desert", "nature"],
        "content": """# Farafra Oasis and White Desert (واحة الفرافرة والصحراء البيضاء)

## Farafra Oasis
Farafra is the smallest and most isolated of the major oases in New Valley Governorate. Despite its small size, it's a gateway to one of Egypt's most spectacular natural wonders.

### About Farafra
- **Population**: Approximately 5,000
- **Main settlement**: Qasr el-Farafra
- **Known for**: Traditional Bedouin culture, hot springs, White Desert access
- **Local products**: Dates, olives, apricots

### Attractions in Farafra
- **Badr's Museum**: Folk art museum created by local artist Badr Abdel Moghny
- **Ain Bishay Hot Spring**: Natural sulphur spring for bathing
- **Traditional village**: Mud-brick architecture

## The White Desert (الصحراء البيضاء)

### Overview
The White Desert National Park (Sahara el-Beida) is located between Farafra and Bahariya oases. It's one of Egypt's most extraordinary landscapes and a **must-see destination** in New Valley.

### Geological Features
The desert gets its name from the surreal white chalk rock formations created by centuries of wind erosion. These formations include:
- Mushroom-shaped rocks
- Pillars and spires
- Shapes resembling animals and objects
- Crystal formations

The chalk is formed from ancient seabed sediments, proving this area was once underwater millions of years ago.

### Best Experience
- **Camping under the stars**: The most popular way to experience the White Desert
- **Sunrise and sunset**: The rocks change color dramatically with the light
- **Full moon nights**: Especially magical atmosphere
- **4x4 safari tours**: Explore the various formations

### Practical Information
- **Entry**: Requires permit (can be arranged through tour operators)
- **Best time to visit**: October to April (avoid summer heat)
- **How to get there**: Tours from Bahariya or Farafra oasis
- **What to bring**: Warm clothes for cold desert nights, sun protection
""",
    },
    {
        "title": "New Valley Economy and Agriculture",
        "description": "Economic activities and agricultural development in New Valley",
        "tags": ["economy", "agriculture", "development", "investment"],
        "content": """# New Valley Economy and Agriculture

## Economic Overview
New Valley Governorate's economy is based on three main pillars:
1. **Extractive industries** (mining)
2. **Agriculture** (reclaimed desert land)
3. **Tourism** (cultural and eco-tourism)

## Mining and Industry

### Abu Tartur Phosphate Deposits
The Abu Tartur plateau contains some of Egypt's largest phosphate reserves. These deposits support fertilizer production and are a significant source of income for the governorate.

### Other Resources
- Iron ore deposits
- Manganese
- Natural gas exploration areas

## Agriculture

### Land Reclamation
The Egyptian government has invested heavily in desert land reclamation projects in New Valley, using:
- Fossil groundwater from underground aquifers
- Modern irrigation systems
- Agricultural support services

### Main Crops
- **Dates**: New Valley is famous for its high-quality dates
- **Wheat and barley**: Staple grains
- **Rice**: Grown in irrigated areas
- **Olives**: Particularly in Siwa and Dakhla
- **Citrus fruits**: Oranges, lemons
- **Vegetables**: Tomatoes, peppers, onions
- **Medicinal herbs**: Various traditional herbs

### Agricultural Services
The government provides:
- 6 agricultural service complexes for farmer support
- Veterinary services
- Irrigation infrastructure
- Seed distribution programs

## Investment and Development

### Government Investment
The Egyptian government allocated **13.2 billion EGP** to New Valley in the 2023/2024 public investment plan, representing a **238% increase** over the prior year.

### Development Focus Areas
- Infrastructure development
- Water resource management
- Transportation networks
- Social services
- Healthcare facilities
- Educational institutions

### Investment Opportunities
- Agricultural projects
- Tourism development
- Mining and extraction
- Renewable energy (solar power potential)
- Food processing industries
""",
    },
    {
        "title": "Transportation and Getting Around New Valley",
        "description": "How to travel to and within New Valley Governorate",
        "tags": ["transportation", "travel", "practical", "roads"],
        "content": """# Transportation in New Valley

## Getting to New Valley

### By Road
The main routes to New Valley include:
- **From Cairo**: Via the Western Desert Road (~600 km to Kharga)
- **From Luxor**: Via the Luxor-Kharga road (~200 km, 2-3 hours)
- **From Asyut**: Via the Asyut-Kharga road (~230 km)

### By Bus
- Regular bus services from Cairo to Kharga and Dakhla
- Buses from Luxor and Asyut
- Local minibuses between oases

### By Air
- Kharga has a small airport with limited services
- Nearest major airport: Luxor International Airport
- Some charter flights for tourism

## Getting Around New Valley

### Between Oases
- **Kharga to Dakhla**: ~190 km (2-3 hours by car)
- **Dakhla to Farafra**: ~300 km (4-5 hours by car)
- Shared taxis and minibuses operate between major towns
- Hiring a private car/driver recommended for flexibility

### Within Oases
- Local minibuses and shared taxis
- Bicycle rental available in some areas
- Walking is common within villages

### Safari Tours
For desert exploration (White Desert, etc.):
- 4x4 vehicles required
- Tours arranged from Bahariya, Farafra, or Dakhla
- Experienced desert guides recommended
- Permits required for some areas

## Road Conditions
- Main highways are generally good
- Desert tracks require 4x4 vehicles
- Fuel stations available in main towns but limited in between
- Always carry extra water and fuel for desert travel

## Tips for Travelers
- Plan your route in advance
- Inform someone of your travel plans
- Carry sufficient water (at least 5 liters per person per day)
- Check vehicle condition before desert trips
- Travel with a local guide for desert excursions
""",
    },
    {
        "title": "Climate and Best Time to Visit New Valley",
        "description": "Weather conditions and travel seasons for New Valley",
        "tags": ["climate", "weather", "travel tips", "seasons"],
        "content": """# Climate and Best Time to Visit New Valley

## Climate Overview
New Valley Governorate has a **hot desert climate** (Köppen classification BWh), characterized by:
- Very hot summers
- Mild to warm winters
- Extremely low rainfall
- Low humidity
- Large temperature variations between day and night

## Seasonal Weather

### Summer (June - August)
- **Daytime temperatures**: 40-45°C (104-113°F)
- **Nighttime temperatures**: 25-30°C (77-86°F)
- Very hot and dry
- Not recommended for tourism
- Only visit if necessary

### Autumn (September - November)
- **Daytime temperatures**: 30-38°C (86-100°F)
- **Nighttime temperatures**: 18-25°C (64-77°F)
- Temperatures gradually cooling
- Good for visiting (late autumn)

### Winter (December - February)
- **Daytime temperatures**: 18-25°C (64-77°F)
- **Nighttime temperatures**: 5-12°C (41-54°F)
- Pleasant daytime weather
- Cold nights, especially in the desert
- **Best season for tourism**

### Spring (March - May)
- **Daytime temperatures**: 25-35°C (77-95°F)
- **Nighttime temperatures**: 12-20°C (54-68°F)
- Occasional sandstorms (khamaseen)
- Good for visiting (early spring)

## Best Time to Visit
**October to April** is the ideal period for visiting New Valley, with:
- Comfortable daytime temperatures
- Cool but not freezing nights
- Clear skies for stargazing
- Perfect conditions for desert camping

## What to Pack
- **Light, loose clothing** for daytime
- **Warm layers** for evening and night (desert nights can be cold)
- **Sun protection**: hat, sunglasses, high-SPF sunscreen
- **Sturdy walking shoes** for archaeological sites
- **Sandals** for hot springs
- **Windproof jacket** for potential sandstorms
- **Plenty of water**
""",
    },
    {
        "title": "Local Culture and Traditions",
        "description": "Culture, customs, and traditions of New Valley people",
        "tags": ["culture", "traditions", "people", "customs"],
        "content": """# Local Culture and Traditions in New Valley

## The People
New Valley's population includes:
- **Oasis dwellers**: Traditional farmers and craftspeople
- **Bedouin communities**: Desert-dwelling nomadic groups
- **Settlers**: Egyptians who moved to reclaimed agricultural areas

## Languages
- **Arabic**: Official language (Egyptian Arabic dialect)
- **Berber influences**: Some linguistic traces in oasis communities
- Local dialects vary slightly between oases

## Traditional Crafts
New Valley artisans are known for:
- **Basket weaving**: Using palm fronds
- **Pottery**: Traditional clay pots and vessels
- **Carpet and rug making**: Bedouin patterns
- **Date processing**: Traditional methods passed through generations
- **Olive oil production**: Stone-pressed oil in traditional mills

## Food and Cuisine
Traditional dishes include:
- **Fattah**: Bread with rice and meat
- **Dates**: Fresh, dried, and in desserts
- **Olive dishes**: Locally produced olives
- **Bread**: Baked in traditional clay ovens
- **Tea**: Strong, sweet mint tea is customary
- **Hibiscus drink (Karkade)**: Refreshing local beverage

## Customs and Etiquette
- **Hospitality**: Visitors are treated as honored guests
- **Dress code**: Modest dress appreciated, especially at religious sites
- **Greetings**: Handshakes common, though between same gender
- **Photography**: Always ask permission before photographing people
- **Bargaining**: Expected in markets and bazaars
- **Ramadan**: Respect fasting hours during the holy month

## Festivals and Celebrations
- **Date harvest festivals**: Celebrating the annual date crop
- **Religious holidays**: Eid al-Fitr, Eid al-Adha
- **Local saints' days**: Moulid celebrations
- **Traditional weddings**: Multi-day celebrations with music and dancing

## Music and Dance
- Traditional desert music using drums and string instruments
- Bedouin songs telling stories of desert life
- Folk dances performed at celebrations
""",
    },
    {
        "title": "Practical Information for Visitors",
        "description": "Essential practical information for tourists visiting New Valley",
        "tags": ["practical", "tips", "tourism", "services"],
        "content": """# Practical Information for New Valley Visitors

## Accommodation
- **Kharga**: Several hotels ranging from budget to mid-range
- **Dakhla**: Eco-lodges, guesthouses, and hotels
- **Farafra**: Limited options, small guesthouses
- **Desert camping**: Popular option with organized tours

## Banking and Money
- Banks available in Kharga and Mut (Dakhla)
- ATMs limited - bring sufficient cash
- Egyptian Pounds (EGP) is the currency
- Credit cards rarely accepted outside major hotels

## Communications
- Mobile phone coverage in main towns
- Limited or no signal in desert areas
- Internet available in major hotels
- Wi-Fi increasingly available in tourist areas

## Healthcare
- Government hospitals in Kharga and Dakhla
- Basic medical facilities in smaller towns
- Bring personal medications
- Travel insurance strongly recommended

## Safety
- New Valley is generally very safe
- Desert travel requires proper preparation
- Inform authorities of desert expedition plans
- Stay hydrated - carry plenty of water
- Avoid travel during sandstorms

## Shopping
What to buy:
- Dates and date products
- Olive oil
- Handicrafts (baskets, pottery)
- Traditional textiles
- Desert rose crystals
- Herbal products

## Useful Contacts
- **Tourist Police**: Available in main towns
- **Emergency services**: 123 (police), 180 (ambulance)
- **Hotels**: Can assist with local information

## Tips for Responsible Tourism
- Respect archaeological sites - don't remove artifacts
- Support local businesses and craftspeople
- Minimize plastic waste - bring reusable water bottles
- Respect local customs and dress modestly
- Ask permission before photographing people
- Don't feed wild animals
- Stay on designated paths in protected areas
""",
    },
]


async def inject_document(
    client: httpx.AsyncClient,
    headers: dict[str, str],
    doc: dict,
) -> tuple[str, bool, str]:
    """Inject a single document. Returns (title, success, message)."""
    title = doc["title"]
    try:
        response = await client.post(
            f"{AI_SERVICE_URL}/documents/inject-text",
            headers=headers,
            json={
                "content": doc["content"],
                "title": title,
                "description": doc["description"],
                "tags": doc["tags"],
                "language": "auto",
            },
        )
        if response.status_code == 200:
            result = response.json()
            return (title, True, f"doc_id: {result.get('doc_id')}, chunks: {result.get('chunk_count')}")
        if response.status_code == 401:
            return (title, False, "Unauthorized - check your token")
        return (title, False, f"{response.status_code} - {response.text[:200]}")
    except Exception as e:
        return (title, False, str(e))


async def seed_documents():
    """Inject all knowledge base documents via the AI service API."""
    if not AUTH_TOKEN:
        print("ERROR: SEED_AUTH_TOKEN environment variable not set.")
        print("You need a valid JWT token to seed the knowledge base.")
        print("\nTo get a token:")
        print("1. Log in to the frontend as an admin user")
        print("2. Check localStorage for the 'accessToken' value")
        print("3. Set it as SEED_AUTH_TOKEN env var")
        print("\nAlternatively, you can use curl:")
        print(f"curl -X POST {AI_SERVICE_URL}/documents/inject-text \\")
        print("  -H 'Authorization: Bearer YOUR_TOKEN' \\")  # gitleaks:allow
        print("  -H 'Content-Type: application/json' \\")
        print("  -d '{\"content\": \"...\", \"title\": \"...\", \"tags\": [...]}'")
        return

    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Content-Type": "application/json",
    }

    print(f"Injecting {len(DOCUMENTS)} documents in parallel...")
    async with httpx.AsyncClient(timeout=60.0) as client:
        tasks = [inject_document(client, headers, doc) for doc in DOCUMENTS]
        results = await asyncio.gather(*tasks)

    success_count = 0
    for title, success, message in results:
        status = "OK" if success else "ERROR"
        print(f"  [{status}] {title}: {message}")
        if success:
            success_count += 1
        elif "Unauthorized" in message:
            print("\nAborting: Invalid token")
            return

    print(f"\nDone! {success_count}/{len(DOCUMENTS)} documents seeded.")
    if success_count > 0:
        print("Try asking the chatbot: 'What is New Valley Governorate?'")


if __name__ == "__main__":
    asyncio.run(seed_documents())
