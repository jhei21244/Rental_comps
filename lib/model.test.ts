import { describe, expect, it } from 'vitest';
import {
  calculateRent,
  ATTRIBUTE_WEIGHTS,
  BEDROOM_ADJUSTMENTS,
  BATHROOM_ADJUSTMENTS,
  TYPE_ADJUSTMENTS,
  type PropertyInput,
} from './model';
import { SUBURBS } from './suburbs';

const BRUNSWICK = SUBURBS.find((s) => s.name === 'Brunswick')!;
const FOOTSCRAY = SUBURBS.find((s) => s.name === 'Footscray')!;
const DOCKLANDS = SUBURBS.find((s) => s.name === 'Docklands')!;

const baseline: PropertyInput = {
  suburb: 'Brunswick',
  propertyType: 'Apartment',
  bedrooms: '2',
  bathrooms: '1',
  rentPw: 700,
  parking: 'None',
  airCon: 'None',
  transportWalk: 'Over 15 min',
  outdoorSpace: 'None',
  internalLaundry: false,
  furnished: 'Unfurnished',
  condition: 'Well maintained',
};

describe('calculateRent — baseline', () => {
  it('returns suburb median for a baseline 2BR apartment with no premium attributes', () => {
    const r = calculateRent(baseline);
    expect(r.expectedRent).toBe(BRUNSWICK.median2br);
  });

  it('preserves the canonical suburb name (case-insensitive lookup)', () => {
    const r = calculateRent({ ...baseline, suburb: 'brunswick' });
    expect(r.suburb).toBe('Brunswick');
  });

  it('records suburb listing count', () => {
    const r = calculateRent(baseline);
    expect(r.records).toBe(BRUNSWICK.n);
  });

  it('throws on an unknown suburb', () => {
    expect(() => calculateRent({ ...baseline, suburb: 'Atlantis' })).toThrowError(/No data/);
  });
});

describe('calculateRent — difference and verdict math', () => {
  it('difference equals actualRent minus expectedRent', () => {
    const r = calculateRent({ ...baseline, rentPw: 800 });
    expect(r.difference).toBe(800 - r.expectedRent);
  });

  it('actualRent is preserved from input', () => {
    const r = calculateRent({ ...baseline, rentPw: 612 });
    expect(r.actualRent).toBe(612);
  });

  it('returns negative difference when paying below expected', () => {
    const r = calculateRent({ ...baseline, rentPw: 100 });
    expect(r.difference).toBeLessThan(0);
  });
});

describe('calculateRent — bedroom adjustments', () => {
  for (const beds of ['Studio', '1', '2', '3', '4+'] as const) {
    it(`applies BEDROOM_ADJUSTMENTS[${beds}] = ${BEDROOM_ADJUSTMENTS[beds]}`, () => {
      const r = calculateRent({ ...baseline, bedrooms: beds });
      expect(r.expectedRent).toBe(BRUNSWICK.median2br + BEDROOM_ADJUSTMENTS[beds]);
    });
  }
});

describe('calculateRent — bathroom adjustments', () => {
  for (const baths of ['1', '2', '3+'] as const) {
    it(`applies BATHROOM_ADJUSTMENTS[${baths}] = ${BATHROOM_ADJUSTMENTS[baths]}`, () => {
      const r = calculateRent({ ...baseline, bathrooms: baths });
      expect(r.expectedRent).toBe(BRUNSWICK.median2br + BATHROOM_ADJUSTMENTS[baths]);
    });
  }
});

describe('calculateRent — property type adjustments', () => {
  for (const t of ['Apartment', 'House', 'Townhouse'] as const) {
    it(`applies TYPE_ADJUSTMENTS[${t}] = ${TYPE_ADJUSTMENTS[t]}`, () => {
      const r = calculateRent({ ...baseline, propertyType: t });
      expect(r.expectedRent).toBe(BRUNSWICK.median2br + TYPE_ADJUSTMENTS[t]);
    });
  }
});

describe('calculateRent — attribute contributions', () => {
  it('parking street/undercover/lock-up garage match ATTRIBUTE_WEIGHTS', () => {
    expect(calculateRent({ ...baseline, parking: 'Street' }).expectedRent).toBe(
      BRUNSWICK.median2br + ATTRIBUTE_WEIGHTS.parking_street
    );
    expect(calculateRent({ ...baseline, parking: 'Undercover' }).expectedRent).toBe(
      BRUNSWICK.median2br + ATTRIBUTE_WEIGHTS.parking_undercover
    );
    expect(calculateRent({ ...baseline, parking: 'Lock-up garage' }).expectedRent).toBe(
      BRUNSWICK.median2br + ATTRIBUTE_WEIGHTS.parking_lockup_garage
    );
  });

  it('aircon one-room and whole-property match ATTRIBUTE_WEIGHTS', () => {
    expect(calculateRent({ ...baseline, airCon: 'One room' }).expectedRent).toBe(
      BRUNSWICK.median2br + ATTRIBUTE_WEIGHTS.aircon_one_room
    );
    expect(calculateRent({ ...baseline, airCon: 'Whole property' }).expectedRent).toBe(
      BRUNSWICK.median2br + ATTRIBUTE_WEIGHTS.aircon_whole
    );
  });

  it('transport walk matches ATTRIBUTE_WEIGHTS', () => {
    expect(calculateRent({ ...baseline, transportWalk: 'Under 5 min' }).expectedRent).toBe(
      BRUNSWICK.median2br + ATTRIBUTE_WEIGHTS.transport_lt5
    );
    expect(calculateRent({ ...baseline, transportWalk: '5–10 min' }).expectedRent).toBe(
      BRUNSWICK.median2br + ATTRIBUTE_WEIGHTS.transport_5_10
    );
    expect(calculateRent({ ...baseline, transportWalk: '10–15 min' }).expectedRent).toBe(
      BRUNSWICK.median2br + ATTRIBUTE_WEIGHTS.transport_10_15
    );
  });

  it('condition (positive and negative) matches ATTRIBUTE_WEIGHTS', () => {
    expect(calculateRent({ ...baseline, condition: 'New build' }).expectedRent).toBe(
      BRUNSWICK.median2br + ATTRIBUTE_WEIGHTS.condition_new_build
    );
    expect(calculateRent({ ...baseline, condition: 'Recently renovated' }).expectedRent).toBe(
      BRUNSWICK.median2br + ATTRIBUTE_WEIGHTS.condition_renovated
    );
    expect(calculateRent({ ...baseline, condition: 'A bit dated' }).expectedRent).toBe(
      BRUNSWICK.median2br + ATTRIBUTE_WEIGHTS.condition_dated
    );
    expect(calculateRent({ ...baseline, condition: 'Needs work' }).expectedRent).toBe(
      BRUNSWICK.median2br + ATTRIBUTE_WEIGHTS.condition_poor
    );
  });

  it('outdoor space matches ATTRIBUTE_WEIGHTS', () => {
    expect(calculateRent({ ...baseline, outdoorSpace: 'Balcony' }).expectedRent).toBe(
      BRUNSWICK.median2br + ATTRIBUTE_WEIGHTS.outdoor_balcony
    );
    expect(calculateRent({ ...baseline, outdoorSpace: 'Courtyard or garden' }).expectedRent).toBe(
      BRUNSWICK.median2br + ATTRIBUTE_WEIGHTS.outdoor_courtyard_garden
    );
  });

  it('internal laundry matches ATTRIBUTE_WEIGHTS', () => {
    expect(calculateRent({ ...baseline, internalLaundry: true }).expectedRent).toBe(
      BRUNSWICK.median2br + ATTRIBUTE_WEIGHTS.internal_laundry
    );
  });

  it('furnished matches ATTRIBUTE_WEIGHTS', () => {
    expect(calculateRent({ ...baseline, furnished: 'Furnished' }).expectedRent).toBe(
      BRUNSWICK.median2br + ATTRIBUTE_WEIGHTS.furnished
    );
  });

  it('combined attributes sum independently (no interaction terms)', () => {
    const r = calculateRent({
      ...baseline,
      parking: 'Lock-up garage',
      airCon: 'Whole property',
      outdoorSpace: 'Courtyard or garden',
      internalLaundry: true,
      furnished: 'Furnished',
    });
    const expected =
      BRUNSWICK.median2br +
      ATTRIBUTE_WEIGHTS.parking_lockup_garage +
      ATTRIBUTE_WEIGHTS.aircon_whole +
      ATTRIBUTE_WEIGHTS.outdoor_courtyard_garden +
      ATTRIBUTE_WEIGHTS.internal_laundry +
      ATTRIBUTE_WEIGHTS.furnished;
    expect(r.expectedRent).toBe(expected);
  });
});

describe('calculateRent — confidence', () => {
  it('returns Low for small-sample suburbs (n<50)', () => {
    expect(calculateRent({ ...baseline, suburb: 'Docklands' }).confidence).toBe('Low');
    expect(DOCKLANDS.n).toBeLessThan(50);
  });

  it('returns High for n>=200 suburbs', () => {
    expect(calculateRent({ ...baseline, suburb: 'Footscray' }).confidence).toBe('High');
    expect(FOOTSCRAY.n).toBeGreaterThanOrEqual(200);
  });
});

describe('calculateRent — breakdown structure', () => {
  it('returns 8 rows: base + 7 attribute rows', () => {
    const r = calculateRent(baseline);
    expect(r.breakdown).toHaveLength(8);
    expect(r.breakdown[0].attribute).toMatch(/^Base/);
    expect(r.breakdown.map((b) => b.attribute)).toEqual([
      expect.stringMatching(/^Base/),
      'Parking',
      'Air conditioning',
      'Walk to transit',
      'Condition',
      'Outdoor space',
      'Internal laundry',
      'Furnished',
    ]);
  });

  it('breakdown contributions sum (with base) to expectedRent', () => {
    const r = calculateRent({
      ...baseline,
      parking: 'Lock-up garage',
      condition: 'Recently renovated',
    });
    const sum = r.breakdown.reduce((acc, row) => acc + row.contribution, 0);
    expect(sum).toBe(r.expectedRent);
  });
});
