# FairRent Data Pipeline

Scripts for collecting real Melbourne rental listing data and calibrating the
hedonic pricing model in `lib/suburbs.ts` and `lib/model.ts`.

---

## Prerequisites

Python 3.11+, then:

```bash
pip install -r scripts/requirements.txt
```

---

## Option A — Domain Developer API (recommended)

### Getting an API key

1. Sign up at **https://developer.domain.com.au/** — free tier, no credit card required
2. Create a new project → choose **Listings** scope
3. Note your **Client ID** and **Client Secret**

### Setting credentials

```bash
export DOMAIN_CLIENT_ID=your_client_id
export DOMAIN_CLIENT_SECRET=your_client_secret
```

Or create a `.env` file in the project root (it's gitignored):

```
DOMAIN_CLIENT_ID=your_client_id
DOMAIN_CLIENT_SECRET=your_client_secret
```

---

## Option B — Web scraper (no credentials needed)

If you skip the env vars the pipeline automatically falls back to scraping
Domain's public search pages. A 2.5-second delay between requests is enforced
to avoid overloading the server.

---

## Running the pipeline

Run each script in order from the project root:

### Step 1 — Collect listings

```bash
python scripts/fetch_domain_listings.py
```

Options:
```
--suburbs brunswick fitzroy northcote collingwood richmond st-kilda prahran carlton
--bedrooms 2          # bedroom count to filter by (default: 2)
--pages 5             # max pages per suburb, 50 results/page (default: 5)
```

Output: `data/domain_listings_raw.json`

Tip: Collect at least 50 listings per suburb for reliable baselines.
The default settings target 250 listings per suburb (5 pages × 50 results).

---

### Step 2 — Parse and normalise

```bash
python scripts/parse_listings.py
```

Normalises raw data to a clean schema and prints a per-suburb summary.
Output: `data/listings_clean.json`

---

### Step 3 — Derive suburb baselines

```bash
python scripts/derive_baselines.py
```

Computes median, P10, and P90 rent for each suburb × property type × bedrooms
combination. Prints a markdown table.
Output: `data/suburb_baselines.json`

---

### Step 4 — Derive attribute weights (OLS regression)

```bash
python scripts/derive_weights.py
```

Runs a hedonic OLS regression with suburb fixed effects and outputs estimated
$/week premiums for each property attribute. Prints a comparison against the
current hardcoded weights in `lib/model.ts`.
Outputs: `data/attribute_weights.json`, `data/regression_summary.txt`

---

### Step 5 — Generate updated TypeScript

```bash
python scripts/update_app_data.py
```

Generates updated TypeScript for the app's data files. Review before applying.
Outputs: `data/updated_suburbs.ts`, `data/updated_model.ts`

To apply:
```bash
cp data/updated_suburbs.ts lib/suburbs.ts
cp data/updated_model.ts lib/model.ts
```

---

## What is and isn't auto-derived

| Field | Derived from data? | Notes |
|---|---|---|
| `median2br` | Yes | 2BR apartment median from real listings |
| `p10` / `p90` | Yes | 10th/90th percentile rents |
| `n` | Yes | Listing count at time of collection |
| Attribute weights | Yes | OLS regression coefficients |
| `negoPercent` | No | Requires negotiation outcome data |
| `negoAmtPw` | Estimated | 4% of median as placeholder |
| `qoqTrend` | No | Requires historical data (two snapshots) |
| `pressureLevel` | Estimated | Derived from spread/price heuristic |

---

## Updating the data

Re-run the full pipeline periodically (monthly recommended) to keep baselines
current. The `data/` directory is gitignored — commit only the scripts.

To track trends over time, save dated snapshots:
```bash
cp data/listings_clean.json data/listings_clean_$(date +%Y%m).json
```

---

## Target suburbs

| Key | Suburb | Postcode |
|---|---|---|
| `brunswick` | Brunswick | 3056 |
| `fitzroy` | Fitzroy | 3065 |
| `northcote` | Northcote | 3070 |
| `collingwood` | Collingwood | 3066 |
| `richmond` | Richmond | 3121 |
| `st-kilda` | St Kilda | 3182 |
| `prahran` | Prahran | 3181 |
| `carlton` | Carlton | 3053 |
