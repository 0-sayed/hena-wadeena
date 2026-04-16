import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import '@/lib/i18n'; // initialize i18next before React renders
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <App />
  </ThemeProvider>,
);
