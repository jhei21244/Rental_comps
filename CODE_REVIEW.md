# FairRent Code Review

_Reviewed: 2026-04-12_

---

## Summary

**Overall quality: 7/10**

The codebase is well-structured and technically sound — strict TypeScript throughout, correct App Router patterns, a mathematically coherent hedonic model, and a clean, accessible UI. However, the application is materially incomplete: email capture is a UI stub (no API call, data lost on reload), Supabase and Resend are installed dependencies that are never imported, and the "report your outcome" flow described on the homepage does not exist. The code quality is publication-ready; the feature set is not.

---

## Critical Issues (must fix before launch)

### 1. Email capture is a dead end — no data is persisted

**File:** `app/components/PropertyForm.tsx` lines 617–688

The "Notify me" button flips local React state to show a thank-you message but makes no API call. The email address is lost on page reload. There is no `app/api/` directory anywhere in the project.

**Fix required:**
- Create `app/api/subscriptions/route.ts` with a POST handler
- Call it from `PropertyForm.tsx` with `fetch('/api/subscriptions', { method: 'POST', body: ... })`
- Wire Supabase client (dependency installed, never imported — see next item)

---

### 2. Supabase and Resend are installed but completely unused

**File:** `package.json` lines 11, 15

```json
"@supabase/supabase-js": "^2.103.0"
"resend": "^6.10.0"
```

Neither package is imported anywhere in the codebase. No `createClient()` call exists, no email is ever sent. The application has zero persistence or outbound communication.

**Fix required:** Initialise the Supabase client (e.g. `lib/supabase.ts`), create database tables for email subscriptions and lease submissions, and add a Resend call for the "model updated" notification email. Add `.env.local.example` documenting required environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY`).

---

### 3. Suburb validation is missing — arbitrary input silently falls back to Brunswick

**File:** `app/components/PropertyForm.tsx` lines 78–82 / `lib/model.ts` lines 71–72

The form only checks `if (!suburbInput.trim())` before submitting. If a user types a suburb not in the dataset (or makes a typo), the model falls back to `SUBURBS[0]` (Brunswick) without any warning. The user receives a result that is silently computed against the wrong baseline.

```typescript
// lib/model.ts line 71
const suburbData =
  SUBURBS.find((s) => s.name.toLowerCase() === input.suburb.toLowerCase()) ??
  SUBURBS[0]; // silent fallback — no error, no warning
```

**Fix required:** In `PropertyForm.tsx`, validate that the submitted suburb string exists in `SUBURB_NAMES` before calling `calculateRent`. Show a visible error ("We don't have data for that suburb yet") if not found. The autocomplete already surfaces valid options — the submit path should enforce them.

---

### 4. "Report your outcome" flow does not exist

**File:** `app/page.tsx` lines 368–383; `app/suburbs/page.tsx` line 295

The homepage describes a three-step user journey where step 03 is "Report your outcome." Two "Contribute" buttons link to `href="#"`. No form, page, modal, or API route for outcome submission exists. This is the primary data collection mechanism described by the product.

**Fix required:** Build `app/contribute/page.tsx` (or a modal), a corresponding API route, and a Supabase table. Update the `href="#"` placeholders in `page.tsx` and `suburbs/page.tsx`.

---

## Improvements (should fix)

### 5. `getSuburbByName` type signature lies

**File:** `lib/suburbs.ts` lines 361–365

```typescript
export function getSuburbByName(name: string): SuburbData | undefined {
  return SUBURBS.find(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  ) ?? SUBURBS[0]; // never actually returns undefined
```

The `?? SUBURBS[0]` fallback means `undefined` is never returned, yet the return type says it can be. The function is currently unused so this is low risk, but callers will write unnecessary null-checks or miss genuine errors.

**Fix:** Either return `SuburbData` (remove `| undefined`, keep fallback) or return `undefined` genuinely (remove the fallback).

---

### 6. Suburb autocomplete does not prevent manual submission of invalid values

**File:** `app/components/PropertyForm.tsx` lines 43–82

The dropdown works correctly (case-insensitive filter, max 8 results, closes on outside click, `onMouseDown` prevents blur race). However, a user who types a partial suburb name and submits without selecting from the dropdown bypasses validation entirely. The autocomplete interaction and the submit validation are decoupled.

**Fix:** After issue #3 is resolved, consider also disabling the submit button until `suburbInput` matches a value in `SUBURB_NAMES`.

---

### 7. `scrollIntoView` called inside a fragile `setTimeout`

**File:** `app/components/PropertyForm.tsx` line 105

```typescript
setTimeout(() => resultRef.current?.scrollIntoView({
  behavior: 'smooth',
  block: 'nearest'
}), 100);
```

The 100 ms delay is a guess at DOM update timing. It will break on slow devices and is unnecessary with React's batching model.

**Fix:** Move the scroll into a `useEffect` with `[formState]` as a dependency:

```typescript
useEffect(() => {
  if (formState.status === 'success') {
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}, [formState]);
```

---

### 8. Methodology page overpromises on suburb-specific weights

**File:** `app/data/page.tsx` lines 211–213

> "Individual suburb models may differ — a garage in Docklands contributes more than one in Preston. As we collect more data, we'll publish suburb-specific weights."

In reality, `ATTRIBUTE_WEIGHTS` in `lib/model.ts` lines 3–22 is a single global object applied identically to all suburbs. There is no suburb-specific weighting anywhere.

This is a product decision, not a code bug, but the copy creates an expectation that the data page doesn't fulfil. Either qualify the claim more carefully or note it as a known roadmap item.

---

### 9. No email format validation before submission

**File:** `app/components/PropertyForm.tsx` line 637

The email `<input>` has `type="email"` which provides browser-level validation but no explicit pattern check or server-side validation. When the API route is added, validate the email format server-side before inserting into Supabase.

---

## Nice to haves

### 10. `next.config.ts` is empty

No image optimisation, no custom headers, no bundle analysis. Once the app has real traffic, consider:
- Adding `Content-Security-Policy` header
- Enabling `compress: true` (already default, but worth confirming)
- Adding `@next/bundle-analyzer` for ongoing size monitoring

### 11. Mouse event handlers in autocomplete dropdown recreated on every render

**File:** `app/components/PropertyForm.tsx` lines 181, 192–193

The `onMouseDown` and `onClick` handlers inside the suggestions list are recreated on every render. At eight suggestions this is negligible, but wrapping them in `useCallback` is a good habit.

### 12. `app/api/` will need CSRF protection

Not an issue now (no API routes exist), but when POST routes are added for subscriptions and submissions, implement CSRF tokens or verify `Origin` headers. Next.js App Router does not add CSRF protection automatically.

### 13. Add `.env.local.example`

Document all required environment variables so contributors can set up the project without reading the source.

---

## Missing vs spec

| Feature | Status |
|---|---|
| Hedonic rent calculator (client-side) | Complete |
| Suburb autocomplete | Complete |
| Result breakdown display | Complete |
| Suburb data page | Complete |
| Methodology / data page | Complete |
| Email capture UI | UI only — no persistence |
| Supabase email subscription storage | Not started |
| Resend "model updated" email | Not started |
| API route for submissions | Not started |
| "Report your outcome" submission flow | Not started |
| Suburb-specific attribute weights | Not started (claimed in copy) |
| Contribute buttons (non-placeholder) | Not started |

---

## Positive observations

- **TypeScript is done right.** `strict: true`, no `any`, discriminated union for `FormState`, explicit return types on all functions. The hedonic model types (`PropertyInput`, `ModelResult`) are clean and complete.

- **Server / Client component split is correct.** Only `PropertyForm.tsx` is marked `'use client'`. All page-level components are server components, including the suburb and methodology pages. No unnecessary client-side boundaries.

- **`useMemo` on suburb suggestions is exactly right** (`PropertyForm.tsx` lines 56–62). Recomputes only when `suburbInput` changes; the rest of the form state doesn't trigger it.

- **The hedonic model weights are internally coherent.** The attribute weight hierarchy (garage > undercover > street for parking; <5 min > 5–10 min > 10–15 min for transit) mirrors real Melbourne renter priorities. Bedroom and bathroom adjustments are reasonable relative to a 2BR baseline. The breakdown return type exposes every component of the calculation, which is good for transparency.

- **Suburb dataset is complete and consistent.** All 28 entries pass a basic integrity check: `p10 < twoBedroomMedian < p90`, trend direction matches `qoqTrend` sign, pressure levels are internally consistent, and `n` values are plausible for an inner Melbourne suburb dataset.

- **CSS variables are fully utilised.** All 16 variables defined in `:root` in `globals.css` are actually referenced. No orphaned variables, no magic hex values scattered through inline styles.

- **Font loading is optimised.** `next/font/google` loads only the three required weights (300, 400, 700) rather than the full family.
