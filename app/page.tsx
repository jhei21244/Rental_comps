import Link from 'next/link';
import PropertyForm from '@/app/components/PropertyForm';
import { SUBURBS } from '@/lib/suburbs';

export default function Home() {
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
        <div
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--bark)',
            letterSpacing: '-0.5px',
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
        </div>
        <ul style={{ display: 'flex', gap: 28, listStyle: 'none', margin: 0, padding: 0 }}>
          <li>
            <a href="#suburbs" style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none' }}>
              Suburb data
            </a>
          </li>
          <li>
            <a href="#how" style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none' }}>
              How it works
            </a>
          </li>
          <li>
            <Link href="/data" style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none' }}>
              Methodology
            </Link>
          </li>
        </ul>
      </nav>

      {/* Hero */}
      <div
        style={{
          padding: '80px 48px 0',
          maxWidth: 1100,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 64,
          alignItems: 'start',
        }}
      >
        {/* Left */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              color: 'var(--terra)',
              marginBottom: 16,
            }}
          >
            RENTAL INTELLIGENCE
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 'clamp(36px, 4.5vw, 58px)',
              lineHeight: 1.06,
              letterSpacing: '-1px',
              color: 'var(--bark)',
              marginBottom: 20,
            }}
          >
            Is your rent fair for{' '}
            <em style={{ color: 'var(--terra)', fontStyle: 'italic' }}>exactly</em> this property?
          </h1>
          <p
            style={{
              fontSize: 16,
              color: 'var(--text2)',
              lineHeight: 1.75,
              marginBottom: 36,
              maxWidth: 440,
              fontWeight: 300,
            }}
          >
            Domain gives you a suburb median. That's not an answer. Your place has parking, no AC,
            it's a 12-minute walk to the station. Every one of those details matters. FairRent prices
            them.
          </p>
          <div style={{ display: 'flex', gap: 32, marginBottom: 40, flexWrap: 'wrap' }}>
            {[
              { num: '486', label: 'listings analysed' },
              { num: '24', label: 'Melbourne suburbs' },
              { num: '14', label: 'attributes priced' },
            ].map(({ num, label }) => (
              <div key={label} style={{ borderLeft: '2px solid var(--terra)', paddingLeft: 14 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-serif), Georgia, serif',
                    fontSize: 28,
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
        </div>

        {/* Right — form */}
        <PropertyForm />
      </div>

      {/* Suburb table */}
      <div id="suburbs" style={{ maxWidth: 1100, margin: '80px auto 0', padding: '0 48px' }}>
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
        <h2
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 'clamp(26px, 3vw, 36px)',
            color: 'var(--bark)',
            marginBottom: 8,
            letterSpacing: '-0.5px',
          }}
        >
          Melbourne rental market snapshot
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text2)',
            marginBottom: 32,
            lineHeight: 1.7,
            maxWidth: 600,
            fontWeight: 300,
          }}
        >
          Live data from signed leases across Melbourne&apos;s inner suburbs. Updated quarterly.{' '}
          <Link
            href="/suburbs"
            style={{ color: 'var(--terra)', textDecoration: 'none', fontWeight: 700 }}
          >
            View all suburbs →
          </Link>
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="suburb-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[
                  'Suburb',
                  '2BR median',
                  'Market pressure',
                  'QoQ trend',
                  'Nego success %',
                  'Reports',
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
              {SUBURBS.map((suburb) => (
                <tr key={suburb.slug} style={{ borderBottom: '1px solid var(--cream2)' }}>
                  <td
                    style={{
                      padding: '13px 14px',
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--bark)',
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
                  <td style={{ padding: '13px 14px' }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{suburb.pressureLevel}</span>
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
                  <td style={{ padding: '13px 14px', fontSize: 12, color: 'var(--text3)' }}>
                    {suburb.n.toLocaleString()}
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <Link
                      href="/contribute"
                      style={{
                        fontSize: 12,
                        color: 'var(--terra)',
                        textDecoration: 'none',
                        fontWeight: 700,
                      }}
                    >
                      Contribute
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* How it works */}
      <div id="how" style={{ maxWidth: 1100, margin: '72px auto 0', padding: '0 48px' }}>
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
          HOW IT WORKS
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 'clamp(26px, 3vw, 36px)',
            color: 'var(--bark)',
            marginBottom: 8,
            letterSpacing: '-0.5px',
          }}
        >
          Three steps to an answer
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text2)',
            marginBottom: 32,
            lineHeight: 1.7,
            maxWidth: 600,
            fontWeight: 300,
          }}
        >
          No guesswork, no suburb-level averages. Precision pricing for your specific property.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
            paddingBottom: 80,
          }}
        >
          {[
            {
              num: '01',
              title: 'Enter your suburb and rent',
              body: 'Describe your property — suburb, size, and the weekly rent you agreed on. Takes about 90 seconds.',
              cta: null as { href: string; label: string } | null,
            },
            {
              num: '02',
              title: 'Get a precise answer',
              body: 'Our hedonic model prices each attribute individually. You get a dollar verdict showing exactly where your rent sits and why.',
              cta: null as { href: string; label: string } | null,
            },
            {
              num: '03',
              title: 'Report your outcome',
              body: 'Did you negotiate? Did the rent increase? Share your outcome anonymously and help the next renter in your suburb.',
              cta: { href: '/contribute', label: 'Report yours →' },
            },
          ].map(({ num, title, body, cta }) => (
            <div
              key={num}
              style={{
                background: 'white',
                border: '1px solid var(--cream3)',
                borderRadius: 16,
                padding: 32,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontSize: 40,
                  fontWeight: 900,
                  color: 'var(--terra)',
                  marginBottom: 12,
                  lineHeight: 1,
                }}
              >
                {num}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontSize: 17,
                  color: 'var(--bark)',
                  marginBottom: 8,
                }}
              >
                {title}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, fontWeight: 300 }}>
                {body}
              </p>
              {cta && (
                <Link
                  href={cta.href}
                  style={{
                    display: 'inline-block',
                    marginTop: 14,
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--terra)',
                    textDecoration: 'none',
                  }}
                >
                  {cta.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
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
        <div
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 18,
            fontWeight: 700,
            color: 'white',
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
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          Not financial advice. Data from self-reported signed leases. Melbourne, Australia.
        </p>
        <nav style={{ display: 'flex', gap: 20 }}>
          <Link
            href="/suburbs"
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
          >
            All suburbs
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
