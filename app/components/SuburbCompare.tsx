'use client';

import { useMemo } from 'react';
import { SUBURBS } from '@/lib/suburbs';
import { calculateRent, type PropertyInput } from '@/lib/model';

interface Props {
  input: PropertyInput;
  onSelect: (suburbName: string) => void;
}

export default function SuburbCompare({ input, onSelect }: Props) {
  const rows = useMemo(() => {
    return SUBURBS.map((s) => {
      const r = calculateRent({ ...input, suburb: s.name });
      return {
        name: s.name,
        slug: s.slug,
        expected: r.expectedRent,
        n: s.n,
      };
    }).sort((a, b) => a.expected - b.expected);
  }, [input]);

  const currentRow = rows.find((r) => r.name === input.suburb);
  const currentExpected = currentRow?.expected ?? rows[0].expected;
  const min = rows[0].expected;
  const max = rows[rows.length - 1].expected;
  const range = Math.max(1, max - min);

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        background: 'var(--cream)',
        borderRadius: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'var(--text3)',
          marginBottom: 12,
        }}
      >
        Same property, different suburbs
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--text2)',
          marginBottom: 14,
          lineHeight: 1.6,
        }}
      >
        Your exact configuration ({input.bedrooms === 'Studio' ? 'Studio' : `${input.bedrooms}BR`}{' '}
        {input.propertyType.toLowerCase()}, the same attributes) priced against every suburb&apos;s
        baseline. Click a row to swap.
      </div>

      <div style={{ display: 'grid', gap: 4 }}>
        {rows.map((r) => {
          const isCurrent = r.name === input.suburb;
          const delta = r.expected - currentExpected;
          const barWidth = ((r.expected - min) / range) * 100;
          const deltaText = isCurrent
            ? 'this suburb'
            : `${delta > 0 ? '+' : ''}$${delta}/wk`;
          const deltaColor = isCurrent
            ? 'var(--text3)'
            : delta > 0
            ? 'var(--terra)'
            : 'var(--sage)';

          return (
            <button
              key={r.slug}
              type="button"
              onClick={() => onSelect(r.name)}
              style={{
                display: 'grid',
                gridTemplateColumns: '14px 110px 76px 1fr 92px',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                background: isCurrent ? 'white' : 'transparent',
                border: `1px solid ${isCurrent ? 'var(--terra)' : 'transparent'}`,
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.12s, border-color 0.12s',
              }}
              onMouseEnter={(e) => {
                if (!isCurrent) e.currentTarget.style.background = 'white';
              }}
              onMouseLeave={(e) => {
                if (!isCurrent) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span
                aria-hidden
                style={{
                  fontSize: 10,
                  color: isCurrent ? 'var(--terra)' : 'transparent',
                  lineHeight: 1,
                }}
              >
                ●
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: isCurrent ? 700 : 500,
                  color: 'var(--bark)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {r.name}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--bark)',
                }}
              >
                ${r.expected}/wk
              </span>
              <span
                style={{
                  position: 'relative',
                  height: 8,
                  background: 'var(--cream3)',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${barWidth}%`,
                    background: isCurrent ? 'var(--terra)' : 'var(--cream3)',
                    backgroundImage: isCurrent
                      ? 'none'
                      : 'linear-gradient(to right, var(--text3), var(--text3))',
                    opacity: isCurrent ? 1 : 0.45,
                    borderRadius: 4,
                  }}
                />
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: deltaColor,
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {deltaText}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
