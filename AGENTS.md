# Repository Guidelines

## Project Structure & Module Organization
- `src/server.ts` boots the Fastify API, registers routes, and opens the WebSocket hub.
- REST handlers live in `src/routes`, while domain logic is in `src/services`.
- `src/mqtt` handles broker ingestion; `src/ws` maintains connected clients; `src/schemas` stores Zod validators shared across modules.
- Database access flows through `src/db/prisma.ts` with schema and migrations in `prisma/`.
- Provision Postgres, Mosquitto, and Adminer via `docker-compose.yml`; adjust broker config in `mosquitto/` if required.
- `ws-test.html` is a disposable client for manual WebSocket checks.

## Build, Test, and Development Commands
- `npm install` bootstraps dependencies (run once per clone).
- `docker-compose up -d db mqtt adminer` starts required services locally.
- `npm run dev` watches `src/` with `tsx` for live reload; use when iterating.
- `npm run build` compiles TypeScript to `dist/`; `npm start` executes the compiled server.
- `npm run prisma:generate` refreshes the typed Prisma client; `npm run prisma:migrate` creates/applies migrations (requires a valid `DATABASE_URL`).

## Coding Style & Naming Conventions
- Code in TypeScript using native ESM; keep `.js` extensions on relative imports to match emitted files.
- Indent with two spaces and favor lower-case kebab-case filenames (e.g., `drone-detections.ts`).
- Surface validation via Zod schemas before calling services; reuse schema objects instead of duplicating shape definitions.
- Keep logs actionable and avoid dumping sensitive payload data.

## Testing Guidelines
- No automated test runner ships with the repo yet; manually exercise HTTP routes via Fastify inject or an API client, and use `ws-test.html` for WebSocket smoke tests.
- When adding coverage, place `.spec.ts` files near the modules they verify and wire an `npm test` script (Vitest pairs well with `tsx`).

## Environment & Configuration
- Copy `.env.example` (create if absent) and define `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/drones?schema=public` to match `docker-compose`.
- Keep broker credentials and JWT secrets out of git; inject them via environment variables or container secrets.
- Update files under `mosquitto/` when you need custom broker listeners or ACLs, and document the change in your PR.
- Centralized runtime settings live in `src/config/config-service.ts`. Thresholds for drone validation (window size, fraction, min confidence) and status transitions (active/recent/archived) are read from here. Adjust defaults in this module and/or via environment variables as needed.

## Commit & Pull Request Guidelines
- With no existing git history, default to Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) and keep subject lines under 72 characters.
- Reference issue IDs or task links in commit bodies, and mention any migrations or config updates.
- Pull requests should include a concise summary, manual test notes (commands/endpoints), and screenshots or payload samples for user-facing changes.
