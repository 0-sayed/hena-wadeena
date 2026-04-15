/// <reference types="vite/client" />

import type React from 'react';

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  namespace JSX {
    interface IntrinsicElements {
      'dotlottie-wc': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          autoplay?: boolean | string;
          backgroundColor?: string;
          data?: string | ArrayBuffer;
          loop?: boolean | string;
          mode?: string;
          speed?: number | string;
          src?: string;
        },
        HTMLElement
      >;
    }
  }
}

declare module 'react' {
  interface ImgHTMLAttributes<_T> {
    fetchPriority?: 'high' | 'low' | 'auto';
  }
}

export {};
