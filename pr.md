# PR #11 — feat: db setup guide booking / map

> Generated: 2026-03-13 | Branch: feat/db-setup-guide-booking-map | Last updated: 2026-03-13 18:30

## Worth Fixing

_None found._

## Not Worth Fixing

- [x] ~~Geometry columns missing SRID 4326 in map migration — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M50RN-- -->
  - _Reason: The TypeScript schema source already defines `srid: 4326` on all geometry columns. Drizzle doesn't emit the SRID in generated SQL — this is a toolchain limitation, not a schema bug. Manually patching generated migrations is against project conventions._
  > **services/map/drizzle/20260313163816_shocking_baron_strucker.sql:21**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Specify SRID 4326 for geometry columns.**
  >
  > The `origin` and `destination` columns use `geometry(point)` without SRID. Similarly, `location` on `points_of_interest` (line 42) has the same issue.
  >
  > Without SRID, spatial operations may assume wrong coordinate systems, leading to incorrect distance calculations or spatial joins.

- [x] ~~Snapshot.json geometry columns missing SRID — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M50RN_D -->
  - _Reason: Auto-generated Drizzle snapshot file — not manually editable. Will reflect whatever Drizzle generates from the schema source._
  > **services/map/drizzle/meta/20260313163816_snapshot.json:159**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Geometry columns missing SRID specification.**
  >
  > The `origin`, `destination`, and `location` columns are defined as `geometry(point)` without an SRID. This can cause spatial queries to silently return incorrect results by interpreting coordinates in the wrong coordinate reference system.
  >
  > Update to `geometry(Point, 4326)` for WGS84 compatibility and correct spatial query behavior.
