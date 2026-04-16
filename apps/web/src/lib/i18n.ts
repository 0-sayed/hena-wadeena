import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ── Import translation bundles ──────────────────────────────────────
import commonAr from '@/locales/ar/common.json';
import layoutAr from '@/locales/ar/layout.json';
import homeAr from '@/locales/ar/home.json';
import authAr from '@/locales/ar/auth.json';
import accommodationAr from '@/locales/ar/accommodation.json';
import adminAr from '@/locales/ar/admin.json';
import guidesAr from '@/locales/ar/guides.json';
import jobsAr from '@/locales/ar/jobs.json';
import marketAr from '@/locales/ar/market.json';
import tourismAr from '@/locales/ar/tourism.json';
import logisticsAr from '@/locales/ar/logistics.json';
import investmentAr from '@/locales/ar/investment.json';
import profileAr from '@/locales/ar/profile.json';
import dashboardAr from '@/locales/ar/dashboard.json';
import walletAr from '@/locales/ar/wallet.json';
import kycAr from '@/locales/ar/kyc.json';
import searchAr from '@/locales/ar/search.json';
import marketplaceAr from '@/locales/ar/marketplace.json';

import commonEn from '@/locales/en/common.json';
import layoutEn from '@/locales/en/layout.json';
import homeEn from '@/locales/en/home.json';
import authEn from '@/locales/en/auth.json';
import accommodationEn from '@/locales/en/accommodation.json';
import adminEn from '@/locales/en/admin.json';
import guidesEn from '@/locales/en/guides.json';
import jobsEn from '@/locales/en/jobs.json';
import marketEn from '@/locales/en/market.json';
import tourismEn from '@/locales/en/tourism.json';
import logisticsEn from '@/locales/en/logistics.json';
import investmentEn from '@/locales/en/investment.json';
import profileEn from '@/locales/en/profile.json';
import dashboardEn from '@/locales/en/dashboard.json';
import walletEn from '@/locales/en/wallet.json';
import kycEn from '@/locales/en/kyc.json';
import searchEn from '@/locales/en/search.json';
import marketplaceEn from '@/locales/en/marketplace.json';

// ── i18next configuration ──────────────────────────────────────────
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: {
        common: commonAr,
        layout: layoutAr,
        home: homeAr,
        auth: authAr,
        accommodation: accommodationAr,
        admin: adminAr,
        guides: guidesAr,
        jobs: jobsAr,
        market: marketAr,
        tourism: tourismAr,
        logistics: logisticsAr,
        investment: investmentAr,
        profile: profileAr,
        dashboard: dashboardAr,
        wallet: walletAr,
        kyc: kycAr,
        search: searchAr,
        marketplace: marketplaceAr,
      },
      en: {
        common: commonEn,
        layout: layoutEn,
        home: homeEn,
        auth: authEn,
        accommodation: accommodationEn,
        admin: adminEn,
        guides: guidesEn,
        jobs: jobsEn,
        market: marketEn,
        tourism: tourismEn,
        logistics: logisticsEn,
        investment: investmentEn,
        profile: profileEn,
        dashboard: dashboardEn,
        wallet: walletEn,
        kyc: kycEn,
        search: searchEn,
        marketplace: marketplaceEn,
      },
    },
    fallbackLng: 'ar',
    defaultNS: 'common',
    ns: [
      'common',
      'layout',
      'home',
      'auth',
      'accommodation',
      'admin',
      'guides',
      'jobs',
      'market',
      'tourism',
      'logistics',
      'investment',
      'profile',
      'dashboard',
      'wallet',
      'kyc',
      'search',
      'marketplace',
    ],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'hena-wadeena:language',
      caches: [], // auth-context manages persistence, not the detector
    },
    react: {
      useSuspense: false, // translations are bundled, no async loading
    },
  });

export default i18n;
