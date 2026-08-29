# AGENTS.md

Two independent npm packages (no root workspace, no shared scripts):
- `backend/` — Express 5 + Prisma (MongoDB), ESM (`"type": "module"`), port 3000
- `frontend/` — React 19 + Vite + Tailwind 4, port 5173

## Commands
- Backend: `npm start` (`node --watch src/app.js`) in `backend/`
- Frontend: `npm run dev` (Vite), `npm run lint` (ESLint), `npm run build`
- No tests exist anywhere (backend `npm test` is a stub)

## Prisma / MongoDB (backend)
- Schema: `backend/prisma/schema.prisma` (provider `mongodb`); config in `backend/prisma.config.ts` (Prisma 6 style, `engine: "classic"`, loads env via `dotenv/config`)
- Generated client lives in `backend/generated/prisma/` and is **gitignored** — run `npx prisma generate` after cloning or schema edits; sync schema to Mongo with `npx prisma db push`
- Generated client is imported **with the `.ts` extension**: `import { PrismaClient } from "../generated/prisma/client.ts"` (see `routes/public.js`). This requires Node >= 23.6 (TS type stripping) — no ts-node or build step.
- Model `User` maps `id` to Mongo `_id` (`@map("_id") @db.ObjectId`)

## Env
- `backend/.env` (gitignored, not in repo) must define `DATABASE_URL` (MongoDB) and `SECRET_KEY` (JWT signing). Backend will not run without it.

## Wiring
- Backend entry: `backend/src/app.js` — mounts `public.js` and `private.js` (guarded by `backend/middleware/auth.js`) both under `/`. Public: `POST /register`, `POST /login`. Private: `GET /lista`, expects JWT as `Authorization: Bearer <token>`.
- Frontend routes in `src/App.jsx` are case-sensitive: `/` (Sigin), `/Login`, `/List`.
- `frontend/api/api.js` hardcodes `baseURL: "http://localhost:3000"` (no Vite proxy) — the backend must be running for the UI to work; CORS is open on the backend.
- Frontend stores the JWT in `localStorage.token`.

## Conventions
- UI strings, error messages, and comments are Portuguese (PT-BR); keep new ones in Portuguese.
- Tailwind 4 is CSS-first via `@tailwindcss/vite` — there is no `tailwind.config`, don't create one; style via `src/index.css`.
- Backend imports use explicit `.js` extensions (Node ESM).
