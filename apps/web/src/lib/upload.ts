import imageCompression from 'browser-image-compression';

export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** 5 MB — used for produce listing images and avatars */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** 2 MB — used for transport / business logos */
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
/** 5 MB — used for avatar uploads */
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
/** 5 MB — used for KYC document uploads (images + PDFs) */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

interface CompressOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
}

/**
 * Compress an image file in-browser before upload.
 * Defaults: target ≤ 1 MB, max dimension 1920 px, uses a Web Worker.
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: opts.maxSizeMB ?? 1,
    maxWidthOrHeight: opts.maxWidthOrHeight ?? 1920,
    useWebWorker: true,
  });
}

/**
 * Read a File as a base-64 data URL.
 * Rejects with the provided error message on failure.
 */
export function readFileAsDataUrl(file: File, errorMessage = 'تعذر قراءة الصورة'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error(errorMessage));
    };
    reader.onerror = () => reject(new Error(errorMessage));
    reader.readAsDataURL(file);
  });
}
