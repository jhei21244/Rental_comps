import type { Metadata } from 'next';
import Link from 'next/link';
import { SUBURBS } from '@/lib/suburbs';

export const metadata: Metadata = {
  title: 'Suburb Data — FairRent',
  description:
    'Rental market data for Melbourne suburbs: 2BR medians, market pressure, negotiation success rates, and quarter-on-quarter trends.',
};

export default function SuburbsPage() {
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
            <Link href="/data" style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none' }}>
              Methodology
            </Link>
          </li>
        </ul>
      </nav>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 48px 80px' }}>
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
          SUBURB DATA
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 'clamp(30px, 4vw, 46px)',
            color: 'var(--bark)',
            marginBottom: 8,
            letterSpacing: '-1px',
            lineHeight: 1.1,
          }}
        >
          Melbourne rental market data
        </h1>
        <p
          style={{
            fontSize: 15,
            color: 'var(--text2)',
            marginBottom: 40,
            lineHeight: 1.75,
            maxWidth: 620,
            fontWeight: 300,
          }}
        >
          Aggregated from self-reported signed leases across Melbourne&apos;s inner suburbs. All medians
          are for 2-bedroom properties. Negotiation success rate reflects the proportion of renters who
          successfully reduced the asking rent before signing.
        </p>

        {/* Stats bar */}
        <div
          style={{
            display: 'flex',
            gap: 32,
            marginBottom: 48,
            padding: '20px 24px',
            background: 'white',
            border: '1px solid var(--cream3)',
            borderRadius: 12,
            flexWrap: 'wrap',
          }}
        >
          {[
            { num: SUBURBS.length.toString(), label: 'suburbs tracked' },
            {
              num: SUBURBS.reduce((s, x) => s + x.n, 0).toLocaleString(),
              label: 'leases in dataset',
            },
            {
              num:
                '$' +
                Math.round(SUBURBS.reduce((s, x) => s + x.negoAmtPw, 0) / SUBURBS.length) +
                '/wk',
              label: 'average negotiation saving',
            },
            {
              num:
                Math.round(SUBURBS.reduce((s, x) => s + x.negoPercent, 0) / SUBURBS.length) + '%',
              label: 'renters who negotiate',
            },
          ].map(({ num, label }) => (
            <div key={label} style={{ borderLeft: '2px solid var(--terra)', paddingLeft: 14 }}>
              <div
                style={{
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontSize: 24,
                  color: 'var(--bark)',
                  lineHeight: 1,
                }}
              >
                {num}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Full table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="suburb-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[
                  'Suburb',
                  '2BR median',
                  '10th pct',
                  '90th pct',
                  'Market pressure',
                  'QoQ trend',
                  'Nego success %',
                  'Avg saving',
                  'Records',
                  '',
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--cream3)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SUBURBS.sort((a, b) => b.median2br - a.median2br).map((suburb) => (
                <tr key={suburb.slug} style={{ borderBottom: '1px solid var(--cream2)' }}>
                  <td
                    style={{
                      padding: '13px 14px',
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--bark)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {suburb.name}
                  </td>
                  <td
                    style={{
                      padding: '13px 14px',
                      fontFamily: 'var(--font-serif), Georgia, serif',
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--bark)',
                    }}
                  >
                    ${suburb.median2br}/wk
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: 13, color: 'var(--text3)' }}>
                    ${suburb.p10}
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: 13, color: 'var(--text3)' }}>
                    ${suburb.p90}
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {suburb.pressureLevel}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        gap: 3,
                        marginLeft: 6,
                        verticalAlign: 'middle',
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((d) => (
                        <span
                          key={d}
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background:
                              d <= suburb.pressureDots ? 'var(--terra)' : 'var(--cream3)',
                            display: 'inline-block',
                          }}
                        />
                      ))}
                    </span>
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background:
                          suburb.trendDir === 'up'
                            ? 'rgba(196,80,26,0.1)'
                            : suburb.trendDir === 'down'
                            ? 'var(--sagepale)'
                            : 'var(--cream2)',
                        color:
                          suburb.trendDir === 'up'
                            ? 'var(--terra)'
                            : suburb.trendDir === 'down'
                            ? 'var(--sage)'
                            : 'var(--text3)',
                      }}
                    >
                      {suburb.trendDir === 'up' ? '↑' : suburb.trendDir === 'down' ? '↓' : '→'}{' '}
                      {suburb.qoqTrend > 0 ? '+' : ''}
                      {suburb.qoqTrend}%
                    </span>
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: 14, color: 'var(--text2)' }}>
                    {suburb.negoPercent}%
                  </td>
                  <td
                    style={{
                      padding: '13px 14px',
                      fontSize: 13,
                      color: 'var(--sage)',
                      fontWeight: 700,
                    }}
                  >
                    −${suburb.negoAmtPw}/wk
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: 12, color: 'var(--text3)' }}>
                    {suburb.n.toLocaleString()}
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <a
                      href="#"
                      style={{
                        fontSize: 12,
                        color: 'var(--terra)',
                        textDecoration: 'none',
                        fontWeight: 700,
                      }}
                    >
                      Contribute
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: 32,
            padding: '16px 20px',
            background: 'var(--cream2)',
            borderRadius: 10,
            fontSize: 12,
            color: 'var(--text3)',
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: 'var(--text2)' }}>Notes:</strong> All figures are for 2-bedroom
          properties. The 10th and 90th percentiles show the spread of rents in each suburb. Negotiation
          success % is the share of contributors who paid less than the advertised asking rent. Data is
          self-reported and should be used as a guide only.
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
            href="/data"
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
          >
            Methodology
          </Link>
        </nav>
      </footer>
    </>
  );
}
