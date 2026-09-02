# AGENTS.md

Two independent npm packages (no root workspace, no shared scripts):
- `backend/` — Express 5 + Prisma (PostgreSQL), ESM (`"type": "module"`), port 3000
- `frontend/` — React 19 + Vite + Tailwind 4, port 5173

## Commands
- Backend: `npm run dev` (`node --watch src/app.js`, hot reload) or `npm start` (`node src/app.js`, sem watch) in `backend/`
- Frontend: `npm run dev` (Vite), `npm run lint` (ESLint), `npm run build`
- Backend tests: `npm test` (Node built-in `node:test`, zero deps — roda `test/assessmentWeights.test.js` e `test/createClass.test.js`). `node --test` (sem args) também pega `auth.middleware.test.js`, que precisa de `jsonwebtoken` instalado.
- `test/createClass.test.js` stuba o singleton `prisma` via monkey-patch (sem banco); cria `prisma.region` e as delagações necessárias se o cliente gerado local estiver desatualizado. O controller de turma usa `locationId` (referência a Region), preenchido pelo `regionId` vindo do body da requisição.

## Prisma / PostgreSQL (backend)
- Schema: `backend/prisma/schema.prisma` (provider `postgresql`); config in `backend/prisma.config.ts` (Prisma 6 style, `engine: "classic"`, loads env via `dotenv/config`)
- Generated client lives in `backend/generated/prisma/` and is **gitignored** — run `npx prisma generate` after cloning or schema edits; apply migrations with `npx prisma migrate deploy`
- Generated client is imported **with the `.ts` extension**: `import { PrismaClient } from "../../generated/prisma/client.ts"` (see `src/config/prisma.js`). This requires Node >= 23.6 (TS type stripping) — no ts-node or build step.

## Env
- `backend/.env` (gitignored, not in repo) must define `DATABASE_URL` (PostgreSQL) and `SECRET_KEY` (JWT signing). Backend will not run without it.

## Wiring
- Backend entry: `backend/src/app.js` — mounts modular routers under `/`: `auth.js`, `users.js`, `classes.js`, `enrollments.js`, `assessments.js`, `grades.js`, `reports.js`. Public: `POST /register`, `POST /login`. Private: `GET /users/lista`, expects JWT as `Authorization: Bearer <token>`.
- Frontend routes in `src/App.jsx` are case-sensitive: `/` (Sigin), `/Login`, `/List`.
- `frontend/api/api.js` hardcodes `baseURL: "http://localhost:3000"` (no Vite proxy) — the backend must be running for the UI to work; CORS is open on the backend.
- Frontend stores the JWT in `localStorage.token`.

## Conventions
- UI strings, error messages, and comments are Portuguese (PT-BR); keep new ones in Portuguese.
- Tailwind 4 is CSS-first via `@tailwindcss/vite` — there is no `tailwind.config`, don't create one; style via `src/index.css`.
- Backend imports use explicit `.js` extensions (Node ESM).
