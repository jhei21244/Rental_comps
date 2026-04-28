import type { NextRequest } from 'next/server';
import { SUBURB_NAMES } from './suburbs';

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const originHost = new URL(origin).host;
    const expected = process.env.NEXT_PUBLIC_SITE_URL;
    if (expected) return originHost === new URL(expected).host;
    return originHost === new URL(request.url).host;
  } catch {
    return false;
  }
}

const PROPERTY_TYPES = ['Apartment', 'House', 'Townhouse'] as const;
const BEDROOMS = ['Studio', '1', '2', '3', '4+'] as const;
const BATHROOMS = ['1', '2', '3+'] as const;
const PARKING = ['None', 'Street', 'Undercover', 'Lock-up garage'] as const;
const AIR_CON = ['None', 'One room', 'Whole property'] as const;
const TRANSPORT = ['Under 5 min', '5–10 min', '10–15 min', 'Over 15 min'] as const;
const OUTDOOR = ['None', 'Balcony', 'Courtyard or garden'] as const;
const FURNISHED = ['Unfurnished', 'Furnished'] as const;
const CONDITION = [
  'New build',
  'Recently renovated',
  'Well maintained',
  'A bit dated',
  'Needs work',
] as const;

export interface ValidatedSubmission {
  suburb: string;
  propertyType: (typeof PROPERTY_TYPES)[number];
  bedrooms: (typeof BEDROOMS)[number];
  bathrooms: (typeof BATHROOMS)[number];
  rentPw: number;
  parking: (typeof PARKING)[number];
  airCon: (typeof AIR_CON)[number];
  transportWalk: (typeof TRANSPORT)[number];
  outdoorSpace: (typeof OUTDOOR)[number];
  internalLaundry: boolean;
  furnished: (typeof FURNISHED)[number];
  condition: (typeof CONDITION)[number];
}

export type ValidationResult =
  | { ok: true; value: ValidatedSubmission }
  | { ok: false; error: string };

function inEnum<T extends readonly string[]>(
  values: T,
  raw: unknown
): raw is T[number] {
  return typeof raw === 'string' && (values as readonly string[]).includes(raw);
}

export function validateSubmission(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Invalid payload' };
  }
  const i = input as Record<string, unknown>;

  if (typeof i.suburb !== 'string') return { ok: false, error: 'Invalid suburb' };
  const suburb = SUBURB_NAMES.find(
    (n) => n.toLowerCase() === (i.suburb as string).toLowerCase()
  );
  if (!suburb) return { ok: false, error: 'Unknown suburb' };

  const rentPw = Number(i.rentPw);
  if (!Number.isFinite(rentPw) || rentPw < 80 || rentPw > 5000) {
    return { ok: false, error: 'Rent must be between 80 and 5000' };
  }

  if (!inEnum(PROPERTY_TYPES, i.propertyType)) return { ok: false, error: 'Invalid propertyType' };
  if (!inEnum(BEDROOMS, i.bedrooms)) return { ok: false, error: 'Invalid bedrooms' };
  if (!inEnum(BATHROOMS, i.bathrooms)) return { ok: false, error: 'Invalid bathrooms' };
  if (!inEnum(PARKING, i.parking)) return { ok: false, error: 'Invalid parking' };
  if (!inEnum(AIR_CON, i.airCon)) return { ok: false, error: 'Invalid airCon' };
  if (!inEnum(TRANSPORT, i.transportWalk)) return { ok: false, error: 'Invalid transportWalk' };
  if (!inEnum(OUTDOOR, i.outdoorSpace)) return { ok: false, error: 'Invalid outdoorSpace' };
  if (!inEnum(FURNISHED, i.furnished)) return { ok: false, error: 'Invalid furnished' };
  if (!inEnum(CONDITION, i.condition)) return { ok: false, error: 'Invalid condition' };
  if (typeof i.internalLaundry !== 'boolean') {
    return { ok: false, error: 'Invalid internalLaundry' };
  }

  return {
    ok: true,
    value: {
      suburb,
      propertyType: i.propertyType,
      bedrooms: i.bedrooms,
      bathrooms: i.bathrooms,
      rentPw: Math.round(rentPw),
      parking: i.parking,
      airCon: i.airCon,
      transportWalk: i.transportWalk,
      outdoorSpace: i.outdoorSpace,
      internalLaundry: i.internalLaundry,
      furnished: i.furnished,
      condition: i.condition,
    },
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email);
}
