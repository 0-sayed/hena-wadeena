import { sql } from 'drizzle-orm';
import type { Column, SQL } from 'drizzle-orm';

export function makePoint(lng: number, lat: number) {
  return sql`public.ST_SetSRID(public.ST_MakePoint(${lng}, ${lat}), 4326)`;
}

export function withinRadius(column: Column | SQL, point: SQL, meters: number) {
  return sql`public.ST_DWithin(${column}::public.geography, ${point}::public.geography, ${meters})`;
}

export function distanceTo(column: Column | SQL, point: SQL) {
  return sql`public.ST_Distance(${column}::public.geography, ${point}::public.geography)`;
}
