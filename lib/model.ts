import { SUBURBS } from './suburbs';

// Attribute weights ($/week) — calibrated against Apr 2026 Domain listing data
// (n=486 across 24 inner Melbourne suburbs). Some weights still rely on
// literature priors where attribute-level data was thin; these will be
// regressed end-to-end once the listing-detail collection completes.
export const ATTRIBUTE_WEIGHTS = {
  parking_street: 5,
  parking_undercover: 40,
  parking_lockup_garage: 52,
  aircon_one_room: 10,
  aircon_whole: 16,
  transport_lt5: 35,
  transport_5_10: 20,
  transport_10_15: 8,
  condition_new_build: 60,
  condition_renovated: 47,
  condition_dated: -25,
  condition_poor: -40,
  outdoor_balcony: 40,
  outdoor_courtyard_garden: 55,
  internal_laundry: 20,
  furnished: 80,
} as const;

export interface PropertyInput {
  suburb: string;
  propertyType: string;
  bedrooms: string;
  bathrooms: string;
  rentPw: number;
  parking: string;
  airCon: string;
  transportWalk: string;
  outdoorSpace: string;
  internalLaundry: boolean;
  furnished: string;
  condition: string;
}

export interface ModelResult {
  expectedRent: number;
  actualRent: number;
  difference: number; // positive = above market
  breakdown: Array<{ attribute: string; value: string; contribution: number }>;
  confidence: 'High' | 'Medium' | 'Low';
  records: number;
  suburb: string;
}

const BEDROOM_ADJUSTMENTS: Record<string, number> = {
  Studio: -120,
  '1': -80,
  '2': 0,
  '3': 100,
  '4+': 180,
};

const BATHROOM_ADJUSTMENTS: Record<string, number> = {
  '1': 0,
  '2': 30,
  '3+': 50,
};

const TYPE_ADJUSTMENTS: Record<string, number> = {
  Apartment: 0,
  House: 50,
  Townhouse: 20,
};

export function calculateRent(input: PropertyInput): ModelResult {
  const suburbData = SUBURBS.find((s) => s.name.toLowerCase() === input.suburb.toLowerCase());
  if (!suburbData) {
    throw new Error(`No data for suburb: ${input.suburb}`);
  }

  const bedAdj = BEDROOM_ADJUSTMENTS[input.bedrooms] ?? 0;
  const bathAdj = BATHROOM_ADJUSTMENTS[input.bathrooms] ?? 0;
  const typeAdj = TYPE_ADJUSTMENTS[input.propertyType] ?? 0;
  const base = suburbData.median2br + bedAdj + typeAdj + bathAdj;

  const bedroomLabel =
    input.bedrooms === 'Studio'
      ? 'Studio'
      : input.bedrooms === '4+'
      ? '4BR+'
      : `${input.bedrooms}BR`;

  const breakdown: ModelResult['breakdown'] = [
    {
      attribute: `Base (${bedroomLabel} ${input.propertyType.toLowerCase()}, ${suburbData.name})`,
      value: '—',
      contribution: base,
    },
  ];

  // Parking
  let parkingContrib: number = 0;
  let parkingValue = 'None';
  if (input.parking === 'Street') {
    parkingContrib = ATTRIBUTE_WEIGHTS.parking_street;
    parkingValue = 'Street';
  } else if (input.parking === 'Undercover') {
    parkingContrib = ATTRIBUTE_WEIGHTS.parking_undercover;
    parkingValue = 'Undercover';
  } else if (input.parking === 'Lock-up garage') {
    parkingContrib = ATTRIBUTE_WEIGHTS.parking_lockup_garage;
    parkingValue = 'Lock-up garage';
  }
  breakdown.push({ attribute: 'Parking', value: parkingValue, contribution: parkingContrib });

  // Air conditioning
  let airconContrib: number = 0;
  let airconValue = 'None';
  if (input.airCon === 'One room') {
    airconContrib = ATTRIBUTE_WEIGHTS.aircon_one_room;
    airconValue = 'One room';
  } else if (input.airCon === 'Whole property') {
    airconContrib = ATTRIBUTE_WEIGHTS.aircon_whole;
    airconValue = 'Whole property';
  }
  breakdown.push({ attribute: 'Air conditioning', value: airconValue, contribution: airconContrib });

  // Transport
  let transportContrib: number = 0;
  let transportValue = 'Over 15 min';
  if (input.transportWalk === 'Under 5 min') {
    transportContrib = ATTRIBUTE_WEIGHTS.transport_lt5;
    transportValue = 'Under 5 min';
  } else if (input.transportWalk === '5–10 min') {
    transportContrib = ATTRIBUTE_WEIGHTS.transport_5_10;
    transportValue = '5–10 min';
  } else if (input.transportWalk === '10–15 min') {
    transportContrib = ATTRIBUTE_WEIGHTS.transport_10_15;
    transportValue = '10–15 min';
  }
  breakdown.push({ attribute: 'Walk to transit', value: transportValue, contribution: transportContrib });

  // Condition
  let condContrib: number = 0;
  if (input.condition === 'New build') {
    condContrib = ATTRIBUTE_WEIGHTS.condition_new_build;
  } else if (input.condition === 'Recently renovated') {
    condContrib = ATTRIBUTE_WEIGHTS.condition_renovated;
  } else if (input.condition === 'A bit dated') {
    condContrib = ATTRIBUTE_WEIGHTS.condition_dated;
  } else if (input.condition === 'Needs work') {
    condContrib = ATTRIBUTE_WEIGHTS.condition_poor;
  }
  breakdown.push({ attribute: 'Condition', value: input.condition, contribution: condContrib });

  // Outdoor space
  let outdoorContrib: number = 0;
  let outdoorValue = 'None';
  if (input.outdoorSpace === 'Balcony') {
    outdoorContrib = ATTRIBUTE_WEIGHTS.outdoor_balcony;
    outdoorValue = 'Balcony';
  } else if (input.outdoorSpace === 'Courtyard or garden') {
    outdoorContrib = ATTRIBUTE_WEIGHTS.outdoor_courtyard_garden;
    outdoorValue = 'Courtyard or garden';
  }
  breakdown.push({ attribute: 'Outdoor space', value: outdoorValue, contribution: outdoorContrib });

  // Internal laundry
  let contrib: number = 0;
  if (input.internalLaundry) { contrib = ATTRIBUTE_WEIGHTS.internal_laundry; }
  breakdown.push({ attribute: 'Internal laundry', value: input.internalLaundry ? 'Yes' : 'No', contribution: contrib });

  // Furnished
  let furnishedContrib: number = 0;
  if (input.furnished === 'Furnished') { furnishedContrib = ATTRIBUTE_WEIGHTS.furnished; }
  breakdown.push({ attribute: 'Furnished', value: input.furnished, contribution: furnishedContrib });

  const attribTotal =
    parkingContrib +
    airconContrib +
    transportContrib +
    condContrib +
    outdoorContrib +
    contrib +
    furnishedContrib;

  const expectedRent = Math.round(base + attribTotal);

  const confidence: 'High' | 'Medium' | 'Low' =
    suburbData.n >= 200 ? 'High' : suburbData.n >= 50 ? 'Medium' : 'Low';

  return {
    expectedRent,
    actualRent: input.rentPw,
    difference: input.rentPw - expectedRent,
    breakdown,
    confidence,
    records: suburbData.n,
    suburb: suburbData.name,
  };
}
