import { describe, expect, it } from 'vitest';
import {
  isSameOrigin,
  isValidEmail,
  validateSubmission,
  validateOutcome,
} from './api';

const validSubmission = {
  suburb: 'Brunswick',
  propertyType: 'Apartment',
  bedrooms: '2',
  bathrooms: '1',
  rentPw: 700,
  parking: 'None',
  airCon: 'None',
  transportWalk: 'Under 5 min',
  outdoorSpace: 'None',
  internalLaundry: false,
  furnished: 'Unfurnished',
  condition: 'Well maintained',
};

describe('validateSubmission', () => {
  it('accepts a valid submission and returns the canonical suburb name', () => {
    const r = validateSubmission({ ...validSubmission, suburb: 'brunswick' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.suburb).toBe('Brunswick');
  });

  it('rejects non-object payloads', () => {
    expect(validateSubmission(null).ok).toBe(false);
    expect(validateSubmission('string').ok).toBe(false);
    expect(validateSubmission(42).ok).toBe(false);
    expect(validateSubmission(undefined).ok).toBe(false);
  });

  it('rejects an unknown suburb', () => {
    const r = validateSubmission({ ...validSubmission, suburb: 'Atlantis' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('Unknown suburb');
  });

  it('rejects rent below 80', () => {
    const r = validateSubmission({ ...validSubmission, rentPw: 50 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Rent/);
  });

  it('rejects rent above 5000', () => {
    const r = validateSubmission({ ...validSubmission, rentPw: 7000 });
    expect(r.ok).toBe(false);
  });

  it('rejects non-numeric rent', () => {
    const r = validateSubmission({ ...validSubmission, rentPw: 'a lot' });
    expect(r.ok).toBe(false);
  });

  it('rounds fractional rent to integer', () => {
    const r = validateSubmission({ ...validSubmission, rentPw: 612.7 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.rentPw).toBe(613);
  });

  it('rejects each invalid enum field', () => {
    const cases: Array<[string, unknown]> = [
      ['propertyType', 'Mansion'],
      ['bedrooms', '7'],
      ['bathrooms', '0'],
      ['parking', 'Helipad'],
      ['airCon', 'Igloo'],
      ['transportWalk', 'Within walking distance'],
      ['outdoorSpace', 'Rooftop pool'],
      ['furnished', 'Maybe'],
      ['condition', 'Cursed'],
    ];
    for (const [field, badValue] of cases) {
      const r = validateSubmission({ ...validSubmission, [field]: badValue });
      expect(r.ok, `field=${field}`).toBe(false);
    }
  });

  it('rejects non-boolean internalLaundry', () => {
    const r = validateSubmission({ ...validSubmission, internalLaundry: 'yes' });
    expect(r.ok).toBe(false);
  });

  it('rejects missing fields', () => {
    const { suburb: _suburb, ...withoutSuburb } = validSubmission;
    void _suburb;
    expect(validateSubmission(withoutSuburb).ok).toBe(false);
  });
});

const validOutcome = {
  outcomeType: 'new_lease',
  finalRentPw: 620,
  negotiated: false,
};

describe('validateOutcome', () => {
  it('accepts a minimal valid outcome', () => {
    const r = validateOutcome(validOutcome);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.outcomeType).toBe('new_lease');
      expect(r.value.negotiationSuccess).toBeNull();
      expect(r.value.suburb).toBeNull();
      expect(r.value.submissionId).toBeNull();
      expect(r.value.renewalIncreasePw).toBeNull();
    }
  });

  it('requires negotiationSuccess when negotiated=true', () => {
    const r = validateOutcome({ ...validOutcome, negotiated: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/negotiationSuccess/);
  });

  it('accepts negotiated=true with an explicit success boolean', () => {
    const r = validateOutcome({
      ...validOutcome,
      negotiated: true,
      negotiationSuccess: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.negotiationSuccess).toBe(true);
  });

  it('ignores negotiationSuccess when negotiated=false', () => {
    const r = validateOutcome({
      ...validOutcome,
      negotiated: false,
      negotiationSuccess: true, // would be ignored
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.negotiationSuccess).toBeNull();
  });

  it('rejects invalid outcomeType', () => {
    const r = validateOutcome({ ...validOutcome, outcomeType: 'eviction' });
    expect(r.ok).toBe(false);
  });

  it('rejects finalRentPw out of range', () => {
    expect(validateOutcome({ ...validOutcome, finalRentPw: 50 }).ok).toBe(false);
    expect(validateOutcome({ ...validOutcome, finalRentPw: 7000 }).ok).toBe(false);
  });

  it('only stores renewalIncreasePw for renewal outcomes', () => {
    const newLease = validateOutcome({
      ...validOutcome,
      outcomeType: 'new_lease',
      renewalIncreasePw: 50,
    });
    expect(newLease.ok).toBe(true);
    if (newLease.ok) expect(newLease.value.renewalIncreasePw).toBeNull();

    const renewal = validateOutcome({
      ...validOutcome,
      outcomeType: 'renewal',
      renewalIncreasePw: 50,
    });
    expect(renewal.ok).toBe(true);
    if (renewal.ok) expect(renewal.value.renewalIncreasePw).toBe(50);
  });

  it('rejects renewalIncreasePw out of range (renewal only)', () => {
    const r = validateOutcome({
      ...validOutcome,
      outcomeType: 'renewal',
      renewalIncreasePw: 5000,
    });
    expect(r.ok).toBe(false);
  });

  it('whitelists suburb when provided', () => {
    const ok = validateOutcome({ ...validOutcome, suburb: 'fitzroy' });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value.suburb).toBe('Fitzroy');

    const bad = validateOutcome({ ...validOutcome, suburb: 'Atlantis' });
    expect(bad.ok).toBe(false);
  });

  it('validates submissionId UUID format', () => {
    const ok = validateOutcome({
      ...validOutcome,
      submissionId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(ok.ok).toBe(true);

    const bad = validateOutcome({ ...validOutcome, submissionId: 'not-a-uuid' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toMatch(/submissionId/);
  });
});

describe('isValidEmail', () => {
  it.each([
    ['foo@bar.com', true],
    ['a.b+tag@example.co.uk', true],
    ['no-at-sign', false],
    ['has spaces@bar.com', false],
    ['@nolocal.com', false],
    ['nodomain@', false],
    ['', false],
  ] as const)('isValidEmail(%j) === %s', (input, expected) => {
    expect(isValidEmail(input)).toBe(expected);
  });

  it('rejects non-string types', () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(42)).toBe(false);
    expect(isValidEmail({ email: 'foo@bar.com' })).toBe(false);
  });

  it('rejects emails longer than 254 characters', () => {
    const long = 'a'.repeat(255) + '@bar.com';
    expect(isValidEmail(long)).toBe(false);
  });
});

// Minimal NextRequest shape for isSameOrigin tests — duck-typed.
function makeReq(origin: string | null, url: string): Parameters<typeof isSameOrigin>[0] {
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === 'origin' ? origin : null),
    },
    url,
  } as unknown as Parameters<typeof isSameOrigin>[0];
}

describe('isSameOrigin', () => {
  const origEnv = process.env.NEXT_PUBLIC_SITE_URL;

  it('rejects requests with no Origin header', () => {
    expect(isSameOrigin(makeReq(null, 'https://fairrent.au/api/submit'))).toBe(false);
  });

  it('accepts requests where Origin host matches request URL host', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(
      isSameOrigin(makeReq('https://fairrent.au', 'https://fairrent.au/api/submit'))
    ).toBe(true);
    process.env.NEXT_PUBLIC_SITE_URL = origEnv;
  });

  it('rejects cross-origin requests', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(
      isSameOrigin(makeReq('https://evil.example', 'https://fairrent.au/api/submit'))
    ).toBe(false);
    process.env.NEXT_PUBLIC_SITE_URL = origEnv;
  });

  it('uses NEXT_PUBLIC_SITE_URL host when set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://prod.fairrent.au';
    // Origin matches configured site, even though request URL host differs
    expect(
      isSameOrigin(
        makeReq('https://prod.fairrent.au', 'http://localhost:3000/api/submit')
      )
    ).toBe(true);
    expect(
      isSameOrigin(
        makeReq('http://localhost:3000', 'http://localhost:3000/api/submit')
      )
    ).toBe(false);
    process.env.NEXT_PUBLIC_SITE_URL = origEnv;
  });

  it('returns false on malformed origin', () => {
    expect(isSameOrigin(makeReq('not-a-url', 'https://fairrent.au/api/submit'))).toBe(false);
  });
});
