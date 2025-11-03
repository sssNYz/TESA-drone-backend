# Drone List API – Implementation Plan

## Goals
- Provide `GET /drones` to return a validated list of drones (not raw detections).
- Prevent false positives by requiring sustained observations within a sliding time window before a drone is considered real.
- Track and expose per-drone aggregates: first seen, last seen, status, last position, source, total detections, updated_at.
- Support flexible filters: by status, by last seen since X seconds, by source, by minimum total detections, with pagination.

## Configuration (src/config/config-service.ts)
- `window_s` (default 5): length of observation window in seconds.
- `threshold_frac` (default 2/3): fraction of the window that must contain detections to confirm a drone.
- `min_confidence` (optional): minimum confidence for a detection to qualify.
- `active_s` (default 3): last_seen age <= active_s -> ACTIVE.
- `recent_s` (default 10): active_s < age <= recent_s -> RECENT.
- `archived_s` (default 600 / 10 min): age > archived_s -> ARCHIVED.

Notes
- Defaults live in code; allow overriding via env variables for quick tuning.
- Keep config centralized and typed in `src/config/config-service.ts`.

## Data Model (DB)
- Table `Drone` (registry of validated drones):
  - `drone_id` (unique string)
  - `first_seen` (datetime)
  - `last_seen` (datetime)
  - `status` (enum: ACTIVE | RECENT | ARCHIVED)
  - `source_id` (nullable string)
  - `lat_deg`, `lon_deg` (nullable float)
  - `alt_m`, `speed_mps` (nullable float)
  - `total_detections` (int, default 0)
  - `updated_at` (timestamp on update)

Indexes
- `(last_seen, status)` for fast filtering by time/status.
- `(source_id)` for source filters.

## Ingestion & Validation Flow
1) Ingest detections (existing MQTT pipeline) continues writing to `DroneDetection`.
2) Maintain an in-memory candidate map keyed by `drone_id`:
   - On first sighting: record `first_candidate_at` and `last_seen_at`.
   - Each subsequent detection updates `last_seen_at`.
   - Only detections meeting `min_confidence` count toward confirmation.
3) Confirmation rule (window): within `window_s`, the drone must be seen for at least `threshold_frac * window_s` seconds.
   - If a gap > `window_s` occurs before confirmation, reset the candidate window.
   - Once confirmed, create the `Drone` row (or upsert if concurrent) with aggregates.
4) After confirmation, every qualifying detection updates aggregates:
   - `last_seen` = detection ts; bump `total_detections`.
   - Update latest position/source when present.
   - Recompute `status` against thresholds.
5) Status updates:
   - Compute on each update; optionally run a periodic refresh to transition to RECENT/ARCHIVED when not receiving new detections.
   - Also refresh opportunistically on `GET /drones` reads if needed.
6) Candidate GC: periodically evict stale, unconfirmed candidates that haven’t been seen for > `window_s` to bound memory.

Edge cases
- Multiple sources reporting same `drone_id`: choose latest detection as truth; store `source_id` from the latest update.
- Out-of-order timestamps: prefer device timestamp; if clearly in the past, it still influences `last_seen`. Document this behavior.
- Confidence missing: counts only if `min_confidence` is undefined; otherwise ignore.

## API Design
Endpoint
- `GET /drones`

Query parameters (all optional)
- `status`: `ACTIVE` | `RECENT` | `ARCHIVED`
- `since_sec`: return drones with `last_seen >= now - since_sec`
- `source_id`: filter by camera/source
- `min_total`: minimum `total_detections`
- `limit` (default 100, max 500), `offset` (default 0)

Response item shape
- `id`: DB id (stringified if bigint)
- `drone_id`: string
- `first_seen`: ISO datetime
- `last_seen`: ISO datetime
- `status`: enum
- `source_id`: string | null
- `last_position`: { lat, lon, alt_m?, speed_mps? } | null
- `total_detect`: number
- `updated_at`: ISO datetime

Ordering
- Default order by `last_seen` desc.

## Implementation Steps
1) Config
   - Add `src/config/config-service.ts` with exported constants for: `window_s`, `threshold_frac`, `min_confidence`, `active_s`, `recent_s`, `archived_s` and a small helper to compute status.
2) DB schema
   - Add `DroneStatus` enum and `Drone` table with fields above; create indexes.
   - Generate and apply Prisma migration; regenerate client.
3) Registry service
   - Create `src/services/drone-registry.ts` to hold candidate state and the `onDetection()` function implementing the window rule and DB upserts/updates.
   - Add `refreshDroneStatuses(now?)` to batch-transition statuses using time thresholds; schedule periodic run or call on reads.
4) Wire ingestion
   - From MQTT ingest (both legacy single detection and frame objects), call `onDetection()` with normalized input and confidence (if available).
5) List service
   - Create `src/services/drone-list.ts` to query `Drone` with filters and map to response shape.
6) Route
   - Add schema `src/schemas/drone-list-query.ts` to validate query params.
   - Register `GET /drones` in `src/routes/drone.ts`, parse query, refresh statuses opportunistically, return list.
7) Manual verification
   - Seed via MQTT topics; verify transitions ACTIVE→RECENT→ARCHIVED based on last_seen.
   - Validate filters (status, since, source, min_total) and pagination.
8) Docs
   - Update `AGENTS.md` to mention centralized config file and tuning via env.
   - Note any new env vars in `.env.example` if used.

## Open Questions
- Device vs server time for status thresholds: prefer device ts (current plan) or server receive ts? Any clock drift mitigation?
- Merge policy across multiple sources: keep latest only or maintain per-source aggregates?
- Archival behavior: should ARCHIVED be hard cutoff at 10 minutes or adjustable per deployment (currently configurable)?
- Candidate window semantics: treat intermittent sightings inside window as continuous, or count actual observed duration only? (current plan uses simple elapsed since first_candidate_at).
- Minimum confidence default: should we gate by confidence by default, or accept all when unset?

## Future Enhancements (optional)
- Add a background scheduler to periodically call `refreshDroneStatuses`.
- Track per-source counts and last_seen per source.
- Expose `GET /drones/:drone_id` for details.
- Add soft-delete or retention policy for very old drones.

