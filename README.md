# FairRent AU

> **Is your rent actually fair?** Not "is it near the suburb median" — but fair for *your specific property*, with its parking, outdoor space, condition, transit access, and everything else that actually affects what it's worth.

## The Problem

Melbourne renters are flying blind. The tools that exist — Domain, REA, suburb median tables — tell you what a 2-bedroom in Fitzroy costs on average. They tell you nothing about whether *your* apartment, with its undercover parking, recently renovated kitchen, and 4-minute walk to the train, is priced fairly relative to comparable properties.

Landlords and agents know this. Renters don't. The information asymmetry is real, and it costs people money every time they sign a lease or roll over to a renewal without pushing back.

FairRent fixes this.

## What It Does

Enter your property's attributes — suburb, type, bedrooms, bathrooms, parking, air conditioning, transit proximity, outdoor space, condition, laundry, furnished status — and FairRent tells you:

- **Your expected market rent** — what the model says a property like yours should cost
- **Your actual rent** — what you're paying (or being asked to pay)
- **The gap** — are you overpaying? By how much? Or are you actually getting a deal?
- **An itemised breakdown** — exactly which attributes are contributing to the price, and how much

It's a hedonic pricing model: the same methodology used by academic economists, valuation firms, and property researchers. We've calibrated it on real Domain.com.au listing data from April 2026 — 486 listings across 24 Melbourne inner suburbs.

## The Model

FairRent uses a **hedonic regression** approach. The core idea: a property's rent is the sum of its attributes. Each attribute has a measurable dollar value — parking adds ~$40–52/wk, a courtyard adds ~$55/wk, being in poor condition subtracts ~$40/wk.

**Attribute weights ($/week, derived from real data):**

| Attribute | Value |
|---|---|
| Lock-up garage | +$52 |
| Furnished | +$80 |
| Courtyard / garden | +$55 |
| New build | +$60 |
| Recently renovated | +$47 |
| Undercover parking | +$40 |
| Balcony | +$40 |
| Walk to transit <5 min | +$35 |
| Internal laundry | +$20 |
| Walk to transit 5–10 min | +$20 |
| Air con (whole property) | +$16 |
| Walk to transit 10–15 min | +$8 |
| Dated condition | −$25 |
| Needs work | −$40 |

**Suburb baselines** are 2BR apartment medians from real Domain listing data. Bedrooms, bathrooms, and property type are adjusted from there.

## Coverage

24 Melbourne inner suburbs — 486 listings, April 2026:

Brunswick, Fitzroy, Northcote, Richmond, St Kilda, Coburg, Prahran, Collingwood, Carlton, South Yarra, Footscray, Preston, Docklands, South Melbourne, Port Melbourne, Brunswick East, Thornbury, Moonee Ponds, Camberwell, Hawthorn, Abbotsford, Windsor, Elsternwick, Kensington

## Data Pipeline

Data is sourced from Domain.com.au asking prices. Because the VPS IP is blocked by Domain, we use two collection methods:

1. **Cloudflare Worker** (`cf-worker/`) — extracts `__NEXT_DATA__` JSON from Domain search pages via Cloudflare's edge network, bypassing VPS blocks
2. **Manual browser collection** — Playwright-assisted scraping via host browser for individual listing attribute detail

Scripts in `scripts/` handle:
- `fetch_domain_listings.py` — card-level data (rent, beds, baths, parking count)
- `collect_listings_v2.py` — detailed attribute collection per listing
- `derive_baselines.py` — computes P10/median/P90 per suburb
- `derive_weights.py` — OLS regression to derive attribute weights
- `update_app_data.py` — generates updated TypeScript data files

## Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, App Router
- **Data:** Domain.com.au + Cloudflare Worker scraper
- **Backend:** Supabase (submissions + outcome tracking)
- **Scraping:** Cloudflare Browser Rendering + Playwright

## Project Status

| Component | Status |
|---|---|
| Hedonic model | ✅ Done — real weights, n=486 |
| Suburb data (24 suburbs) | ✅ Done |
| Property form + result UI | ✅ Done |
| Suburb data table | ✅ Done |
| Methodology page | ✅ Done |
| Cloudflare Worker scraper | ✅ Built |
| Supabase backend | 🔄 Schema written, not wired up |
| Domain OAuth API access | 🔄 OAuth client not yet created |
| Vercel deployment | ❌ Not yet deployed |
| OLS regression refresh | ❌ Needs more attribute-level data |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY` (for renewal follow-up emails)

### 3. Set up the database

Run `supabase/schema.sql` in your Supabase project SQL editor.

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Pages

| Route | Description |
|---|---|
| `/` | Home — property form + result |
| `/suburbs` | Suburb data table with pressure levels |
| `/data` | Methodology + attribute weight table |

## Design

Cream (`#FAF7F2`), terracotta (`#C4603A`), bark (`#2C1A0E`). Playfair Display headlines, system sans body. Clean, warm — the anti-REA.

## Why This Matters

In a tight rental market, renters almost never push back on rent. The main reason: they don't know if they have grounds to. FairRent gives them the evidence. A renter who can walk into a negotiation knowing their place should be $680/wk, not $750/wk, and explain *why* — that's a different conversation.

Longer term: aggregate enough submissions and FairRent becomes a real-time market intelligence layer that no listing platform currently offers.
