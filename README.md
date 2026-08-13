# Mandi

A direct farmer-to-buyer produce marketplace. See [PROBLEM.md](./PROBLEM.md) for the
problem statement, sources, and full product/architecture plan.

Built to close a specific gap: existing digital mandis (eNAM, Ninjacart, DeHaat) mostly
serve bulk B2B supply chains or urban consumers and leave small/marginal farmers — 86% of
India's farming population — without price visibility or bargaining power. Mandi gives a
farmer a price board before they sell, direct listings with no commission layer, group
pooling for bulk orders, and a dashboard that shows what they actually earned versus the
mandi average.

## Screenshots

| | |
|---|---|
| ![Landing page](./docs/screenshots/home.jpg) | ![Marketplace](./docs/screenshots/marketplace.jpg) |
| Landing page — multi-language slogan strip and a live mandi price ticker | Marketplace — direct listings with photos, no commission layer |
| ![Mandi price board](./docs/screenshots/mandi-prices.jpg) | ![Farmer dashboard](./docs/screenshots/dashboard.jpg) |
| Mandi price board — min/max/modal price per crop, per mandi | Farmer dashboard — your price vs. that day's mandi average |

## Features

Beyond the core listing/order flow, these address specific gaps from the problem
statement:

**Trust, since there's no commission agent to vouch for anyone anymore**
- **Ratings** — buyers rate farmers 1–5 stars after delivery; the average shows on every
  listing.
- **Verified Farmer badge** — computed automatically from delivery history (3+ completed
  orders), not self-declared, so it can't be gamed by a new account.
- **Farmer public profiles** — a buyer can click through from any listing to a farmer's
  full track record: rating, completed orders, every review left, and everything else
  they currently have for sale.

**Staying informed without checking the app all day**
- **In-app notifications** — a farmer gets pinged the moment a buyer orders, when a pool
  they've joined fills, or when a review comes in; a buyer gets pinged as their order
  moves through pickup and delivery. Pushed live over the existing Socket.IO connection.
- **Price watchlist & alerts** — watch a crop from the price board and get notified when
  its mandi price moves sharply (≥8% day-over-day), instead of re-checking every morning.
- **Price trend chart** — the last 14 days for a crop, not just today's snapshot, so a
  price spike or crash is visible before it's reflected in a single day's number.

**Finding and buying the right thing**
- **Location filters** — state/district dropdowns on the marketplace and price board,
  populated from real listing data rather than a hardcoded list.
- **Wishlist** — save a listing to buy later instead of losing it once you've navigated
  away.
- **Buy again** — reorder from a past delivered order in one click; checks the listing is
  still active and has stock before adding it to cart, rather than assuming it does.
- **Order status filters** — split an order history into in-progress / completed /
  cancelled once it's long enough that scrolling through everything stops being useful.

**Farmer tools**
- **Real harvest photos** — farmers can attach an actual photo of their produce (resized
  and compressed client-side, no object storage needed) instead of relying only on the
  representative stock photo.
- **Earnings export** — a farmer's sale history exports to CSV for their own records.

## Stack

- **Backend:** Express + TypeScript, PostgreSQL, JWT auth, Socket.IO (live order status)
- **Frontend:** Next.js (App Router, TypeScript), Recharts, English/Hindi label toggle,
  curated crop photography

## Run locally

```bash
cp .env.example .env
docker compose up -d postgres
cd backend && npm install && npm run dev      # http://localhost:4000
cd frontend && npm install && npm run dev     # http://localhost:3000
```

A fresh database gets the full schema from `backend/src/db/init.sql` automatically. If
you're upgrading an existing database, apply any migrations added since (`backend/src/db/migrations/`)
once:

```bash
cd backend && npm run migrate
```

Seed demo accounts and sample listings (run once, after the backend is up):

```bash
cd backend && npm run seed
```

Load a fuller mandi price board — 18 crops × 17 mandis across India, three weeks of
daily history:

```bash
cd backend && npm run fetch-prices
```

With `AGMARKNET_API_KEY` set in `.env` (get one at
[data.gov.in/user/register](https://data.gov.in/user/register)), this pulls live prices
from the government's actual Agmarknet feed. Without a key it falls back to a
realistically-shaped synthetic dataset — same schema either way, so the rest of the app
doesn't care which source populated it.

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
