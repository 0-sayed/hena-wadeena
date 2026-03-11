# Seed Scripts

Per-service seed data. Run after migrations:

```bash
# From repo root
pnpm --filter @hena-wadeena/identity run db:seed
pnpm --filter @hena-wadeena/market run db:seed
pnpm --filter @hena-wadeena/guide-booking run db:seed
pnpm --filter @hena-wadeena/map run db:seed
```

See T25 in the roadmap for full seed data targets:
- 40 listings
- 25 attractions
- 15 investments
- 5 guides + 10 packages
- 20+ POIs
- Price snapshots for 5 districts
