# Seed Data Scripts

Populates the database with authentic New Valley Governorate data. Two layers available.

## Layers

### Essential (default)

Minimum data for development and CI:
- 4 admin users (team) + 7 demo role users
- 3 listings, 3 commodities, 2 investments
- 3 attractions, 1 guide, 2 packages
- 5 POIs (one per city)

### Showcase

Full dataset for hackathon demo (includes essential):
- 19 users across all roles
- 40 listings, 10 commodities with price history, 15 investments
- 5 business directories, listing reviews
- 25 attractions, 5 guides, 10 packages
- 5 bookings, guide reviews
- 20+ POIs, 5 carpool rides

## Usage

```bash
# Seed essential data (default)
pnpm db:seed

# Seed showcase data (includes essential)
pnpm db:seed:showcase

# Seed a specific service
pnpm --filter @hena-wadeena/identity run db:seed
pnpm --filter @hena-wadeena/market run db:seed:showcase
```

## Credentials

All seed accounts use the same password, set via the `SEED_PASSWORD` env var.
Falls back to `Test1234!` for local dev when `SEED_PASSWORD` is not set.

| Email | Role |
|-------|------|
| sayed@hena-wadeena.online | admin |
| adly@hena-wadeena.online | admin |
| taher@hena-wadeena.online | admin |
| shawqi@hena-wadeena.online | admin |
| tourist@hena-wadeena.online | tourist |
| resident@hena-wadeena.online | resident |
| student@hena-wadeena.online | student |
| merchant@hena-wadeena.online | merchant |
| driver@hena-wadeena.online | driver |
| guide@hena-wadeena.online | guide |
| investor@hena-wadeena.online | investor |

## Notes

- Seed scripts are idempotent — safe to re-run
- Execution order: identity → market → guide-booking → map
- Requires `DATABASE_URL` in `.env`
- Run migrations first: `pnpm --filter @hena-wadeena/identity run db:migrate` (etc.)
- All monetary values are in piasters (1 EGP = 100 piasters)
- PostGIS coordinates: `ST_MakePoint(lon, lat)` — longitude first
