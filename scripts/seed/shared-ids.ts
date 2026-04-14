/**
 * Deterministic UUIDs for seed data. Used across all service seed scripts
 * so foreign key references are stable and re-runs are idempotent.
 *
 * Convention: IDs are grouped by entity type. Names are descriptive
 * so seed data files can import specific IDs by name.
 */

// ─── Users ───────────────────────────────────────────────────────────
export const USER = {
  // Admins (team members)
  ADMIN_SAYED: 'cb420581-ce30-4ce7-946f-92ba0337ab98',
  ADMIN_ADLY: '0135a54b-f50b-44ed-acbf-69a54a00c240',
  ADMIN_TAHER: 'a47960cc-8f69-4b95-adb8-00957bdf412f',
  ADMIN_SHAWQI: '929c69fa-0f5a-46e4-9f2d-ac00c0aa026b',
  ADMIN_ABDELRAHMAN: 'e2a1b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
  ADMIN_SAMAR: 'f3b2c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d',
  // Demo role users (essential layer)
  TOURIST_SALMA: 'fcba044d-04d6-40e8-a636-52665e50e770',
  RESIDENT_MOHAMED: '944ff4c9-5211-45f7-982c-0b06486e64bd',
  STUDENT_NOUR: '470dd82d-09d0-4353-8f82-28ea54bd8d29',
  MERCHANT_KHALED: '82e8a06a-fb42-4b1f-a943-5ff23b0c0d6c',
  DRIVER_AMRO: '76a90742-7062-494b-8cde-f024aacb0e0f',
  GUIDE_YOUSSEF: 'd3ce889d-c799-48f0-9c07-edfc963cd7ad',
  INVESTOR_MAHMOUD: 'dcaac073-042d-46f0-aeab-508dfcbb3c08',
  FARMER_IBRAHIM: 'a1b2c3d4-e5f6-4789-abcd-ef0123456f01',
  // Showcase extra users
  GUIDE_FATMA: '81afa615-5b2d-4888-af51-12563285c4bc',
  GUIDE_AHMED: '9c9bee21-9cc7-4da4-ba9e-8d71f9f07eaa',
  GUIDE_MARIAM: '47cea36a-9695-41d4-8f99-06bb58d2b5ab',
  GUIDE_OMAR: '9f96b05d-5d70-47ee-a9f5-70ce5d9c3244',
  TOURIST_HASSAN: '74d2b578-1075-4036-b1f6-ac2f9dae67a7',
  TOURIST_LAYLA: '44b5f232-0f0a-42cd-baeb-e2224c8195a2',
  TOURIST_KARIM: '9424a3e2-9e91-4267-905e-a5d7bdacadff',
  STUDENT_SARA: '1b9aec2e-110e-404e-84e0-18e1d25db689',
} as const;

// ─── Listings ────────────────────────────────────────────────────────
export const LISTING = {
  L01: 'ed9b8bf6-9960-4d78-a353-3b3510f49c16',
  L02: '14cd2073-ee5f-4447-bfe5-c8143066445e',
  L03: '003cba0d-c548-434f-8043-5270a4fecaf2',
  L04: '78733e12-4965-4b3f-abca-3229a95ec5a8',
  L05: '211e3986-779a-4d33-a4ce-9bb33d619c8c',
  L06: '5a934a72-10b7-4cec-9bbf-3b181827593e',
  L07: '7a9d1d27-90dd-4924-9672-429534b60d8b',
  L08: '17005e4e-a6d8-4092-badb-98f11ce77124',
  L09: '5cf5f4c9-53ef-4bee-a5a2-cc6c0cf2a773',
  L10: '3e2076f1-a462-453c-be09-02fe3cb0ec52',
} as const;

// ─── Attractions ─────────────────────────────────────────────────────
export const ATTRACTION = {
  A01: 'fe985cc2-a306-4ac4-9a49-4585c3a20814',
  A02: '40864e57-7406-46be-b836-d27aaaa83449',
  A03: '7dd353ab-f248-4123-9dd8-7c3a2be89f12',
  A04: '7c630dbb-659a-4ea4-bb92-638f902e6aa5',
  A05: 'cfc20195-2d39-41a1-8714-bb5a24ab03b7',
  A06: '285b0029-b212-4e1c-a6da-f81123844d53',
  A07: 'f64a40ea-d2b5-4628-8086-12049c32ac75',
  A08: 'ad702ebf-0ddf-4350-9e59-713b766bcfcc',
  A09: 'a0c370fd-22c0-4752-b7d4-52c3a871da12',
  A10: '3ee8c540-62fd-4644-a56e-0907e2ddd8bf',
} as const;

// ─── Investment Opportunities ────────────────────────────────────────
export const INVESTMENT = {
  INV01: '4b20fa33-efb4-4112-96ff-66b565a567ca',
  INV02: '57dc4787-df01-478e-98e0-2e9784829305',
  INV03: '9fbe7276-cfb2-4519-bd90-6c66f47ff327',
  INV04: '13c331e3-737a-440c-b911-3328631e426b',
  INV05: 'a37c7833-bd35-4766-9e0a-213f6a345955',
} as const;

// ─── Guide Profiles ──────────────────────────────────────────────────
export const GUIDE_PROFILE = {
  GP01: '6613cbc0-db26-450f-b9a0-27ebcf84817f',
  GP02: '57feceec-3c13-4db7-9c55-46effdc57bbd',
  GP03: '4cacfeab-e7b3-42e9-b79d-59f580a2acf4',
  GP04: '0eaf8e98-43dd-47ef-9d30-51794d4adcb9',
  GP05: '9a181253-5aac-4aaf-ab75-37ccc7c4ea26',
} as const;

// ─── Tour Packages ───────────────────────────────────────────────────
export const PACKAGE = {
  PK01: '5d3ba154-8aa1-4451-8367-1e1197d523d0',
  PK02: 'afa7c9b7-be31-4e04-8d02-12583e2b9197',
  PK03: '69ba7253-550f-4d03-a74a-a7f9d55491e1',
  PK04: 'bcdc5a10-f14d-45a1-b2a5-367c9a18fdfd',
  PK05: '10b6af3a-2eb6-4a67-8ac5-ced8b340e55b',
  PK06: '85860fcf-1910-4a42-8c9f-6ec4f6a35aab',
  PK07: '4fa18109-8961-48a9-9fe1-0d4eea149e3a',
  PK08: 'c9a89dad-c249-45fb-8908-488f856fe644',
  PK09: '3d3966ca-df56-43ed-bf20-321143d4b32b',
  PK10: '6f95b187-9ec5-4b2b-8fb5-5f5db68bd186',
} as const;

// ─── Points of Interest ──────────────────────────────────────────────
export const POI = {
  POI01: '15bb772a-aa27-425a-ae29-05a7becd6719',
  POI02: 'd1a14d89-0f62-4cb1-a1db-4fadd116b3e3',
  POI03: '82422043-22cb-4704-928b-8708c93f5c15',
  POI04: '85e29643-7f28-4184-b5f0-441270e73fa9',
  POI05: '88b46fb1-006b-407d-93ea-b02109626aa3',
  POI06: '7124d5e6-ce27-459e-ac75-384678c87b14',
  POI07: '8c985bc7-b026-4a87-8a32-6fa8272690f0',
  POI08: '4e8a914c-76cc-446a-812f-87151ddefc4f',
  POI09: '1ad41df0-4bbd-48c1-8b44-641df85e2994',
  POI10: 'd614f45d-5516-4113-8aa7-00bd7947c106',
  // Pending POIs (for admin review queue)
  POI_PENDING_01: 'bb010000-0000-4000-8000-000000000001',
  POI_PENDING_02: 'bb020000-0000-4000-8000-000000000002',
  POI_PENDING_03: 'bb030000-0000-4000-8000-000000000003',
  POI_PENDING_04: 'bb040000-0000-4000-8000-000000000004',
  POI_PENDING_05: 'bb050000-0000-4000-8000-000000000005',
} as const;

// ─── Commodities ─────────────────────────────────────────────────────
export const COMMODITY = {
  CM01: 'baa0d7a8-0f3c-4a6f-bcab-a765aed82b72',
  CM02: '7f82c3b5-d4db-4c91-8d8c-0ad86b8a520d',
  CM03: 'd0d129ed-f249-4f46-83af-514870a4df2f',
  CM04: '18a612e5-eeef-4e03-92d8-48a8acc28a88',
  CM05: 'e671f416-6b86-491c-a184-25ea4f7258b6',
  CM06: '4082852a-ec62-41ae-b81f-3ecb2fdb1368',
  CM07: '46a1fbc2-28b8-481d-a874-328a20b7294d',
  CM08: '0ac99a38-b309-42f1-b53f-1c9f7c41f703',
  CM09: 'ef7beefa-27dd-4226-9310-a594fdf39b51',
  CM10: '87ac51f5-6e58-4cc1-a66c-4355c2f0d681',
} as const;

// ─── Bookings ────────────────────────────────────────────────────────
export const BOOKING = {
  BK01: 'a2cc8cd4-6c75-41c1-afef-f4b5a3fb5612',
  BK02: 'e4ed2a23-82da-4153-a3d1-885ac80b537c',
  BK03: '0f2637e9-4fc9-48ca-8132-bd51618baf09',
  BK04: '0e497712-5fcc-4e37-9592-fa132c944791',
  BK05: 'd51e19c0-4a6f-43c6-b724-6940b27807ab',
} as const;

// ─── Reviews (guide) ─────────────────────────────────────────────────
export const GUIDE_REVIEW = {
  RV01: '3fe45700-2b33-40ca-8d72-9ec5b1d34caa',
  RV02: 'cf5c716f-ffb6-4095-b493-bd16bee25e8a',
  RV03: 'f0de3bb2-c867-482c-b7d4-9e260fdc61d1',
} as const;

// ─── Reviews (listing) ──────────────────────────────────────────────
export const LISTING_REVIEW = {
  LR01: 'f91de44b-8422-476b-b685-f0c8db7bc337',
  LR02: 'b97061fd-f541-4c60-aa90-4ec2bfd2bcbc',
  LR03: 'd35527be-7513-4cf5-a43d-f83f29eacacf',
} as const;

// ─── Business Directories ────────────────────────────────────────────
export const BUSINESS = {
  BD01: 'd8510640-a9cd-4c9c-ab13-cabd4b8f9ca7',
  BD02: 'a25841e9-b915-454a-b032-ca5b6f0991f6',
  BD03: '0bfc96a6-6c69-43cb-9daf-04f50295fc19',
  BD04: '71c76a9f-3848-47d2-b2ac-2ee273dacf43',
  BD05: 'bd007b27-6221-4806-bfbb-5e258d837fae',
} as const;

// ─── Carpool Rides ───────────────────────────────────────────────────
export const RIDE = {
  CR01: 'b9fb5cbe-e8d1-4b5d-a6dd-2199ba476d19',
  CR02: 'f1e1567b-cdab-4914-8b32-2452b32a2839',
  CR03: '6dad54b0-ff49-4a71-bd2c-774d84e166ee',
  CR04: '4cf41a53-deae-4550-a4b5-f2bb64de83ad',
  CR05: 'e7c3a918-5f24-4d0b-b167-9a4e82f10dc5',
} as const;

// ─── Well Logs ───────────────────────────────────────────────────────
export const WELL_LOG = {
  WL01: 'e1000000-0000-4000-8000-000000000001',
  WL02: 'e1000000-0000-4000-8000-000000000002',
  WL03: 'e1000000-0000-4000-8000-000000000003',
  WL04: 'e1000000-0000-4000-8000-000000000004',
  WL05: 'e1000000-0000-4000-8000-000000000005',
  WL06: 'e1000000-0000-4000-8000-000000000006',
  WL07: 'e1000000-0000-4000-8000-000000000007',
  WL08: 'e1000000-0000-4000-8000-000000000008',
} as const;

// ─── KYC Records ─────────────────────────────────────────────────────
export const KYC = {
  KYC01: '8a1b2c3d-4e5f-6789-abcd-ef0123456701',
  KYC02: '8a1b2c3d-4e5f-6789-abcd-ef0123456702',
  KYC03: '8a1b2c3d-4e5f-6789-abcd-ef0123456703',
  KYC04: '8a1b2c3d-4e5f-6789-abcd-ef0123456704',
  KYC05: '8a1b2c3d-4e5f-6789-abcd-ef0123456705',
} as const;
