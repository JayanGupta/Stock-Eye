<div align="center">

# Stock-Eye — Warehouse Intelligence Platform

Intelligent warehouse inventory with AI demand forecasting, computer-vision counting, and integrated billing.

</div>

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts |
| Backend (web) | Next.js Server Actions + Server Components, Auth.js (NextAuth v5) |
| ML Service | FastAPI + YOLOv8 + statsmodels (Phase 2/4 — realtime detection & ML forecasting) |
| Database | PostgreSQL 16 via Prisma (multi-tenant, driver-adapter) |
| Infra | pnpm workspace, Docker Compose, GitHub Actions |

## Project structure

```
Stock-Eye/
├── web/                      # Next.js application (all product code)
│   ├── prisma/
│   │   ├── schema.prisma     # Multi-tenant data model
│   │   └── seed.ts           # Demo workspace seeder
│   └── src/
│       ├── app/              # App Router: (auth), (app) route groups
│       ├── components/       # UI components (shadcn + feature components)
│       ├── lib/              # db, auth-utils, actions, queries, seed
│       └── generated/        # Prisma client (generated)
├── src/backend/              # FastAPI ML service (Phase 4 integration)
├── Dockerfile.web            # Next.js standalone image
├── Dockerfile.api            # FastAPI image
├── docker-compose.yml        # web + api + postgres + redis
└── pnpm-workspace.yaml
```

## Quickstart

**Prerequisites:** Node 22, pnpm, PostgreSQL 16

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp web/.env.example web/.env
# set DATABASE_URL to your Postgres connection string

# 3. Create schema + demo data
pnpm db:migrate     # runs prisma migrate dev
pnpm db:seed        # creates demo@stockeye.dev / demo1234

# 4. Run the app
pnpm dev            # → http://localhost:3000
```

**Demo login:** `demo@stockeye.dev` / `demo1234`

New workspaces created via `/register` are auto-seeded with a 60-item catalog and 12 months of sales history.

## Docker

```bash
cp .env.example .env   # set AUTH_SECRET
docker compose up --build
# web → :3000 · api → :8000 · postgres → :5432 · redis → :6379
```

## Features

- **Multi-tenant auth & RBAC** — org-scoped data, OWNER/ADMIN/MANAGER/VIEWER roles, Auth.js credentials with bcrypt
- **Dashboard** — real-time KPIs, revenue trends, category mix, top sellers, low-stock & expiry alerts
- **Inventory ledger** — full CRUD, immutable stock transactions (restock/sale/waste/adjust), reorder points
- **Detection** *(roadmap)* — computer-vision cycle counting & discrepancy reconciliation
- **Forecasting** *(roadmap)* — ML demand forecasting with backtested accuracy and confidence intervals
- **Billing** *(roadmap)* — POS flow, PDF invoices, returns

## Roadmap

- [x] Next.js 16 migration + refined dark-pro design system
- [x] Multi-tenant auth (Auth.js v5) + RBAC
- [x] Postgres + Prisma with driver adapter
- [x] Auto-seeded workspaces, dashboard, inventory ledger
- [x] Docker Compose + CI
- [x] YOLOv8 detection — image upload, annotated result, detection history
- [x] ML forecasting platform — gradient boosting, walk-forward backtest, risk table
- [x] Billing terminal — POS flow, PDF invoice, ledger write-back
- [ ] Alerts (in-app/email/webhook) & purchase orders

## License

Academic and research purposes.
