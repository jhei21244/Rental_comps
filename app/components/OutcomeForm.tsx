'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { SUBURB_NAMES } from '@/lib/suburbs';

type OutcomeType = 'new_lease' | 'renewal' | 'declined_renewal';

const OUTCOME_OPTIONS: Array<{ value: OutcomeType; title: string; body: string }> = [
  {
    value: 'new_lease',
    title: 'I signed a new lease',
    body: 'Moved into a new place.',
  },
  {
    value: 'renewal',
    title: 'I renewed my existing lease',
    body: 'Stayed at the same property.',
  },
  {
    value: 'declined_renewal',
    title: 'I moved out instead of renewing',
    body: 'Landlord asked for an increase I didn’t accept.',
  },
];

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text2)',
  letterSpacing: '0.2px',
  marginBottom: 6,
};

const sectionHeader: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'var(--text3)',
  marginBottom: 16,
};

export default function OutcomeForm() {
  const [suburbInput, setSuburbInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [outcomeType, setOutcomeType] = useState<OutcomeType | ''>('');
  const [renewalIncrease, setRenewalIncrease] = useState<number | ''>('');
  const [negotiated, setNegotiated] = useState<boolean | null>(null);
  const [negotiationSuccess, setNegotiationSuccess] = useState<boolean | null>(null);
  const [finalRent, setFinalRent] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSuburbValid = useMemo(
    () =>
      suburbInput === '' ||
      SUBURB_NAMES.some((n) => n.toLowerCase() === suburbInput.toLowerCase()),
    [suburbInput]
  );

  const suggestions = useMemo(
    () =>
      SUBURB_NAMES.filter((n) =>
        n.toLowerCase().includes(suburbInput.toLowerCase())
      ).slice(0, 8),
    [suburbInput]
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!outcomeType) {
      setError('Please tell us what happened.');
      return;
    }
    if (!isSuburbValid) {
      setError(`We don’t have data for ${suburbInput} yet. Leave the field empty if you’d rather report anonymously.`);
      return;
    }
    if (negotiated === null) {
      setError('Please tell us whether you negotiated.');
      return;
    }
    if (negotiated && negotiationSuccess === null) {
      setError('Was the negotiation successful?');
      return;
    }
    if (!finalRent || finalRent < 80 || finalRent > 5000) {
      setError('Please enter a valid weekly rent (80–5000).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suburb: suburbInput.trim() || null,
          outcomeType,
          renewalIncreasePw:
            outcomeType === 'renewal' && renewalIncrease !== '' ? renewalIncrease : null,
          negotiated,
          negotiationSuccess,
          finalRentPw: finalRent,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const payload = await res.json().catch(() => ({}));
        setError(payload?.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        className="animate-rise"
        style={{
          background: 'white',
          border: '1px solid var(--cream3)',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 2px 20px rgba(42,24,16,0.06)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 22,
            color: 'var(--bark)',
            marginBottom: 8,
          }}
        >
          Thanks for sharing.
        </div>
        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65, fontWeight: 300 }}>
          Every report makes the next renter’s answer more accurate. We’ll fold this into the
          next data refresh.
        </p>
      </div>
    );
  }

  const submitDisabled = submitting;

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--cream3)',
        borderRadius: 16,
        padding: 32,
        boxShadow: '0 2px 20px rgba(42,24,16,0.06)',
      }}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div style={sectionHeader}>What happened?</div>

        <div style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
          {OUTCOME_OPTIONS.map((opt) => {
            const selected = outcomeType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setOutcomeType(opt.value)}
                style={{
                  textAlign: 'left',
                  background: selected ? 'var(--terrapale)' : 'var(--cream)',
                  border: `1px solid ${selected ? 'var(--terra)' : 'var(--cream3)'}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: selected ? 'var(--terra)' : 'var(--bark)',
                    marginBottom: 2,
                  }}
                >
                  {opt.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{opt.body}</div>
              </button>
            );
          })}
        </div>

        <div style={sectionHeader}>Property &amp; rent</div>

        <div style={{ position: 'relative', marginBottom: 14 }} ref={dropdownRef}>
          <label style={label}>
            Suburb <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={suburbInput}
            placeholder="e.g. Brunswick, Fitzroy, Richmond…"
            onChange={(e) => {
              setSuburbInput(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            autoComplete="off"
          />
          {showSuggestions && suburbInput.length > 0 && suggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid var(--cream3)',
                borderRadius: 10,
                boxShadow: '0 4px 20px rgba(42,24,16,0.10)',
                zIndex: 100,
                marginTop: 4,
                overflow: 'hidden',
              }}
            >
              {suggestions.map((s) => (
                <div
                  key={s}
                  onMouseDown={() => {
                    setSuburbInput(s);
                    setShowSuggestions(false);
                  }}
                  style={{
                    padding: '10px 14px',
                    fontSize: 14,
                    cursor: 'pointer',
                    color: 'var(--bark)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cream)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {outcomeType === 'renewal' && (
          <div style={{ marginBottom: 14 }}>
            <label style={label}>
              Renewal increase asked for{' '}
              <span style={{ color: 'var(--text3)', fontWeight: 400 }}>($/week, optional)</span>
            </label>
            <input
              type="number"
              className="form-input"
              value={renewalIncrease === '' ? '' : renewalIncrease}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                setRenewalIncrease(Number.isFinite(v) ? v : '');
              }}
              placeholder="40"
              min={0}
              max={2000}
            />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Did you negotiate?</label>
          <YesNo value={negotiated} onChange={setNegotiated} />
        </div>

        {negotiated && (
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Was the negotiation successful?</label>
            <YesNo value={negotiationSuccess} onChange={setNegotiationSuccess} />
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={label}>Final agreed weekly rent</label>
          <div className="rent-wrap">
            <input
              type="number"
              className="form-input"
              value={finalRent === '' ? '' : finalRent}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                setFinalRent(Number.isFinite(v) ? v : '');
              }}
              placeholder="620"
              min={80}
              max={5000}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              fontSize: 13,
              color: '#b92c2c',
              marginBottom: 12,
              padding: '8px 12px',
              background: '#fef2f2',
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitDisabled}
          style={{
            width: '100%',
            background: submitDisabled ? 'var(--cream3)' : 'var(--terra)',
            color: submitDisabled ? 'var(--text3)' : 'white',
            fontSize: 15,
            fontWeight: 700,
            padding: 14,
            borderRadius: 10,
            border: 'none',
            cursor: submitDisabled ? 'not-allowed' : 'pointer',
            letterSpacing: '0.3px',
            transition: 'background 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {submitting && <span className="spinner" />}
          {submitting ? 'Sending…' : 'Submit outcome →'}
        </button>

        <p
          style={{
            fontSize: 11,
            color: 'var(--text3)',
            marginTop: 10,
            lineHeight: 1.6,
          }}
        >
          Anonymous. We don’t collect your name or address. Suburb-only attribution.
        </p>
      </form>
    </div>
  );
}

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[
        { v: true, label: 'Yes' },
        { v: false, label: 'No' },
      ].map(({ v, label: lbl }) => {
        const selected = value === v;
        return (
          <button
            key={lbl}
            type="button"
            onClick={() => onChange(v)}
            style={{
              flex: 1,
              background: selected ? 'var(--terrapale)' : 'var(--cream)',
              border: `1px solid ${selected ? 'var(--terra)' : 'var(--cream3)'}`,
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 14,
              fontWeight: 700,
              color: selected ? 'var(--terra)' : 'var(--bark)',
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            {lbl}
          </button>
        );
      })}
    </div>
  );
}
