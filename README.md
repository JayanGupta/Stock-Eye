<div align="center">

# Stock-Eye — Warehouse Intelligence Platform

Intelligent warehouse inventory with AI demand forecasting, computer-vision counting, and integrated billing.

</div>

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts |
| Backend (web) | Next.js Server Actions + Server Components, Auth.js (NextAuth v5) |
| ML Service | FastAPI + YOLOv8 + scikit-learn gradient boosting (walk-forward backtesting), reportlab |
| Database | PostgreSQL 16 via Prisma (multi-tenant, driver-adapter) |
| Infra | pnpm workspace, Docker Compose, GitHub Actions (CI + GHCR publish) |

## Project structure

```
Stock-Eye/
├── web/                      # Next.js application (all product code)
│   ├── prisma/
│   │   ├── schema.prisma     # Multi-tenant data model
│   │   └── seed.ts           # Demo workspace seeder
│   └── src/
│       ├── app/              # App Router: (auth), (app) route groups, api/ml proxy
│       ├── components/       # UI components (shadcn + feature components)
│       ├── lib/              # db, auth-utils, actions, queries, ml client
│       └── generated/        # Prisma client (generated)
├── src/backend/              # FastAPI ML service
│   ├── routes/               # detection (YOLOv8), forecast, billing (PDF)
│   └── services/             # detector, forecaster (global gradient-boosting)
├── deploy/                   # Production compose (GHCR images) + .env template
├── scripts/                  # deploy.sh
├── Dockerfile.web            # Next.js standalone image
├── Dockerfile.api            # FastAPI image
├── docker-compose.yml        # local: web + api + postgres + redis
└── .github/workflows/        # ci.yml + cd.yml (GHCR publish)
```

## Quickstart

**Prerequisites:** Node 22, pnpm, PostgreSQL 16, Python 3.11+

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp web/.env.example web/.env
# set DATABASE_URL to your Postgres connection string

# 3. Create schema + demo data
pnpm db:migrate     # runs prisma migrate dev
pnpm db:seed        # creates demo@stockeye.dev / demo1234

# 4. Start the ML service (terminal 1)
pnpm ml:install     # pip install -r requirements.txt
pnpm ml:dev         # uvicorn on :8000

# 5. Run the web app (terminal 2)
pnpm dev            # → http://localhost:3000
```

**Demo login:** `demo@stockeye.dev` / `demo1234`

New workspaces created via `/register` are auto-seeded with a 60-item catalog and 12 months of sales history.

## Features

- **Multi-tenant auth & RBAC** — org-scoped data, OWNER/ADMIN/MANAGER/VIEWER roles, Auth.js credentials with bcrypt
- **Dashboard** — KPIs, revenue trends, category mix, top sellers, low-stock & expiry alerts
- **Inventory ledger** — full CRUD, immutable stock transactions (restock/sale/waste/adjust), reorder points
- **Realtime detection** — YOLOv8 on a live camera feed (box overlay, FPS counter) or uploaded images, with detection history
- **ML forecasting** — a global gradient-boosting model over weekly demand features with walk-forward backtesting vs a naive baseline (WMAPE, MAE improvement), per-item charts and restock recommendations
- **Billing terminal** — POS checkout with automatic ledger write-back (stock decrement + SALE transactions) and PDF invoices

## ML forecasting approach

- Sales are aggregated to weekly buckets (daily demand is intermittent for most SKUs).
- A single **global gradient-boosting model** is trained on pooled weekly observations: calendar, lagged, rolling and zero-inflation features plus category/price attributes.
- Accuracy is measured with a **walk-forward backtest** retraining on the past and evaluating on held-out weeks, always compared against a naive persistence baseline (WMAPE + MAE improvement).
- Items with sparse history fall back to a seasonal baseline; the method is reported per item.
- Forecasts are cached for 10 minutes, so the first load is slow (~10 s) and subsequent loads are instant.

## Docker (local)

```bash
cp .env.example .env   # set AUTH_SECRET
docker compose up --build
# web → :3000 · api → :8000 · postgres → :5432 · redis → :6379
```

## Deployment (free, GitHub-native)

The app is a full-stack Next.js service, so it cannot run on static hosting (GitHub Pages). Instead, images are published to **GitHub Container Registry** by `.github/workflows/cd.yml` on every push to `master`, and you run them on any host — no CI minutes or hosting fees beyond what you choose.

1. **Push to GitHub.** The `cd.yml` workflow builds and publishes `ghcr.io/<owner>/<repo>/web` and `.../api` (tags: `latest`, `sha-<sha>`). Make your image public under **Package settings** so a VPS can pull without auth.

2. **Deploy on any Docker host** (Fly.io, Koyeb, Hetzner, a $5 VPS, or your own machine):

```bash
git clone https://github.com/<owner>/<repo>.git
cd <repo>

# create deploy/.env (see deploy/.env.example)
IMAGE_PREFIX=ghcr.io/<owner>/<repo>
AUTH_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=<change-me>

./scripts/deploy.sh   # pulls images, applies Prisma migrations, starts all services
```

3. **Put it behind a domain.** Any reverse proxy works — Caddy (`caddy reverse-proxy --to :3000`) gives you free HTTPS automatically.

### Free-host cheat sheet

| Option | Cost | Notes |
|--------|------|-------|
| Any VPS + GHCR | ~$4–6/mo | Full control, run `scripts/deploy.sh` |
| Fly.io | free tier | `fly launch` with Dockerfile; needs a small config tweak for multi-service |
| Koyeb | free tier | Deploy from GHCR image directly |
| GitHub Codespaces | included | Run `docker compose up` in a Codespace for a private dev deployment |

## Roadmap

- [x] Next.js 16 migration + refined dark-pro design system
- [x] Multi-tenant auth (Auth.js v5) + RBAC
- [x] Postgres + Prisma with driver adapter
- [x] Auto-seeded workspaces, dashboard, inventory ledger
- [x] Realtime YOLOv8 detection
- [x] ML forecasting platform (global gradient boosting + walk-forward backtests)
- [x] Billing terminal with ledger write-back + PDF invoices
- [x] Docker Compose + CI + GHCR deployment pipeline
- [ ] Alerts (in-app/email/webhook) & purchase orders
- [ ] Detection-driven cycle counts vs ledger reconciliation

## License

Academic and research purposes.
