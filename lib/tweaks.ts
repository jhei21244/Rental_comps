import { calculateRent, type PropertyInput } from './model';

export interface TweakOption {
  key: keyof PropertyInput;
  label: string;
  fromValue: string;
  toValue: string;
  delta: number; // $/wk vs current configuration
}

const ENUM_ATTRIBUTES: ReadonlyArray<{
  key: keyof PropertyInput;
  label: string;
  values: readonly string[];
}> = [
  { key: 'propertyType', label: 'Type', values: ['Apartment', 'House', 'Townhouse'] },
  { key: 'bedrooms', label: 'Bedrooms', values: ['Studio', '1', '2', '3', '4+'] },
  { key: 'bathrooms', label: 'Bathrooms', values: ['1', '2', '3+'] },
  { key: 'parking', label: 'Parking', values: ['None', 'Street', 'Undercover', 'Lock-up garage'] },
  { key: 'airCon', label: 'Aircon', values: ['None', 'One room', 'Whole property'] },
  {
    key: 'transportWalk',
    label: 'Transit walk',
    values: ['Under 5 min', '5–10 min', '10–15 min', 'Over 15 min'],
  },
  {
    key: 'outdoorSpace',
    label: 'Outdoor',
    values: ['None', 'Balcony', 'Courtyard or garden'],
  },
  {
    key: 'condition',
    label: 'Condition',
    values: [
      'New build',
      'Recently renovated',
      'Well maintained',
      'A bit dated',
      'Needs work',
    ],
  },
  { key: 'furnished', label: 'Furnished', values: ['Unfurnished', 'Furnished'] },
];

/**
 * Returns the top-`limit` single-attribute changes (vs `current`), ranked by
 * absolute $/wk impact on expected rent. Suburb is intentionally excluded —
 * it's already explored by SuburbCompare. `rentPw` is fixed (it's the user's
 * actual rent, not a configurable attribute).
 */
export function computeTweaks(current: PropertyInput, limit = 6): TweakOption[] {
  const base = calculateRent(current).expectedRent;
  const all: TweakOption[] = [];

  for (const attr of ENUM_ATTRIBUTES) {
    const currentVal = current[attr.key] as string;
    for (const v of attr.values) {
      if (v === currentVal) continue;
      const next = { ...current, [attr.key]: v };
      const delta = calculateRent(next).expectedRent - base;
      if (delta === 0) continue;
      all.push({
        key: attr.key,
        label: attr.label,
        fromValue: currentVal,
        toValue: v,
        delta,
      });
    }
  }

  // Internal laundry — boolean
  const laundryNext = { ...current, internalLaundry: !current.internalLaundry };
  const laundryDelta = calculateRent(laundryNext).expectedRent - base;
  if (laundryDelta !== 0) {
    all.push({
      key: 'internalLaundry',
      label: 'Internal laundry',
      fromValue: current.internalLaundry ? 'Yes' : 'No',
      toValue: current.internalLaundry ? 'No' : 'Yes',
      delta: laundryDelta,
    });
  }

  return all
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, limit);
}

export function applyTweak(current: PropertyInput, tweak: TweakOption): PropertyInput {
  if (tweak.key === 'internalLaundry') {
    return { ...current, internalLaundry: tweak.toValue === 'Yes' };
  }
  return { ...current, [tweak.key]: tweak.toValue };
}
