import type { Metadata } from 'next';
import Link from 'next/link';
import { ATTRIBUTE_WEIGHTS } from '@/lib/model';

export const metadata: Metadata = {
  title: 'Methodology — FairRent',
  description:
    'How FairRent uses hedonic pricing to assess whether your specific rental property is fairly priced.',
};

const W = ATTRIBUTE_WEIGHTS;
const fmt = (v: number) => (v === 0 ? '—' : `${v > 0 ? '+' : '−'}$${Math.abs(v)}/wk`);
const ATTRIBUTE_ROWS: Array<{ attr: string; val: string; contrib: string }> = [
  { attr: 'Parking', val: 'None', contrib: '—' },
  { attr: 'Parking', val: 'Street', contrib: fmt(W.parking_street) },
  { attr: 'Parking', val: 'Undercover', contrib: fmt(W.parking_undercover) },
  { attr: 'Parking', val: 'Lock-up garage', contrib: fmt(W.parking_lockup_garage) },
  { attr: 'Air conditioning', val: 'None', contrib: '—' },
  { attr: 'Air conditioning', val: 'One room', contrib: fmt(W.aircon_one_room) },
  { attr: 'Air conditioning', val: 'Whole property', contrib: fmt(W.aircon_whole) },
  { attr: 'Walk to transit', val: 'Under 5 min', contrib: fmt(W.transport_lt5) },
  { attr: 'Walk to transit', val: '5–10 min', contrib: fmt(W.transport_5_10) },
  { attr: 'Walk to transit', val: '10–15 min', contrib: fmt(W.transport_10_15) },
  { attr: 'Walk to transit', val: 'Over 15 min', contrib: '—' },
  { attr: 'Condition', val: 'New build', contrib: fmt(W.condition_new_build) },
  { attr: 'Condition', val: 'Recently renovated', contrib: fmt(W.condition_renovated) },
  { attr: 'Condition', val: 'Well maintained', contrib: '—' },
  { attr: 'Condition', val: 'A bit dated', contrib: fmt(W.condition_dated) },
  { attr: 'Condition', val: 'Needs work', contrib: fmt(W.condition_poor) },
  { attr: 'Outdoor space', val: 'None', contrib: '—' },
  { attr: 'Outdoor space', val: 'Balcony', contrib: fmt(W.outdoor_balcony) },
  { attr: 'Outdoor space', val: 'Courtyard or garden', contrib: fmt(W.outdoor_courtyard_garden) },
  { attr: 'Internal laundry', val: 'Yes', contrib: fmt(W.internal_laundry) },
  { attr: 'Furnished', val: 'Furnished', contrib: fmt(W.furnished) },
];

export default function DataPage() {
  return (
    <>
      {/* Nav */}
      <nav
        style={{
          background: 'var(--cream)',
          borderBottom: '1px solid var(--cream3)',
          padding: '0 48px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--bark)',
            letterSpacing: '-0.5px',
            textDecoration: 'none',
          }}
        >
          FairRent
          <sup
            style={{
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--terra)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              verticalAlign: 'super',
              marginLeft: 3,
            }}
          >
            AU
          </sup>
        </Link>
        <ul style={{ display: 'flex', gap: 28, listStyle: 'none', margin: 0, padding: 0 }}>
          <li>
            <Link href="/" style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none' }}>
              ← Check my rent
            </Link>
          </li>
          <li>
            <Link
              href="/suburbs"
              style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none' }}
            >
              Suburb data
            </Link>
          </li>
        </ul>
      </nav>

      <main style={{ maxWidth: 740, margin: '0 auto', padding: '56px 48px 80px' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '2.5px',
            textTransform: 'uppercase',
            color: 'var(--terra)',
            marginBottom: 14,
          }}
        >
          METHODOLOGY
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 'clamp(30px, 4vw, 46px)',
            color: 'var(--bark)',
            marginBottom: 20,
            letterSpacing: '-1px',
            lineHeight: 1.1,
          }}
        >
          How FairRent prices your property
        </h1>
        <p
          style={{
            fontSize: 16,
            color: 'var(--text2)',
            lineHeight: 1.8,
            marginBottom: 48,
            fontWeight: 300,
          }}
        >
          Suburb medians hide more than they reveal. A 2-bedroom apartment on the ground floor with no
          parking and no air conditioning is not the same property as one on the 5th floor with undercover
          parking and ducted cooling — even if they're in the same street. FairRent prices that difference.
        </p>

        {/* Section: What is hedonic pricing */}
        <section style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 24,
              color: 'var(--bark)',
              marginBottom: 16,
              letterSpacing: '-0.5px',
            }}
          >
            What is hedonic pricing?
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16 }}>
            Hedonic pricing is a method economists use to estimate the value of individual
            characteristics that make up a product. In housing, it works by treating rent as the sum of
            payments for each observable attribute: location, size, parking, condition, and so on.
          </p>
          <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16 }}>
            Rather than asking &ldquo;what is the average rent in Brunswick?&rdquo; — which tells you nothing
            about your specific flat — hedonic pricing asks &ldquo;how much does undercover parking add to
            rent in Brunswick?&rdquo; and &ldquo;how much less do ground-floor properties rent for?&rdquo;
          </p>
          <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8 }}>
            It&apos;s the same method used by the ABS to track house price quality adjustments, and by
            commercial appraisers to strip out renovation premiums. We&apos;ve adapted it for the Melbourne
            rental market using self-reported lease data.
          </p>
        </section>

        {/* Section: How the model works */}
        <section style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 24,
              color: 'var(--bark)',
              marginBottom: 16,
              letterSpacing: '-0.5px',
            }}
          >
            How the model works
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16 }}>
            For each suburb we calibrate a baseline: the expected weekly rent for a standard 2-bedroom
            apartment with median attributes. We then estimate the marginal contribution of each
            attribute — parking, air conditioning, transit access, floor level, condition, outdoor space,
            and pet policy — by comparing signed rents across properties that differ only in that one
            feature.
          </p>
          <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16 }}>
            Your expected rent is calculated as:
          </p>
          <div
            style={{
              background: 'white',
              border: '1px solid var(--cream3)',
              borderRadius: 12,
              padding: '20px 24px',
              marginBottom: 16,
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 15,
              color: 'var(--bark)',
              lineHeight: 1.9,
            }}
          >
            Expected rent = Suburb baseline<br />
            &nbsp;&nbsp;+ bedroom adjustment<br />
            &nbsp;&nbsp;+ property type adjustment<br />
            &nbsp;&nbsp;+ bathroom adjustment<br />
            &nbsp;&nbsp;+ parking premium<br />
            &nbsp;&nbsp;+ air conditioning premium<br />
            &nbsp;&nbsp;+ transit access premium<br />
            &nbsp;&nbsp;+ floor level premium<br />
            &nbsp;&nbsp;+ condition adjustment<br />
            &nbsp;&nbsp;+ pets premium<br />
            &nbsp;&nbsp;+ outdoor space premium
          </div>
          <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8 }}>
            The difference between your expected rent and your actual rent is the verdict. A positive
            number means you&apos;re paying above what this property&apos;s attributes would typically command.
          </p>
        </section>

        {/* Section: Attribute weights */}
        <section style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 24,
              color: 'var(--bark)',
              marginBottom: 16,
              letterSpacing: '-0.5px',
            }}
          >
            Current attribute estimates
          </h2>
          <p
            style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 24 }}
          >
            Our current model uses Melbourne-wide attribute weights as initial priors. As each suburb
            accumulates more data, we&apos;ll publish suburb-specific weights — you can track progress in
            the suburb table.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cream3)' }}>
                {['Attribute', 'Value', 'Contribution'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      textAlign: i === 2 ? 'right' : 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      padding: '8px 0',
                      paddingRight: i < 2 ? 16 : 0,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ATTRIBUTE_ROWS.map((row, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: '1px solid var(--cream2)' }}
                >
                  <td style={{ padding: '9px 0', paddingRight: 16, fontSize: 13, color: 'var(--text2)' }}>
                    {row.attr}
                  </td>
                  <td style={{ padding: '9px 0', paddingRight: 16, fontSize: 13, fontWeight: 600, color: 'var(--bark)' }}>
                    {row.val}
                  </td>
                  <td
                    style={{
                      padding: '9px 0',
                      fontSize: 13,
                      fontWeight: 700,
                      textAlign: 'right',
                      color: row.contrib.startsWith('+')
                        ? 'var(--terra)'
                        : row.contrib.startsWith('−')
                        ? 'var(--sage)'
                        : 'var(--text3)',
                    }}
                  >
                    {row.contrib}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Section: What's collected */}
        <section style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 24,
              color: 'var(--bark)',
              marginBottom: 16,
              letterSpacing: '-0.5px',
            }}
          >
            What data is collected?
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16 }}>
            When a renter contributes their lease, we collect: suburb, property type, number of
            bedrooms and bathrooms, the agreed weekly rent (not the advertised price), and the property
            attributes listed in the form above.
          </p>
          <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16 }}>
            If an email address is provided, it is hashed before storage. We never store raw email
            addresses, and we never sell or share data with third parties. Follow-up emails are sent only
            to ask about renewal outcomes — what happened when the lease came up, whether rent increased,
            and whether the renter negotiated.
          </p>
          <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8 }}>
            All data is self-reported. We do not verify individual submissions. Outliers and implausible
            values are excluded from model calibration but preserved in aggregate counts.
          </p>
        </section>

        {/* Section: Confidence levels */}
        <section style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 24,
              color: 'var(--bark)',
              marginBottom: 16,
              letterSpacing: '-0.5px',
            }}
          >
            Confidence levels
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 20 }}>
            Every result is tagged with a confidence level based on the number of comparable signed
            leases in the suburb.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              {
                level: 'High confidence',
                color: 'var(--sage)',
                bg: 'var(--sagepale)',
                desc: '200+ records in the suburb. Attribute weights are well-calibrated. Accuracy within ±$25/week in most cases.',
              },
              {
                level: 'Medium confidence',
                color: 'var(--terra)',
                bg: 'var(--terrapale)',
                desc: '50–199 records. Weights are directionally correct but may have wider error bands, especially for less common attributes.',
              },
              {
                level: 'Low confidence',
                color: 'var(--text3)',
                bg: 'var(--cream2)',
                desc: 'Fewer than 50 records. Results should be treated as indicative only. We still show a figure but encourage cross-referencing with neighbouring suburbs.',
              },
            ].map(({ level, color, bg, desc }) => (
              <div
                key={level}
                style={{
                  background: bg,
                  borderRadius: 10,
                  padding: '14px 18px',
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color,
                    whiteSpace: 'nowrap',
                    paddingTop: 1,
                    minWidth: 130,
                  }}
                >
                  {level}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Section: Accuracy */}
        <section style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 24,
              color: 'var(--bark)',
              marginBottom: 16,
              letterSpacing: '-0.5px',
            }}
          >
            Accuracy and limitations
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16 }}>
            Back-testing against held-out lease data suggests a mean absolute error of ±$31/week for
            High confidence suburbs, ±$48/week for Medium confidence. These figures will improve as
            the dataset grows.
          </p>
          <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16 }}>
            Important limitations to keep in mind:
          </p>
          <ul
            style={{
              fontSize: 15,
              color: 'var(--text2)',
              lineHeight: 2,
              paddingLeft: 24,
              marginBottom: 16,
            }}
          >
            <li>
              The model doesn&apos;t capture street-level variation within a suburb. A property on a busy
              arterial road vs a quiet residential street will have different market rents.
            </li>
            <li>
              Property size beyond bedroom count isn&apos;t captured. A large 2-bedroom apartment will
              outperform our estimate for a small one.
            </li>
            <li>
              The model reflects current market conditions. In a fast-moving market, estimates based on
              older leases may lag the current market.
            </li>
            <li>
              This is not financial or legal advice. Use as one input in your assessment, alongside
              your own market research.
            </li>
          </ul>
        </section>

        <div
          style={{
            background: 'white',
            border: '1px solid var(--cream3)',
            borderRadius: 12,
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-serif), Georgia, serif',
                fontSize: 18,
                color: 'var(--bark)',
                marginBottom: 4,
              }}
            >
              Ready to check your rent?
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              Takes 90 seconds. No account required.
            </div>
          </div>
          <Link
            href="/"
            style={{
              background: 'var(--terra)',
              color: 'white',
              fontSize: 14,
              fontWeight: 700,
              padding: '12px 24px',
              borderRadius: 10,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Assess my property →
          </Link>
        </div>
      </main>

      <footer
        style={{
          background: 'var(--bark)',
          padding: '40px 48px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 18,
            fontWeight: 700,
            color: 'white',
            textDecoration: 'none',
          }}
        >
          FairRent
          <sup
            style={{
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              fontSize: 8,
              fontWeight: 700,
              color: 'var(--terra3)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              verticalAlign: 'super',
              marginLeft: 3,
            }}
          >
            AU
          </sup>
        </Link>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          Not financial advice. Data from self-reported signed leases. Melbourne, Australia.
        </p>
        <nav style={{ display: 'flex', gap: 20 }}>
          <Link href="/" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
            Check my rent
          </Link>
          <Link
            href="/suburbs"
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
          >
            All suburbs
          </Link>
        </nav>
      </footer>
    </>
  );
}
