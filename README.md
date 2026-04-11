# FairRent

Hedonic rent pricing for Melbourne renters. Tells you whether your specific property is fairly priced — not just what the suburb median is.

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
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key
- `RESEND_API_KEY` — your Resend API key (for renewal follow-up emails)

### 3. Set up the database

In your Supabase project, run `supabase/schema.sql` in the SQL editor. This creates:
- `submissions` — rent submissions with property attributes
- `outcomes` — follow-up data on renewals and negotiations

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

| Route | Description |
|---|---|
| `/` | Homepage with property form and result |
| `/suburbs` | Full suburb data table |
| `/data` | Methodology explanation |

## Architecture

- **`lib/suburbs.ts`** — Suburb data (medians, pressure levels, trends)
- **`lib/model.ts`** — Hedonic pricing model (`calculateRent`)
- **`app/components/PropertyForm.tsx`** — Client component: form, autocomplete, result display
- **`supabase/schema.sql`** — Database schema

## Model

The hedonic model estimates expected rent by combining:
1. Suburb baseline (2BR apartment median)
2. Bedroom/bathroom/type adjustments
3. Attribute premiums: parking, AC, transit proximity, floor level, condition, pets, outdoor space

See `/data` (methodology page) for the full attribute weight table.

## Build

```bash
npm run build
npm start
```
