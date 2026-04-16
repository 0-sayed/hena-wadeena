import '@testing-library/jest-dom';
import '@/lib/i18n'; // initialize i18next for tests
import i18n from 'i18next';

// Default to English for tests (most test assertions check English strings)
void i18n.changeLanguage('en');

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => { },
    removeListener: () => { },
    addEventListener: () => { },
    removeEventListener: () => { },
    dispatchEvent: () => { },
  }),
});
