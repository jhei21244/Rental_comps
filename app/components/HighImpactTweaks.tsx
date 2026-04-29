'use client';

import { useMemo } from 'react';
import type { PropertyInput } from '@/lib/model';
import { computeTweaks, applyTweak } from '@/lib/tweaks';

interface Props {
  current: PropertyInput;
  onApply: (next: PropertyInput) => void;
}

export default function HighImpactTweaks({ current, onApply }: Props) {
  const tweaks = useMemo(() => computeTweaks(current, 6), [current]);

  if (tweaks.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'var(--text3)',
          marginBottom: 4,
        }}
      >
        Highest-impact tweaks
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--text2)',
          marginBottom: 10,
          lineHeight: 1.55,
        }}
      >
        The single attribute changes that would move expected rent the most.
        Click to apply.
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        {tweaks.map((t, i) => {
          const positive = t.delta > 0;
          const arrow = positive ? '↑' : '↓';
          const sign = positive ? '+' : '−';
          const tone = positive ? 'var(--terra)' : 'var(--sage)';
          return (
            <button
              key={i}
              type="button"
              onClick={() => onApply(applyTweak(current, t))}
              style={{
                display: 'grid',
                gridTemplateColumns: '20px 1fr 90px',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: 'var(--cream)',
                border: '1px solid var(--cream3)',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.12s, border-color 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = tone;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--cream)';
                e.currentTarget.style.borderColor = 'var(--cream3)';
              }}
            >
              <span
                aria-hidden
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: tone,
                  lineHeight: 1,
                }}
              >
                {arrow}
              </span>
              <span style={{ fontSize: 13, color: 'var(--bark)', lineHeight: 1.3 }}>
                <span style={{ color: 'var(--text3)' }}>{t.label}:</span>{' '}
                <span style={{ fontWeight: 600 }}>{t.toValue}</span>{' '}
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                  (from {t.fromValue})
                </span>
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: 'right',
                  color: tone,
                  fontFamily: 'var(--font-serif), Georgia, serif',
                }}
              >
                {sign}${Math.abs(t.delta)}/wk
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
