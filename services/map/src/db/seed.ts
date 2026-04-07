import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { getLayer, logSummary, point } from '../../../../scripts/seed/seed-utils.js';

import { carpoolRides as carpoolRidesTable, pointsOfInterest } from './schema/index.js';
import { carpoolRides as rideData } from './seed-data/carpool.js';
import { essentialPois, showcasePois } from './seed-data/pois.js';

// ── Fallback images by category ──────────────────────────────────────────────
// Used only when POI doesn't have explicit images
const FALLBACK_CATEGORY_IMGS: Record<string, string> = {
  historical: '/images/seed/pvFtrzwuc6g.jpg',
  natural: '/images/seed/WGYGBTqfZSc.jpg',
  religious: '/images/seed/pvFtrzwuc6g.jpg',
  recreational: '/images/seed/MB2eoqiNKiw.jpg',
  accommodation: '/images/seed/VmFFbYAp7oA.jpg',
  restaurant: '/images/seed/MB2eoqiNKiw.jpg',
  service: '/images/seed/umfgtmwR__Y.jpg',
  government: '/images/seed/umfgtmwR__Y.jpg',
};
// ─────────────────────────────────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const pgClient = postgres(connectionString, {
  max: 1,
  connection: { search_path: 'map, public' },
});
const db = drizzle(pgClient);

async function main() {
  const layer = getLayer();

  // 1. Points of interest — essential always, showcase adds more
  const allPois = layer === 'showcase' ? [...essentialPois, ...showcasePois] : essentialPois;

  const poiResult = await db
    .insert(pointsOfInterest)
    .values(
      allPois.map((p) => ({
        id: p.id,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        description: p.description,
        category: p.category,
        address: p.address,
        phone: p.phone,
        status: 'approved' as const,
        submittedBy: p.submittedBy,
        approvedBy: p.approvedBy,
        images: p.images ?? [
          FALLBACK_CATEGORY_IMGS[p.category] ??
            `https://picsum.photos/seed/${p.id.slice(-8)}/800/600`,
        ],
        location: point(p.lat, p.lon),
      })),
    )
    .onConflictDoNothing()
    .returning({ id: pointsOfInterest.id });

  let rideCount = 0;
  let passengerCount = 0;

  if (layer === 'showcase') {
    // 2. Carpool rides — showcase only
    const rideResult = await db
      .insert(carpoolRidesTable)
      .values(
        rideData.map((r) => ({
          id: r.id,
          driverId: r.driverId,
          originName: r.originName,
          destinationName: r.destinationName,
          departureTime: r.departureTime,
          seatsTotal: r.seatsTotal,
          seatsTaken: r.seatsTaken,
          pricePerSeat: r.pricePerSeat,
          notes: r.notes,
          status: r.status,
          origin: point(r.originLat, r.originLon),
          destination: point(r.destLat, r.destLon),
        })),
      )
      .onConflictDoNothing()
      .returning({ id: carpoolRidesTable.id });
    rideCount = rideResult.length;

    // 3. Carpool passengers — showcase only
    const { carpoolPassengers } = await import('./schema/index.js');
    const { showcaseCarPoolPassengers } = await import('./seed-data/passengers.js');
    const passengerResult = await db
      .insert(carpoolPassengers)
      .values(
        showcaseCarPoolPassengers.map((p) => ({
          id: p.id,
          rideId: p.rideId,
          userId: p.userId,
          seats: p.seats,
          status: p.status,
          joinedAt: p.joinedAt,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: carpoolPassengers.id });
    passengerCount = passengerResult.length;
  }

  logSummary('map', layer, {
    pois: poiResult.length,
    ...(layer === 'showcase' && { rides: rideCount, passengers: passengerCount }),
  });
}

main()
  .catch((error: unknown) => {
    console.error('Map seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pgClient.end());
