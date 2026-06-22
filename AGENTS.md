# swiss-army-app / Workbench

Monorepo: `workbench-app/` (React+Vite frontend), `workbench-backend/` (Express+Postgres backend).  
Frontend works fully offline (BYOK AI). Backend is optional — only enables email auth.

## Commands

| location | command | what |
|----------|---------|------|
| `workbench-app/` | `npm run dev` | Vite dev server |
| `workbench-app/` | `npm run build` | Build to `dist/` |
| `workbench-backend/` | `npm start` | Start Express server |
| `workbench-backend/` | `npm run dev` | Dev with `--watch` |
| `workbench-backend/` | `npm run migrate` | Apply `src/db/schema.sql` |
| root | `docker compose up` | Postgres 16 + backend |

Ports: frontend dev :5173, backend :3001, Postgres :5432.

## Architecture

- **No tests, no linting, no typechecking** — zero test files or config exist.
- **No React Router** — tool switching is state-based (`activeId` in App.jsx). All tools live under a single URL.
- **Tools** are registered in `App.jsx:26` in the `TOOLS` constant. Each has `{id, name, icon, ai, desc, component}`.
- **AI provider calls** go direct from browser to Anthropic/OpenRouter/Ollama — no backend proxy. API keys stored in `localStorage` (`workbench.aiSettings`).
- **Auth** uses JWT in `localStorage` (`workbench.authToken`). Backend only exposes `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`.
- **Canvas-based graph** in `graphTool.jsx` — uses GitHub Tree API to visualize repo structure. Force-directed layout, no D3 dependency.

## Key files

| file | role |
|------|------|
| `workbench-app/src/App.jsx` | Root layout, sidebar, tool routing |
| `workbench-app/src/aiClient.js` | AI provider client (Anthropic/OpenRouter/Ollama) |
| `workbench-app/src/backendClient.js` | Backend fetch wrapper with auth token |
| `workbench-app/src/AuthContext.jsx` | React context for signup/login/logout |
| `workbench-app/src/tools/` | 5 tool components (graphTool, tutorTool, aiTools, githubTool, utilityTools) |
| `workbench-backend/src/server.js` | Express entry — helmet, rate-limit, CORS, graceful shutdown |
| `workbench-backend/src/routes/auth.js` | Only remaining route group |

## Env vars

Frontend (`VITE_*`): `VITE_API_URL` — set to backend URL for auth, or leave empty for offline-only.

Backend: `DATABASE_URL` (required), `JWT_SECRET` (required), `FRONTEND_ORIGIN` (default `http://localhost:5173`).

## Deployment

- Frontend builds to static files (`dist/`). Vite `base: '/swiss-army-app/'` for GitHub Pages project site.
- GitHub Actions workflow at `.github/workflows/deploy-pages.yml` builds and deploys `dist/` on push to `main`.
- Backend needs a Postgres host — deploy via Docker compose or a cloud service (Railway, Render, Fly.io).

## Quirks

- `index.html` has a CSP meta tag — update `connect-src` when deploying the backend to a custom domain.
- `workbench-backend/src/db/pool.js:8` auto-detects Railway SSL (checks `DATABASE_URL` for `"railway"`).
- Password must be ≥8 chars with at least one letter and one number.
- `UpgradeScreen.jsx` still exists in `src/` directory but is not imported or used anywhere (dead file).
