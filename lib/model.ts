import { SUBURBS } from './suburbs';

// Attribute weights derived from real Domain.com.au listing data (Apr 2026, n=30 inner Melbourne)
export const ATTRIBUTE_WEIGHTS = {
  parking_street: 5,
  parking_undercover: 40,    // Real data: +$43/wk avg (n=26 with parking vs n=4 without)
  parking_garage: 50,         // Estimated ~25% above undercover
  aircon_none: -16,           // Real data: -$16/wk (no AC vs has AC, n=30)
  aircon_one_room: 10,
  aircon_whole: 16,           // Real data: +$16/wk for any AC
  transport_lt5: 35,          // Literature prior — not yet in data
  transport_5_10: 20,
  transport_10_15: 8,
  floor_1_3: 12,              // Literature prior — floor level not extracted (all unknown)
  floor_4plus: 22,
  condition_renovated: 47,    // Real data: +$47/wk (new_renovated vs maintained, n=30)
  condition_dated: -25,       // Estimated — small dated sample
  condition_poor: -40,
  pets_yes: 15,               // Literature prior
  outdoor_small_balcony: 40,  // Real data: balcony avg $771 vs none $690 = ~$80/wk; conservative 40
  outdoor_large_balcony: 65,
  outdoor_courtyard: 55,      // Real data: courtyard avg $782 (similar to balcony in apartments)
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
  floorLevel: string;
  condition: string;
  petsAllowed: boolean;
  outdoorSpace: string;
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
  } else if (input.parking === 'Garage') {
    parkingContrib = ATTRIBUTE_WEIGHTS.parking_garage;
    parkingValue = 'Garage';
  }
  breakdown.push({ attribute: 'Parking', value: parkingValue, contribution: parkingContrib });

  // Air conditioning
  let airconContrib: number = ATTRIBUTE_WEIGHTS.aircon_none;
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

  // Floor level
  let floorContrib: number = 0;
  if (input.floorLevel === '1–3') {
    floorContrib = ATTRIBUTE_WEIGHTS.floor_1_3;
  } else if (input.floorLevel === '4+') {
    floorContrib = ATTRIBUTE_WEIGHTS.floor_4plus;
  }
  breakdown.push({ attribute: 'Floor level', value: input.floorLevel, contribution: floorContrib });

  // Condition
  let condContrib: number = 0;
  if (input.condition === 'Recently renovated') {
    condContrib = ATTRIBUTE_WEIGHTS.condition_renovated;
  } else if (input.condition === 'A bit dated') {
    condContrib = ATTRIBUTE_WEIGHTS.condition_dated;
  } else if (input.condition === 'Needs work') {
    condContrib = ATTRIBUTE_WEIGHTS.condition_poor;
  }
  breakdown.push({ attribute: 'Condition', value: input.condition, contribution: condContrib });

  // Pets
  const petsContrib: number = input.petsAllowed ? ATTRIBUTE_WEIGHTS.pets_yes : 0;
  breakdown.push({
    attribute: 'Pets allowed',
    value: input.petsAllowed ? 'Yes' : 'No',
    contribution: petsContrib,
  });

  // Outdoor space
  let outdoorContrib: number = 0;
  let outdoorValue = 'None';
  if (input.outdoorSpace === 'Small balcony') {
    outdoorContrib = ATTRIBUTE_WEIGHTS.outdoor_small_balcony;
    outdoorValue = 'Small balcony';
  } else if (input.outdoorSpace === 'Large balcony') {
    outdoorContrib = ATTRIBUTE_WEIGHTS.outdoor_large_balcony;
    outdoorValue = 'Large balcony';
  } else if (input.outdoorSpace === 'Private courtyard/garden') {
    outdoorContrib = ATTRIBUTE_WEIGHTS.outdoor_courtyard;
    outdoorValue = 'Private courtyard/garden';
  }
  breakdown.push({ attribute: 'Outdoor space', value: outdoorValue, contribution: outdoorContrib });

  const attribTotal =
    parkingContrib +
    airconContrib +
    transportContrib +
    floorContrib +
    condContrib +
    petsContrib +
    outdoorContrib;

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
