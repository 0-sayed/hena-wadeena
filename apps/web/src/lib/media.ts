function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || '/api/v1';
}

export function resolveMediaUrl(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  if (
    normalized.startsWith('data:') ||
    normalized.startsWith('blob:') ||
    /^https?:\/\//i.test(normalized)
  ) {
    return normalized;
  }

  if (typeof window === 'undefined') {
    return normalized;
  }

  const apiBaseUrl = new URL(getApiBaseUrl(), window.location.origin);
  return new URL(normalized, `${apiBaseUrl.origin}/`).toString();
}
