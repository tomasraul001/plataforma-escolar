# AGENTS.md

Two independent npm packages (no root workspace, no shared scripts):
- `backend/` — Express 5 + Prisma (PostgreSQL), ESM (`"type": "module"`), port 3000
- `frontend/` — React 19 + Vite + Tailwind 4, port 5173

## Commands
- CI: `.github/workflows/ci.yml` corre em push/PR para `master` — 2 jobs paralelos: backend (`prisma generate` + `npm test` com `DATABASE_URL` dummy) e frontend (`npm run lint` + `npm run build`). Node 23, `npm ci` com cache. Erros de lint falham o CI (avisos não).
- Backend: `npm run dev` (`node --watch src/app.js`, hot reload) or `npm start` (`node src/app.js`, sem watch) in `backend/`
- Frontend: `npm run dev` (Vite), `npm run lint` (ESLint), `npm run build`
- Backend tests: `npm test` (Node built-in `node:test`, roda todos os `test/*.test.js`, cada um num processo separado — via auto-discovery).
  - **Requisito prévio**: `DATABASE_URL` tem de estar definida (mesmo que aponte para uma BD inexistente). `prisma.config.ts` usa `env("DATABASE_URL")` e o `prisma generate` falha sem ela, logo sem o cliente gerado quase todos os testes falham com `ERR_MODULE_NOT_FOUND`. Nenhum teste toca na BD — só precisa da variável presente.
  - Zero deps externas (rodam mesmo sem `npm install`): `assessmentWeights.test.js`, `validations.test.js`, `classStatus.test.js`.
  - Exigem `npm install` + `npx prisma generate` (importam controllers/singleton `prisma`): `auth.controller.test.js`, `refreshToken.test.js`, `users.controller.test.js`, `classes.controller.test.js`, `classesPrng.test.js`, `classesStats.test.js`, `createClass.test.js`, `assessments.controller.test.js`, `grades.controller.test.js`, `attendance.controller.test.js`, `fichaFormando.test.js`, `planilha.test.js`, `pautaPdf.test.js`, `auth.middleware.test.js`, `getProfile.test.js`, `updateProfile.test.js`.
  - Cobertura por área: IDOR em `attendance`, `assessments`, `grades`, `fichaFormando`, `planilha` (template); rotação/reuso de refresh token em `refreshToken`; regra `CLOSED || ARCHIVED` em `grades`, `attendance`, `classStatus`, `planilha` (GET só-leitura + `initializePlanilha`); escala 0–20 em `validations` e `grades`; `GET /users/perfil` em `getProfile` e o contrato `undefined`=manter / `null`=apagar de `updateProfile` em `updateProfile`; login com 401 único anti-enumeração em `auth.controller`; escopo do formador a formandos das suas turmas em `users.controller`; whitelist de status em `updateClass` e remoção de `secretKey` das respostas em `classes.controller`.
  - Estado atual: **217 testes, 217 a passar**. Cobertura adicional (Fase 2): CAS atómico no refresh (`refreshToken`), rasto de auditoria nos routes (`auditLog`), `validateEnv`+`TRUST_PROXY` (`env`), peso de avaliação em (0,100] (`assessments.controller`), limite de login por conta (`loginLimiter` no route `auth`).
  - `validateEnv` é injectável (`exit = process.exit`): os testes passam um spy e verificam que `DATABASE_URL`/`SECRET_KEY` em falta saem com código 1, nunca chamando o `process.exit` real.
  - Remendo pós-Fase 2: `closeClass` usa `isLocked` (não só `CLOSED` — fechar não desarquiva); `changePassword` revoga os refresh tokens ativos (troca de senha = resposta a sessão roubada); `updatePlanilhaTemplate` respeita o lock (era o único write vivo em turma travada).
  - Contactos (`contacts.test.js`): `getContacts` devolve `{id,name,email,phone,role}` a coordenador/secretaria (toda a lista, `where: {}`) e ao formador (formandos ACTIVE + formadores com turma OPEN/CLOSED nas regiões das suas turmas; `in: []` quando não tem turmas). GET só-leitura, sem `auditLog`.
- Padrão de stubbing: `test/*.test.js` importa o mesmo singleton `prisma` que o controller, reatribui os delegates (`findUnique`, `findMany`, `create`, etc.), usa `mockRes()` e restaura via `after()`. Cada arquivo roda em processo próprio, então não há interferência entre eles. Se o delegate não existir no cliente gerado local (gitignored/desatualizado), recrie-o dentro do stub (ver `createClass.test.js` — cria `prisma.region`).
  - Ao stubbar `prisma.$transaction` tem de suportar as duas formas: `$transaction(callback)` e `$transaction([...promessas])`.
  - **O `tx` de dentro do `$transaction(callback)` não é o mesmo que `prisma`.** Se o stub passar `prisma` como `tx`, qualquer `tx.$transaction(...)` aninhado passa no teste rebenta em produção — o cliente transacional do Prisma não tem `$transaction`. Quando o código usar `tx`, faça o stub passar um `tx` mais pobre que o real (sem `$transaction`), senão o teste está a mentir. Ver o teste "nao aninha `$transaction`" em `attendance.controller.test.js`.
  - **Um stub que devolve o objeto inteiro esconde bugs de `select`.** Se o controller pede `select: { present: true }` mas agrupa por `enrollmentId`, o teste passa (o mock devolve o campo todo) e o `perStudent` sai vazio na BD real. Quando o código depender de um `select`, o stub tem de devolver só os campos pedidos e/ou o teste tem de verificar o `args.select`.
- O controller de turma usa `locationId` (referência a Region), preenchido pelo `regionId` vindo do body da requisição (ver `createClass.test.js`).

## Regras de escrita em turmas (backend/src/utils/classStatus.js)
- `isLocked(status)` → `true` para `CLOSED` e `ARCHIVED`. `lockedMessage(action)` gera a mensagem PT-BR padrão.
- **Todos** os guards de escrita (notas, avaliações, inscrições, presenças) devem usar este helper. `status === "CLOSED"` isolado é um bug: turmas arquivadas ficavam editáveis.

## Escala de notas
- Escala angolana 0–20. A regra vive em `validateGradeValue` (`backend/src/utils/validations.js`) e tem de ser usada em `createGrade`, `updateGrade` e `bulkCreateGrades` — `Math.round(Number(x))` sozinho gravava `NaN` e valores fora do intervalo.

## Frequência e presença
- `MIN_ATTENDANCE_PERCENT = 75` e `attendanceStatus(pct)` → `ok` / `warning` / `critical` vivem em `backend/src/utils/attendance.js`. O limiar é regra de domínio: o frontend consome o `status` que o backend devolve, nunca repete o ternário `>= 75`.
- **O denominador da percentagem é o número de sessões, nunca o número de registos.** Um aluno que entra a meio do curso só tem registos nas sessões a que assistiu; usar `records.length` como total dá-lhe 100% falso. Ver `getSummary` em `attendance.controller.js`.
- A query de `attendanceSession` em `getSummary` faz `include: { records: { select: { enrollmentId: true, present: true } } }`. **`enrollmentId` tem de estar no `select`**: é por ele que o `perStudent` agrupa, e sem ele todos os alunos saem como `awaitingSessions` com 0%.

## Notificações
- `backend/src/utils/notifications.js` — `createNotification(userId, {...})` é non-blocking e engole erros: uma notificação falhada nunca pode fazer falhar a operação que a originou. Mesmo padrão do `auditLog.middleware.js`.
- Modelo `Notification` com `onDelete: Cascade` no `userId` (como `RefreshToken`) para não ser a 5.ª dependência do hard delete em `users.controller.js`.

## Docker
- `backend/Dockerfile` copia `src`, `prisma`, `prisma.config.ts` e **`assets`** (o logo em `reports.controller.js` resolve para `/app/assets/logo.png`; sem o COPY a geração de pauta falha com ENOENT).
- `prisma.config.ts` chama `env("DATABASE_URL")`, por isso o `RUN npx prisma generate` no build precisa de uma `DATABASE_URL` placeholder inline; o valor real vem do runtime (`entrypoint.sh` → `migrate deploy`).
- `frontend/.dockerignore` **não** pode ignorar `.env.production` (é lido no `npm run build` e contém `VITE_API_URL`; sem ele `src/services/api.js` cai no default `http://localhost:3000`). `.env` e `.env.local` continuam ignorados.

## Prisma / PostgreSQL (backend)
- Schema: `backend/prisma/schema.prisma` (provider `postgresql`); config in `backend/prisma.config.ts` (Prisma 6 style, `engine: "classic"`, loads env via `dotenv/config`)
- Generated client lives in `backend/generated/prisma/` and is **gitignored** — run `npx prisma generate` after cloning or schema edits; apply migrations with `npx prisma migrate deploy`
- Generated client is imported **with the `.ts` extension**: `import { PrismaClient } from "../../generated/prisma/client.ts"` (see `src/config/prisma.js`). This requires Node >= 23.6 (TS type stripping) — no ts-node or build step.

## Env
- `backend/.env` (gitignored, not in repo) must define `DATABASE_URL` (PostgreSQL) and `SECRET_KEY` (JWT signing). Backend will not run without it — `validateEnv` em `backend/src/config/env.js` sai com código 1 e mensagem legível (ver `env.test.js`), enquanto chaves de acesso em falta são só aviso.
- `TRUST_PROXY` (deploy em `backend/src/app.js`): confia no `X-Forwarded-For` **só** se `TRUST_PROXY` explícito (`true`/`false`/inteiro) ou se os markers `RAILWAY_PUBLIC_DOMAIN`/`RAILWAY_ENVIRONMENT` existirem. **Default é não confiar** — num deploy direto, confiar deixaria qualquer cliente falsificar o IP e contornar o rate limit. O Railway injeta os markers, mas se a app correr sem eles, definir `TRUST_PROXY=1` na dashboard.

## Wiring
- Backend entry: `backend/src/app.js` — mounts modular routers under `/`: `auth.js`, `users.js`, `classes.js`, `enrollments.js`, `assessments.js`, `grades.js`, `reports.js`. Public: `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`. Private: `GET /users/lista`, `GET /users/contactos` (a lista inclui `phone`, scoped por role), expects JWT as `Authorization: Bearer <token>`.
- Frontend routes in `src/App.jsx` are case-sensitive: `/` (Sigin), `/Login`, `/List`.
- `frontend/api/api.js` hardcodes `baseURL: "http://localhost:3000"` (no Vite proxy) — the backend must be running for the UI to work; CORS is open on the backend.
- Frontend stores JWT in `localStorage.token` and refresh token in `localStorage.refreshToken`.
- Auth flow: access token (1h), refresh token (7d, SHA-256 hashed in DB). Interceptor auto-refreshes on 401 with single-flight dedup; on failure, redirects to `/login`.

## Rate Limiting
- Global: 300 req/15min per IP (`backend/src/middleware/rateLimit.middleware.js`).
- Auth endpoints (`/auth/login`, `/auth/register`, `/auth/refresh`): 10 req/15min.
- `POST /login` tem **também** um `loginLimiter` por conta (20 tentativas/15min, key = email normalizado): o limiter por IP não trava spraying distribuído. Tradeoff assente: um atacante consegue bloquear o login de uma conta por 15min (auto-recuperável). Atenção: a key regressa a "sem-email" se o body não tiver `email` — nunca usar `req.ip` no `keyGenerator` (v8 valida e rejeita sem o helper `ipKeyGenerator`).
- `trust proxy` segue `TRUST_PROXY`/markers Railway (default `false`; ver secção Env). 429 returns JSON PT-BR.

## Headers de segurança (frontend)
- `frontend/nginx.conf` e `frontend/vercel.json` servem headers de segurança + CSP. A CSP é restrita: `'self'` + Google Fonts (`fonts.googleapis.com`/`gstatic`) + Firebase Analytics (`firebaselogging.googleapis.com`, `firebase.googleapis.com`, `firebaseinstallations.googleapis.com`, `www.googletagmanager.com`, `google-analytics.com`, `*.analytics.google.com`, `*.app-measurement.com`) + origem do backend em `connect-src`.
- No `nginx.conf`, a origem do backend entra como `${BACKEND_URL}` (o `envsubst` do `entrypoint.sh` só substitui essa variável — a CSP **não** pode usar `$` de variáveis nginx fora disso). No `vercel.json` está hardcoded e **tem de igualar o `VITE_API_URL` usado no build** — origem desalinhada rebenta a API com "violates CSP connect-src" no console/rede (aconteceu quando o front era servido por Vercel a apontar para Railway e o build usava um domínio próprio).
- A Firebase Analytics **carrega o gtag/GTM**, por isso `script-src` tem `https://www.googletagmanager.com` (não é só `'self'`) e `img-src` inclui os domínios de `collect`. Sem isto o SDK avisa "Failed to fetch … measurement ID" e dispara erros de CSP por `firebase.googleapis.com` (webConfig) e `firebaseinstallations.googleapis.com` (installations).
- `style-src` inclui `'unsafe-inline'` (atributo `style` do React). Se um dia carregares Google Fonts por `<link>`, o preconnect também precisa de `connect-src` para `fonts.googleapis.com`/`gstatic`; e o Firebase usa só `firebase/analytics` — se algum dia adicionares Firestore/Realtime, o `connect-src` precisa dos domínios respetivos.

## Pseudo-tempo real: polling de 60s (WebSocket descartado)
O WebSocket foi **descartado por decisão de produto** — nunca chegou a existir em código (zero `socket.io`/`ws`/`EventSource`/`setInterval` no repo). Ver `estrutura-plataforma-gestao-escolar.md` secção 13 para o raciocínio. Não reintroduzir sem falar com o utilizador: a razão foi volume de alterações (notas = algumas/dia, presenças = 1/sessão) versus o custo de um canal bidirecional sempre aberto e de um servidor com estado partilhado que impediria escalar sem sticky sessions.
- `frontend/src/hooks/usePolling.js` — hook único, intervalo 60s. Pausa o timer enquanto `document.hidden` e dispara uma busca imediata ao voltar a ser visível.
- **O callback do polling nunca toca em `setLoading`** — a página pisca a cada minuto. Só escreve nos estados de dados (`setGrades`, `setSessions`, ...).
- Só ligar em páginas que mostram dado que muda sozinho (`Notas`, `PresencasDaTurma`, `PautaDeTurma`, `Planilha`, `Dashboard` do formador). O polling não corre no `useEffect` de carga inicial, e nunca em todas as páginas em simultâneo — o rate limit global é 300 req/15min.
- O badge do sino usa `GET /notifications/unread-count` (endpoint leve), não a lista completa, a cada minuto.

## Exclusão de utilizadores
- `DELETE /users/delete/:id` faz **hard delete**. Como `User` é referenciado por `Class.trainerId`, `Enrollment.studentId`, `Grade.updatedById` e `AuditLog.userId` (FKs sem `onDelete`), o controller conta essas 4 dependências antes de apagar e devolve **409** com o detalhe do que bloqueia. `P2003` do Prisma é apanhado como rede de segurança (nunca deve chegar a 500).
- Soft delete exigiria `deletedAt` em `User` + migração; não implementado por decisão de produto.

## Conventions
- UI strings, error messages, and comments are Portuguese (PT-BR); keep new ones in Portuguese.
- Tailwind 4 is CSS-first via `@tailwindcss/vite` — there is no `tailwind.config`, don't create one; style via `src/index.css`.
- Backend imports use explicit `.js` extensions (Node ESM).
- Frontend: `npm run lint` está a **0 erros / 42 avisos** (todos avisos, nenhum bloqueia o build).
  - Os avisos dividem-se em `react-hooks/set-state-in-effect` (despromovido a `warn` em `eslint.config.js`) e `react-hooks/exhaustive-deps`.
  - **`set-state-in-effect` foi despromovido de propósito:** a regra do React Compiler marca o padrão `useEffect(() => fetchX(), [])` → `setState`, porque não prova que o `setState` fica depois do `await`. Corrigir as 25 instâncias exigiria migrar a camada de dados (React Query / `use`+Suspense), não uma correção pontual. Reverter a regra em `frontend/eslint.config.js` se essa migração for feita.
  - `toast` em `ToastContext.jsx` **não** é memoizado (objeto novo a cada render). Por isso **nunca** adicionar `toast` às deps de um `useEffect`/`useCallback` — dispara loop infinito de renders. Se precisares, memoiza com `useMemo` primeiro.
  - `react-refresh/only-export-components` está desativado por linha nos dois contexts: provider + hook no mesmo ficheiro é o padrão idiomático dos Contexts do React.
  - Ao mover uma função `fetch` para cima do respetivo `useEffect` (para calar `react-hooks/immutability`), confirma que ela não referencia estado declarado abaixo — é um TDZ em runtime que o build não apanha.

## Firebase Analytics + Error Tracking (frontend)
- Firebase SDK v12.19 instalado em `frontend/` (`firebase/analytics`).
- `frontend/src/firebase.js` — inicializa Firebase Analytics; exporta `log` (logEvent), `setCustomKey` (setUserProperties), `setUserIdentifier` (setUserId).
- `frontend/src/components/ErrorBoundary.jsx` — React Error Boundary (classe) que captura erros de renderização e envia como eventos Analytics.
- `frontend/src/main.jsx` — Error Boundary envolve toda a árvore; `window.onerror` e `window.onunhandledrejection` capturam erros globais como eventos Analytics.
- `frontend/src/contexts/AuthContext.jsx` — `setUserIdentifier` no login/logout; `setCustomKey("role", ...)` para filtrar erros por role.
- `frontend/src/services/api.js` — eventos `api_error` e `api_401_auth` no interceptor.
- Variáveis de ambiente: `VITE_FIREBASE_*` em `frontend/.env` (gitignored). App funciona sem elas (Analytics silencia).
- Eventos rastreados: `js_error`, `unhandled_rejection`, `render_error`, `api_error`, `api_401_auth`, `login`, `logout`.
- **Nota:** Firebase Crashlytics NÃO tem SDK web — use Analytics para tracking de erros no web.
- `npm audit` no frontend reporta 4 highs em `@firebase/firestore` (via `@firebase/firestore-compat`). São falsos positivos práticos: só se importa `firebase/analytics` e o bundle não contém código do Firestore (`firestore.googleapis.com`/`FirestoreClient` ausentes). A "fix" oficial é `--force` com quebra de major — não aplicar.
