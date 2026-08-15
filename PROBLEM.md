# Mandi — Problem & Plan

## 1. The problem we're solving

**Who:** Small and marginal farmers in India (~86% of all farmers) who sell perishable
produce (vegetables, fruit, grain) through the traditional mandi system and its layers
of commission agents.

**What's broken, with evidence:**

- **Price discovery is broken.** A farmer usually only learns the day's price when they
  physically arrive at the mandi with their harvest already cut. There is no easy way to
  check today's rate across nearby mandis beforehand, so they have no leverage to hold out
  or choose where to sell.
- **Middlemen capture a disproportionate share.** Commission agents (arhtiyas) and layers
  of traders take an estimated ~29.5% of the price spread on vegetables and up to ~46.5%
  on fruit. A farmer selling tomatoes at ₹5/kg regularly watches the same tomatoes retail
  at ₹25–30/kg — a gap that is mostly intermediation, not value added.
  ([bookmycrop.com](https://www.bookmycrop.com/blog-details/what-are-the-problems-faced-by-agri-markets-in-india))
- **Perishability forces distress sales.** Without cold storage or a buyer lined up in
  advance, farmers "crash sell" at whatever price is offered rather than risk the produce
  rotting. ([thedeepsoil.com](https://thedeepsoil.com/direct-farm-trade-fair-prices-farmers-india/))
- **Small farmers have no bargaining power alone.** A single farmer with 200kg of onions
  can't meet a wholesale buyer's minimum order or negotiate as an equal; they need to be
  able to pool supply with neighbors to matter to a bulk buyer.
- **Existing digital solutions leave this exact group behind.** eNAM (the government's
  unified national market, covering 1,000+ mandis) has struggled with adoption because it
  still assumes a trip to a physical mandi and doesn't reach small/marginal farmers well.
  Private platforms like Ninjacart and DeHaat optimize for large-volume B2B supply chains
  (retail chains, processors), and most agri e-commerce apps target urban/peri-urban
  consumers — none of them are built around a smallholder listing 80kg of okra directly.
  Low digital literacy and patchy connectivity compound this: apps that assume a literate,
  fluent smartphone user exclude the farmers who need the tool most.
  ([agrobotany.in / krishibazaar.in survey](https://krishibazaar.in/blog/how-to-sell-farm-produce-online-in-india-best-platforms-strategies))

**Sources consulted:**
- [Challenges in Agricultural Marketing — Agriculture.Institute](https://agriculture.institute/agripreneurship/challenges-agricultural-marketing-issues-solutions/)
- [What are the problems faced by Agri Markets in India? — BookMyCrop](https://www.bookmycrop.com/blog-details/what-are-the-problems-faced-by-agri-markets-in-india)
- [How Direct Farm Trade Helps Indian Farmers Get Fair Prices — The Deep Soil](https://thedeepsoil.com/direct-farm-trade-fair-prices-farmers-india/)
- [How Mandi Startups Are Transforming India's Agricultural Market — Kisan Sabha](https://blog.kisansabha.in/index.php/2025/03/01/how-mandi-startups-are-transforming-indias-agricultural-market/)
- [How to Sell Farm Produce Online in India — KrishiBazaar](https://krishibazaar.in/blog/how-to-sell-farm-produce-online-in-india-best-platforms-strategies)

## 2. What "Mandi" does about it

A direct farmer↔buyer marketplace, structured like a shopping app (listings, cart,
checkout, order tracking), but shaped around the specific gaps above rather than a
generic storefront:

| Gap | Feature |
|---|---|
| No price visibility before selling | **Mandi Price Board** — daily min/max/modal price per crop per mandi, seeded in the same shape as the government's Agmarknet dataset (`data.gov.in`), so a real feed can be swapped in later. Farmers see this *before* they price a listing. |
| Middlemen take 30–46% | **Direct listings** — farmer posts crop, quantity, asking price, quality grade and photos; buyers order directly. No commission layer between the two prices shown. |
| Forced distress/crash sales | **Order tracking with pickup scheduling** — a buyer commits before harvest is cut where possible; status pipeline (`pending → confirmed → picked_up → delivered → paid_out`) replaces "sell to whoever shows up." |
| No bargaining power alone | **Pool groups** — several farmers selling the same crop in the same mandi zone can combine listings into one pooled lot that meets a bulk buyer's minimum order, splitting the payout by contributed quantity. |
| Digital divide / low literacy | Large tap targets, minimal required text entry (numeric steppers instead of typing where possible), and a lightweight English/Hindi label toggle rather than assuming English fluency. |
| No proof it's actually better than the mandi | **Farmer dashboard** shows what was earned per listing next to that day's mandi modal price for the same crop, so the farmer can see the gap directly. |

## 3. Architecture

Consistent with the existing `Restaurant/` project in this repo: Next.js (App Router,
TypeScript) frontend, Express + TypeScript backend, PostgreSQL, JWT auth, Socket.IO for
live order-status and price updates.

```
Mandi/
├── backend/            Express API (auth, listings, mandi-prices, pools, orders)
│   └── src/db/init.sql schema + seed data
├── frontend/            Next.js app (marketplace, listing management, price board,
│                        pools, cart/checkout, order tracking, farmer dashboard)
└── docker-compose.yml   postgres + backend + frontend
```

**Roles:** `farmer` (lists produce, joins pools, views dashboard) and `buyer` (browses,
orders, tracks delivery). One `users` table with a `role` enum, same as Restaurant.

**Data model:** `users`, `listings`, `mandi_prices`, `pool_groups`, `pool_contributions`,
`orders`, `order_events`.

**Out of scope for this pass** (documented as roadmap, not built): real payment gateway
(orders track a `payment_status` field instead of moving real money), live Agmarknet API
polling (seeded data ships in the same shape so it's a drop-in swap), voice input for
listing creation, SMS fallback for feature-phone users.
