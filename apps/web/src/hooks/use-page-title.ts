import { useEffect } from 'react';

const SITE_NAME = 'هُنَا وَادِينَا';

export function usePageTitle(title?: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
