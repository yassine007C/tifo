# Tifo

A crowd-coordination platform that turns stadium fans into a living pixel display. Each user's phone screen becomes one pixel of a Tifo banner — when everyone holds up their phone, the full design appears.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/tifo run dev` — run the React frontend (port assigned by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query + Tailwind + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Replit Auth (OIDC with PKCE, sessions in PostgreSQL)
- Image processing: `sharp` (server-side pixel extraction)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/` — Drizzle DB schema (auth.ts, tifoServer.ts, participant.ts)
- `artifacts/api-server/src/routes/servers.ts` — All Tifo server + participant routes
- `artifacts/api-server/src/lib/imageProcessor.ts` — Image → pixel grid conversion using sharp
- `artifacts/tifo/src/` — React frontend (pages, components, theme)
- `lib/replit-auth-web/` — Browser auth hook (`useAuth`)

## Architecture decisions

- Image is base64-encoded client-side and sent as JSON; server uses `sharp` to downsample to the target grid size and extract pixel colors
- Access codes are 6-character uppercase alphanumeric (avoiding ambiguous chars like 0/O, 1/I)
- Participants poll `/api/servers/:id/status` every 2 seconds for display activation — no WebSocket needed for this scale
- Pixel assignment is sequential (next free slot); users can swap to any free coordinate after joining
- The full pixel data (hex color array) is stored as JSON text in the `tifo_servers.pixel_data` column — no separate pixel table

## Product

- **Create a Tifo server** — upload an image, set grid dimensions (default 50×30), receive a 6-char access code
- **Join a server** — enter the access code, get auto-assigned a pixel (number + X/Y coordinates + color)
- **Swap position** — pick any free X/Y coordinate before the display starts
- **Server lobby** — visual grid showing all taken positions, your assignment highlighted
- **Display mode** — full-screen color when admin activates; Wake Lock API keeps screen on
- **Admin panel** — activate/deactivate display, view grid, share access code

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run codegen after changing `lib/api-spec/openapi.yaml`
- The express JSON body limit is set to `50mb` to accommodate base64-encoded images
- `sharp` requires native binaries — it was installed with `pnpm --filter @workspace/api-server add sharp`
- `replit-auth-web` is a composite lib — it must be listed in root `tsconfig.json` references AND the web artifact's `tsconfig.json` references

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `replit-auth` skill for auth flow details
