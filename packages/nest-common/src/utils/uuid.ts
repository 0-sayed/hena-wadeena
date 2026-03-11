import { uuidv7 } from 'uuidv7';

/** Generate a new UUID v7 — time-sortable, monotonic ordering guaranteed */
export function generateId(): string {
  return uuidv7();
}
