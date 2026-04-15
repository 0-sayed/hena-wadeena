import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the library so canvas is not needed in jsdom
vi.mock('browser-image-compression', () => ({
  default: vi.fn((file: File) => Promise.resolve(file)),
}));

import imageCompression from 'browser-image-compression';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_AVATAR_BYTES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  MAX_LOGO_BYTES,
  compressImage,
  readFileAsDataUrl,
} from './upload';

describe('constants', () => {
  it('exports expected byte limits', () => {
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
    expect(MAX_LOGO_BYTES).toBe(2 * 1024 * 1024);
    expect(MAX_AVATAR_BYTES).toBe(5 * 1024 * 1024);
    expect(MAX_DOCUMENT_BYTES).toBe(5 * 1024 * 1024);
  });

  it('ALLOWED_IMAGE_TYPES contains jpeg, png and webp', () => {
    expect(ALLOWED_IMAGE_TYPES.has('image/jpeg')).toBe(true);
    expect(ALLOWED_IMAGE_TYPES.has('image/png')).toBe(true);
    expect(ALLOWED_IMAGE_TYPES.has('image/webp')).toBe(true);
    expect(ALLOWED_IMAGE_TYPES.has('application/pdf')).toBe(false);
  });
});

describe('readFileAsDataUrl', () => {
  it('resolves with data URL on success', async () => {
    const mockResult = 'data:image/png;base64,abc';
    const mockFile = new File(['x'], 'test.png', { type: 'image/png' });

    // Stub FileReader
    const readerMock = {
      readAsDataURL: vi.fn(function (this: { result: string; onload: () => void }) {
        this.result = mockResult;
        setTimeout(() => this.onload(), 0);
      }),
      result: '',
      onload: vi.fn(),
      onerror: vi.fn(),
    };
    vi.spyOn(globalThis, 'FileReader').mockImplementation(
      () => readerMock as unknown as FileReader,
    );

    const result = await readFileAsDataUrl(mockFile);
    expect(result).toBe(mockResult);
  });

  it('rejects with custom error message on FileReader error', async () => {
    const mockFile = new File(['x'], 'test.png', { type: 'image/png' });

    const readerMock = {
      readAsDataURL: vi.fn(function (this: { onerror: () => void }) {
        setTimeout(() => this.onerror(), 0);
      }),
      result: '',
      onload: vi.fn(),
      onerror: vi.fn(),
    };
    vi.spyOn(globalThis, 'FileReader').mockImplementation(
      () => readerMock as unknown as FileReader,
    );

    await expect(readFileAsDataUrl(mockFile, 'custom error')).rejects.toThrow('custom error');
  });
});

describe('compressImage', () => {
  beforeEach(() => {
    vi.mocked(imageCompression).mockImplementation((file) => Promise.resolve(file));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls imageCompression with the file and merged options', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await compressImage(file, { maxSizeMB: 0.5, maxWidthOrHeight: 800 });

    expect(imageCompression).toHaveBeenCalledWith(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    });
  });

  it('uses default options when none are provided', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await compressImage(file);

    expect(imageCompression).toHaveBeenCalledWith(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    });
  });

  it('returns the compressed file', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const compressed = new File(['y'], 'photo-compressed.jpg', { type: 'image/jpeg' });
    vi.mocked(imageCompression).mockResolvedValueOnce(compressed);

    const result = await compressImage(file);
    expect(result).toBe(compressed);
  });
});
