'use client';

import {
  BEDROOM_ADJUSTMENTS,
  BATHROOM_ADJUSTMENTS,
  TYPE_ADJUSTMENTS,
  type PropertyInput,
  type ModelResult,
} from '@/lib/model';
import { SUBURB_NAMES, getSuburbByName } from '@/lib/suburbs';

interface Props {
  original: PropertyInput;
  current: PropertyInput;
  result: ModelResult;
  onChange: (next: PropertyInput) => void;
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

function fmtAdj(v: number): string {
  if (v === 0) return '—';
  return `${v > 0 ? '+' : '−'}$${Math.abs(v)}/wk`;
}

function bedroomLabel(b: string): string {
  if (b === 'Studio') return 'Studio';
  if (b === '4+') return '4BR+';
  return `${b}BR`;
}

function parkingValue(p: string): string {
  return p === 'None' ? 'None' : p;
}

function findContribution(result: ModelResult, attr: string): number {
  const row = result.breakdown.find((r) => r.attribute === attr);
  return row?.contribution ?? 0;
}

export default function ConfigCard({ original, current, result, onChange }: Props) {
  const suburbData = getSuburbByName(current.suburb);
  const bedAdj = BEDROOM_ADJUSTMENTS[current.bedrooms] ?? 0;
  const bathAdj = BATHROOM_ADJUSTMENTS[current.bathrooms] ?? 0;
  const typeAdj = TYPE_ADJUSTMENTS[current.propertyType] ?? 0;

  const parkingContrib = findContribution(result, 'Parking');
  const airconContrib = findContribution(result, 'Air conditioning');
  const transportContrib = findContribution(result, 'Walk to transit');
  const conditionContrib = findContribution(result, 'Condition');
  const outdoorContrib = findContribution(result, 'Outdoor space');
  const laundryContrib = findContribution(result, 'Internal laundry');
  const furnishedContrib = findContribution(result, 'Furnished');

  const isDirty = (key: keyof PropertyInput) => current[key] !== original[key];
  const anyDirty =
    isDirty('suburb') ||
    isDirty('propertyType') ||
    isDirty('bedrooms') ||
    isDirty('bathrooms') ||
    isDirty('parking') ||
    isDirty('airCon') ||
    isDirty('transportWalk') ||
    isDirty('outdoorSpace') ||
    isDirty('internalLaundry') ||
    isDirty('furnished') ||
    isDirty('condition');

  const handleReset = () => onChange(original);

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--text3)',
          }}
        >
          Tweak this property
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={!anyDirty}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: anyDirty ? 'var(--terra)' : 'var(--text3)',
            background: 'transparent',
            border: 'none',
            cursor: anyDirty ? 'pointer' : 'not-allowed',
            padding: '4px 8px',
            letterSpacing: '0.3px',
          }}
        >
          ↺ Reset to my property
        </button>
      </div>

      <div style={{ display: 'grid', gap: 4 }}>
        <Row
          label="Suburb"
          dirty={isDirty('suburb')}
          originalValue={original.suburb}
          rightLabel={`base $${suburbData.median2br}/wk`}
          rightTone="neutral"
        >
          <select
            className="form-select"
            value={current.suburb}
            onChange={(e) => onChange({ ...current, suburb: e.target.value })}
          >
            {SUBURB_NAMES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Row>

        <Row
          label="Type"
          dirty={isDirty('propertyType')}
          originalValue={original.propertyType}
          rightLabel={fmtAdj(typeAdj)}
          rightTone={typeAdj > 0 ? 'positive' : typeAdj < 0 ? 'negative' : 'neutral'}
        >
          <Chips
            options={PROPERTY_TYPES}
            value={current.propertyType}
            onChange={(v) => onChange({ ...current, propertyType: v })}
          />
        </Row>

        <Row
          label="Bedrooms"
          dirty={isDirty('bedrooms')}
          originalValue={bedroomLabel(original.bedrooms)}
          rightLabel={fmtAdj(bedAdj)}
          rightTone={bedAdj > 0 ? 'positive' : bedAdj < 0 ? 'negative' : 'neutral'}
        >
          <Chips
            options={BEDROOMS}
            value={current.bedrooms}
            onChange={(v) => onChange({ ...current, bedrooms: v })}
          />
        </Row>

        <Row
          label="Bathrooms"
          dirty={isDirty('bathrooms')}
          originalValue={original.bathrooms}
          rightLabel={fmtAdj(bathAdj)}
          rightTone={bathAdj > 0 ? 'positive' : bathAdj < 0 ? 'negative' : 'neutral'}
        >
          <Chips
            options={BATHROOMS}
            value={current.bathrooms}
            onChange={(v) => onChange({ ...current, bathrooms: v })}
          />
        </Row>

        <div
          style={{
            height: 1,
            background: 'var(--cream3)',
            margin: '6px 0',
          }}
        />

        <Row
          label="Parking"
          dirty={isDirty('parking')}
          originalValue={parkingValue(original.parking)}
          rightLabel={fmtAdj(parkingContrib)}
          rightTone={parkingContrib > 0 ? 'positive' : parkingContrib < 0 ? 'negative' : 'neutral'}
        >
          <select
            className="form-select"
            value={current.parking}
            onChange={(e) => onChange({ ...current, parking: e.target.value })}
          >
            {PARKING.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Row>

        <Row
          label="Aircon"
          dirty={isDirty('airCon')}
          originalValue={original.airCon}
          rightLabel={fmtAdj(airconContrib)}
          rightTone={airconContrib > 0 ? 'positive' : 'neutral'}
        >
          <Chips
            options={AIR_CON}
            value={current.airCon}
            onChange={(v) => onChange({ ...current, airCon: v })}
          />
        </Row>

        <Row
          label="Walk to transit"
          dirty={isDirty('transportWalk')}
          originalValue={original.transportWalk}
          rightLabel={fmtAdj(transportContrib)}
          rightTone={transportContrib > 0 ? 'positive' : 'neutral'}
        >
          <select
            className="form-select"
            value={current.transportWalk}
            onChange={(e) => onChange({ ...current, transportWalk: e.target.value })}
          >
            {TRANSPORT.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Row>

        <Row
          label="Outdoor"
          dirty={isDirty('outdoorSpace')}
          originalValue={original.outdoorSpace}
          rightLabel={fmtAdj(outdoorContrib)}
          rightTone={outdoorContrib > 0 ? 'positive' : 'neutral'}
        >
          <select
            className="form-select"
            value={current.outdoorSpace}
            onChange={(e) => onChange({ ...current, outdoorSpace: e.target.value })}
          >
            {OUTDOOR.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Row>

        <Row
          label="Condition"
          dirty={isDirty('condition')}
          originalValue={original.condition}
          rightLabel={fmtAdj(conditionContrib)}
          rightTone={
            conditionContrib > 0 ? 'positive' : conditionContrib < 0 ? 'negative' : 'neutral'
          }
        >
          <select
            className="form-select"
            value={current.condition}
            onChange={(e) => onChange({ ...current, condition: e.target.value })}
          >
            {CONDITION.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Row>

        <Row
          label="Internal laundry"
          dirty={isDirty('internalLaundry')}
          originalValue={original.internalLaundry ? 'Yes' : 'No'}
          rightLabel={fmtAdj(laundryContrib)}
          rightTone={laundryContrib > 0 ? 'positive' : 'neutral'}
        >
          <Toggle
            value={current.internalLaundry}
            onChange={(v) => onChange({ ...current, internalLaundry: v })}
          />
        </Row>

        <Row
          label="Furnished"
          dirty={isDirty('furnished')}
          originalValue={original.furnished}
          rightLabel={fmtAdj(furnishedContrib)}
          rightTone={furnishedContrib > 0 ? 'positive' : 'neutral'}
        >
          <Chips
            options={FURNISHED}
            value={current.furnished}
            onChange={(v) => onChange({ ...current, furnished: v })}
          />
        </Row>
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '2px solid var(--cream3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bark)' }}>
          Expected for this configuration
        </span>
        <span
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--bark)',
          }}
        >
          ${result.expectedRent}/wk
        </span>
      </div>
    </div>
  );
}

type Tone = 'positive' | 'negative' | 'neutral';

function Row({
  label,
  dirty,
  originalValue,
  rightLabel,
  rightTone,
  children,
}: {
  label: string;
  dirty: boolean;
  originalValue: string;
  rightLabel: string;
  rightTone: Tone;
  children: React.ReactNode;
}) {
  const rightColor =
    rightTone === 'positive'
      ? 'var(--terra)'
      : rightTone === 'negative'
      ? 'var(--sage)'
      : 'var(--text3)';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr 90px',
        alignItems: 'center',
        gap: 12,
        padding: '8px 10px',
        background: dirty ? 'var(--terrapale)' : 'transparent',
        border: `1px solid ${dirty ? 'var(--terra)' : 'transparent'}`,
        borderRadius: 8,
        transition: 'background 0.12s, border-color 0.12s',
      }}
    >
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>{label}</div>
        {dirty && (
          <div
            style={{
              fontSize: 10,
              color: 'var(--text3)',
              marginTop: 2,
              fontWeight: 500,
            }}
          >
            ↻ original: {originalValue}
          </div>
        )}
      </div>
      <div>{children}</div>
      <div
        style={{
          textAlign: 'right',
          fontSize: 12,
          fontWeight: 700,
          color: rightColor,
        }}
      >
        {rightLabel}
      </div>
    </div>
  );
}

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const selected = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 10px',
              borderRadius: 6,
              border: `1px solid ${selected ? 'var(--terra)' : 'var(--cream3)'}`,
              background: selected ? 'var(--terrapale)' : 'var(--cream)',
              color: selected ? 'var(--terra)' : 'var(--bark)',
              cursor: 'pointer',
              transition: 'background 0.12s, border-color 0.12s, color 0.12s',
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: value ? 'var(--terra)' : 'var(--cream3)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: value ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'white',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}
