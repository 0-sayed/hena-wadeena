export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

export function pickDefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
