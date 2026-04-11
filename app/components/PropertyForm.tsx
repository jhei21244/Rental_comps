'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { SUBURB_NAMES } from '@/lib/suburbs';
import { calculateRent, type PropertyInput, type ModelResult } from '@/lib/model';

type FormState = {
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
};

const defaultForm: FormState = {
  propertyType: 'Apartment',
  bedrooms: '2',
  bathrooms: '1',
  rentPw: 0,
  parking: 'None',
  airCon: 'None',
  transportWalk: 'Under 5 min',
  floorLevel: 'Ground',
  condition: 'Well maintained',
  petsAllowed: false,
  outdoorSpace: 'None',
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text2)',
  letterSpacing: '0.2px',
  marginBottom: 6,
};

export default function PropertyForm() {
  const [suburbInput, setSuburbInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [result, setResult] = useState<ModelResult | null>(null);
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const isSuburbValid = useMemo(
    () => SUBURB_NAMES.some((n) => n.toLowerCase() === suburbInput.toLowerCase()),
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

  useEffect(() => {
    if (result) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!suburbInput.trim()) {
      setError('Please enter a suburb.');
      return;
    }

    if (!isSuburbValid) {
      setError(
        `We don't have data for ${suburbInput} yet. Try Brunswick, Fitzroy, Richmond, or another inner Melbourne suburb.`
      );
      return;
    }

    if (!form.rentPw || form.rentPw < 80) {
      setError('Please enter a valid weekly rent (minimum $80).');
      return;
    }

    setIsCalculating(true);

    const input: PropertyInput = {
      suburb: suburbInput.trim(),
      propertyType: form.propertyType,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      rentPw: form.rentPw,
      parking: form.parking,
      airCon: form.airCon,
      transportWalk: form.transportWalk,
      floorLevel: form.floorLevel,
      condition: form.condition,
      petsAllowed: form.petsAllowed,
      outdoorSpace: form.outdoorSpace,
    };

    await new Promise((resolve) => setTimeout(resolve, 1200));

    try {
      const r = calculateRent(input);
      setResult(r);
      setEmailSubmitted(false);
      setEmailError('');
    } catch {
      setError('Unable to calculate rent for this suburb. Please try a different suburb.');
    } finally {
      setIsCalculating(false);
    }
  }

  async function handleEmailSubmit() {
    if (!email) return;
    setEmailError('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, suburb: result?.suburb }),
      });
      if (res.ok) {
        setEmailSubmitted(true);
      } else {
        setEmailError('Something went wrong. Please try again.');
      }
    } catch {
      setEmailError('Something went wrong. Please try again.');
    }
  }

  const verdictColor = result
    ? result.difference < 0
      ? 'var(--sage)'
      : result.difference <= 50
      ? 'var(--terra)'
      : '#b92c2c'
    : 'var(--bark)';

  const verdictBg = result
    ? result.difference < 0
      ? 'var(--sagepale)'
      : 'var(--terrapale)'
    : 'var(--cream)';

  const resultCardBg = result
    ? result.difference > 0
      ? 'rgba(196,80,26,0.04)'
      : 'rgba(61,107,79,0.04)'
    : 'transparent';

  const submitDisabled = !isSuburbValid || isCalculating;

  return (
    <div
      id="form"
      style={{
        background: 'white',
        border: '1px solid var(--cream3)',
        borderRadius: 16,
        padding: 32,
        boxShadow: '0 2px 20px rgba(42,24,16,0.06)',
      }}
    >
      <form onSubmit={handleSubmit} noValidate>
        {/* Section A */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--text3)',
            marginBottom: 16,
          }}
        >
          Section A — Location &amp; Basics
        </div>

        {/* Suburb autocomplete */}
        <div style={{ position: 'relative', marginBottom: 14 }} ref={dropdownRef}>
          <label style={label}>Suburb</label>
          <div style={{ position: 'relative' }}>
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
              style={
                isSuburbValid
                  ? {
                      borderColor: 'var(--sage)',
                      boxShadow: '0 0 0 3px rgba(61,107,79,0.1)',
                      paddingRight: 36,
                    }
                  : {}
              }
            />
            {isSuburbValid && (
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--sage)',
                  fontSize: 16,
                  fontWeight: 700,
                  pointerEvents: 'none',
                }}
              >
                ✓
              </span>
            )}
          </div>
          {showSuggestions && suggestions.length > 0 && (
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
                    transition: 'background 0.1s',
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

        {/* Type & bedrooms */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={label}>Property type</label>
            <select
              className="form-select"
              value={form.propertyType}
              onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
            >
              <option>Apartment</option>
              <option>House</option>
              <option>Townhouse</option>
            </select>
          </div>
          <div>
            <label style={label}>Bedrooms</label>
            <select
              className="form-select"
              value={form.bedrooms}
              onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
            >
              <option value="Studio">Studio</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4+">4+</option>
            </select>
          </div>
        </div>

        {/* Bathrooms */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>Bathrooms</label>
          <select
            className="form-select"
            value={form.bathrooms}
            onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3+">3+</option>
          </select>
        </div>

        {/* Section B */}
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
          Section B — Your Property
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text2)',
            marginBottom: 16,
            fontStyle: 'italic',
            fontWeight: 300,
          }}
        >
          This is where the precision comes from.
        </div>

        {/* Weekly rent */}
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Weekly rent (agreed, not advertised)</label>
          <div className="rent-wrap">
            <input
              type="number"
              className="form-input"
              value={form.rentPw === 0 ? '' : form.rentPw}
              onChange={(e) => setForm({ ...form, rentPw: parseInt(e.target.value) || 0 })}
              placeholder="560"
              min={80}
              max={5000}
            />
          </div>
        </div>

        {/* Parking & AC */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={label}>Parking</label>
            <select
              className="form-select"
              value={form.parking}
              onChange={(e) => setForm({ ...form, parking: e.target.value })}
            >
              <option>None</option>
              <option>Street</option>
              <option>Undercover</option>
              <option>Garage</option>
            </select>
          </div>
          <div>
            <label style={label}>Air conditioning</label>
            <select
              className="form-select"
              value={form.airCon}
              onChange={(e) => setForm({ ...form, airCon: e.target.value })}
            >
              <option>None</option>
              <option>One room</option>
              <option>Whole property</option>
            </select>
          </div>
        </div>

        {/* Transport & Floor */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={label}>Walk to tram/train</label>
            <select
              className="form-select"
              value={form.transportWalk}
              onChange={(e) => setForm({ ...form, transportWalk: e.target.value })}
            >
              <option>Under 5 min</option>
              <option value="5–10 min">5–10 min</option>
              <option value="10–15 min">10–15 min</option>
              <option>Over 15 min</option>
            </select>
          </div>
          <div>
            <label style={label}>Floor level</label>
            <select
              className="form-select"
              value={form.floorLevel}
              onChange={(e) => setForm({ ...form, floorLevel: e.target.value })}
            >
              <option>Ground</option>
              <option value="1–3">1–3</option>
              <option value="4+">4+</option>
              <option>N/A</option>
            </select>
          </div>
        </div>

        {/* Condition & Outdoor */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={label}>Property condition</label>
            <select
              className="form-select"
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
            >
              <option>Recently renovated</option>
              <option>Well maintained</option>
              <option>A bit dated</option>
              <option>Needs work</option>
            </select>
          </div>
          <div>
            <label style={label}>Outdoor space</label>
            <select
              className="form-select"
              value={form.outdoorSpace}
              onChange={(e) => setForm({ ...form, outdoorSpace: e.target.value })}
            >
              <option>None</option>
              <option>Small balcony</option>
              <option>Large balcony</option>
              <option value="Private courtyard/garden">Private courtyard/garden</option>
            </select>
          </div>
        </div>

        {/* Pets toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <label style={{ ...label, marginBottom: 0 }}>Pets allowed</label>
          <button
            type="button"
            role="switch"
            aria-checked={form.petsAllowed}
            onClick={() => setForm({ ...form, petsAllowed: !form.petsAllowed })}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              background: form.petsAllowed ? 'var(--terra)' : 'var(--cream3)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: form.petsAllowed ? 23 : 3,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </button>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>
            {form.petsAllowed ? 'Yes' : 'No'}
          </span>
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
          onMouseEnter={(e) => {
            if (!submitDisabled) e.currentTarget.style.background = 'var(--terra2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = submitDisabled ? 'var(--cream3)' : 'var(--terra)';
          }}
        >
          {isCalculating && <span className="spinner" />}
          {isCalculating ? 'Calculating…' : 'Assess this property →'}
        </button>
      </form>

      {/* Results */}
      {result && !isCalculating && (
        <div
          ref={resultRef}
          className="animate-rise"
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid var(--cream3)',
            background: resultCardBg,
            borderRadius: 12,
            padding: 16,
          }}
        >
          {/* Verdict */}
          <div
            style={{
              background: verdictBg,
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: verdictColor,
                fontFamily: 'var(--font-serif), Georgia, serif',
                marginBottom: 6,
              }}
            >
              {result.difference === 0
                ? 'Your rent is exactly at market rate'
                : result.difference < 0
                ? `Your rent is $${Math.abs(result.difference)}/week below market`
                : `Your rent is $${result.difference}/week above market`}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              Expected rent:{' '}
              <strong>${result.expectedRent}/week</strong> | Your rent:{' '}
              <strong>${result.actualRent}/week</strong>
            </div>
            {result.difference !== 0 && (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                {result.difference > 0
                  ? `Your rent is $${result.difference}/week above what this property would typically rent for in ${result.suburb}.`
                  : `You're paying $${Math.abs(result.difference)}/week less than the estimated market rate for this type of property in ${result.suburb}.`}
              </div>
            )}
          </div>

          {/* Breakdown table */}
          <div style={{ marginBottom: 16 }}>
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
              Attribute breakdown
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cream3)' }}>
                  {['Attribute', 'Your property', 'Est. contribution'].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        textAlign: i === 2 ? 'right' : 'left',
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--text3)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        padding: '8px 0',
                        paddingRight: i < 2 ? 10 : 0,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.breakdown.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--cream2)' }}>
                    <td style={{ padding: '14px 0', paddingRight: 10, fontSize: 13, color: 'var(--text2)' }}>
                      {row.attribute}
                    </td>
                    <td style={{ padding: '14px 0', paddingRight: 10, fontSize: 13, fontWeight: 600, color: 'var(--bark)' }}>
                      {row.value}
                    </td>
                    <td
                      style={{
                        padding: '14px 0',
                        fontSize: 13,
                        fontWeight: 700,
                        textAlign: 'right',
                        color:
                          i === 0
                            ? 'var(--bark)'
                            : row.contribution > 0
                            ? 'var(--terra)'
                            : row.contribution < 0
                            ? 'var(--sage)'
                            : 'var(--text3)',
                      }}
                    >
                      {i === 0
                        ? `$${row.contribution}/wk`
                        : row.contribution === 0
                        ? '—'
                        : `${row.contribution > 0 ? '+' : ''}$${row.contribution}/wk`}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--cream3)' }}>
                  <td
                    colSpan={2}
                    style={{ padding: '12px 0', paddingRight: 10, fontSize: 13, fontWeight: 700, color: 'var(--bark)' }}
                  >
                    Expected market rent
                  </td>
                  <td
                    style={{
                      padding: '12px 0',
                      fontSize: 15,
                      fontWeight: 700,
                      textAlign: 'right',
                      color: 'var(--bark)',
                      fontFamily: 'var(--font-serif), Georgia, serif',
                    }}
                  >
                    ${result.expectedRent}/wk
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Confidence note */}
          <div
            style={{
              background: 'var(--cream)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              color: 'var(--text2)',
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontWeight: 700,
                color:
                  result.confidence === 'High'
                    ? 'var(--sage)'
                    : result.confidence === 'Medium'
                    ? 'var(--terra)'
                    : 'var(--text3)',
              }}
            >
              {result.confidence} confidence
            </span>{' '}
            — based on {result.records.toLocaleString()} comparable properties in {result.suburb}
          </div>

          {/* Email capture */}
          {!emailSubmitted ? (
            <div
              style={{
                background: 'var(--terrapale)',
                border: '1px solid var(--terraborder)',
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--bark)', marginBottom: 4 }}>
                Stay informed about {result.suburb}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>
                We&apos;ll notify you when {result.suburb}&apos;s model improves and send a follow-up about your
                renewal.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{
                    flex: 1,
                    background: 'white',
                    border: '1px solid var(--cream3)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    color: 'var(--text)',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleEmailSubmit}
                  type="button"
                  style={{
                    background: 'var(--bark)',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 700,
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Notify me
                </button>
              </div>
              {emailError && (
                <div style={{ fontSize: 12, color: '#b92c2c', marginTop: 8 }}>{emailError}</div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                No marketing. No spam. Unsubscribe anytime.
              </div>
            </div>
          ) : (
            <div
              className="animate-rise"
              style={{
                background: 'var(--sagepale)',
                border: '1px solid rgba(61,107,79,0.25)',
                borderRadius: 10,
                padding: 16,
                fontSize: 13,
                color: 'var(--sage)',
                fontWeight: 700,
              }}
            >
              You&apos;re on the list. We&apos;ll be in touch when {result.suburb}&apos;s model updates.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
