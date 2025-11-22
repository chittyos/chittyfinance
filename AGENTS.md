# Repository Guidelines

## Project Structure & Module Organization
- `client/` — React + Vite app (entry `client/index.html`; app code in `client/src/{pages,components,hooks,lib}`).
- `server/` — Express API and dev server glue (`server/index.ts`, `routes.ts`, `lib/*`, `storage.ts`, `db.ts`, `vite.ts`). Serves API and client on port 5000.
- `shared/` — Drizzle ORM schema and shared types (`shared/schema.ts`).
- `public/` — Built static assets (Vite outputs to `dist/public`).
- Config: `vite.config.ts` (aliases `@`, `@shared`, `@assets`), `tailwind.config.ts`, `tsconfig.json`, `.env.example`.

## Build, Test, and Development Commands
- `npm install` — Install dependencies.
- `npm run dev` — Auto-detect mode; runs API + client on :5000.
- `npm run dev:standalone` / `npm run dev:system` — Force local/system modes.
- `npm run build` — Build both modes to `dist/standalone` and `dist/system`.
- `npm run deploy:standalone` — Run production standalone (`node dist/standalone/index.js`).
- `npm run deploy:system` — Deploy system mode to Cloudflare Workers.
- `npm run check` — TypeScript type check.
- `npm run db:push` — Push Drizzle schema to the database.

## Coding Style & Naming Conventions
- TypeScript + ESM, 2-space indent.
- Use path aliases: `@/` (client), `@shared/`, `@assets/`.
- Components/pages: PascalCase. Utilities/hooks: kebab-case or camelCase.
- Prefer pure functions, early returns, and colocate files near usage.

## Testing Guidelines
- No automated tests configured; verify via UI and REST endpoints.
- If adding tests, prefer Vitest + React Testing Library; colocate as `*.test.ts(x)` next to modules.

## Commit & Pull Request Guidelines
- Commit messages: imperative, scoped (e.g., `server: add session route`, `chore: bump deps`).
- Keep PRs small and focused; include summary, rationale, and screenshots for UI changes.
- Link related issues; call out env/DB changes (e.g., schema) and run `npm run db:push`.

## Security & Configuration Tips
- Copy `.env.example` to `.env`; set `DATABASE_URL`, `OPENAI_API_KEY`, etc. Never commit secrets.
- Database is Neon/Postgres via Drizzle; route all data access through `server/storage.ts`.

