# Mandi

A direct farmer-to-buyer produce marketplace. See [PROBLEM.md](./PROBLEM.md) for the
problem statement, sources, and full product/architecture plan.

Built to close a specific gap: existing digital mandis (eNAM, Ninjacart, DeHaat) mostly
serve bulk B2B supply chains or urban consumers and leave small/marginal farmers — 86% of
India's farming population — without price visibility or bargaining power. Mandi gives a
farmer a price board before they sell, direct listings with no commission layer, group
pooling for bulk orders, and a dashboard that shows what they actually earned versus the
mandi average.

## Stack

- **Backend:** Express + TypeScript, PostgreSQL, JWT auth, Socket.IO (live order status)
- **Frontend:** Next.js (App Router, TypeScript), Recharts, English/Hindi label toggle

## Run locally

```bash
cp .env.example .env
docker compose up -d postgres
cd backend && npm install && npm run dev      # http://localhost:4000
cd frontend && npm install && npm run dev     # http://localhost:3000
```

Seed demo accounts and sample listings (run once, after the backend is up):

```bash
cd backend && npm run seed
```

Demo logins (password `password123`):

| Role   | Phone      |
|--------|------------|
| Farmer | 9800000001 |
| Farmer | 9800000002 |
| Buyer  | 9800000003 |

Or run everything in Docker: `docker compose up`.

## Project layout

```
backend/   Express API — auth, listings, mandi-prices, pools, orders, farmer dashboard
frontend/  Next.js app — marketplace, listing management, price board, pools,
           cart/checkout, order tracking, farmer dashboard
```
