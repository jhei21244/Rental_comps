import type { Metadata } from 'next';
import Link from 'next/link';
import OutcomeForm from '@/app/components/OutcomeForm';

export const metadata: Metadata = {
  title: 'Report your outcome — FairRent',
  description:
    'Tell us what happened with your rent — new lease, renewal, or move-out — and help the next renter in your suburb.',
};

export default function ContributePage() {
  return (
    <>
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
          <li>
            <Link
              href="/data"
              style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none' }}
            >
              Methodology
            </Link>
          </li>
        </ul>
      </nav>

      <main
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '56px 48px 80px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 64,
          alignItems: 'start',
        }}
      >
        <div>
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
            REPORT YOUR OUTCOME
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 'clamp(32px, 4vw, 48px)',
              lineHeight: 1.08,
              letterSpacing: '-1px',
              color: 'var(--bark)',
              marginBottom: 18,
            }}
          >
            What happened with your rent?
          </h1>
          <p
            style={{
              fontSize: 16,
              color: 'var(--text2)',
              lineHeight: 1.7,
              marginBottom: 24,
              maxWidth: 460,
              fontWeight: 300,
            }}
          >
            Whether you signed a new lease, renewed an existing one, or moved out instead — a
            two-minute report builds the dataset that makes the next renter’s answer more
            accurate.
          </p>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 14,
              fontSize: 14,
              color: 'var(--text2)',
              lineHeight: 1.6,
              maxWidth: 460,
            }}
          >
            <li style={{ paddingLeft: 18, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: 'var(--terra)', fontWeight: 700 }}>
                ·
              </span>
              No name, no address, no email.
            </li>
            <li style={{ paddingLeft: 18, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: 'var(--terra)', fontWeight: 700 }}>
                ·
              </span>
              Suburb-level attribution only — and it’s optional.
            </li>
            <li style={{ paddingLeft: 18, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: 'var(--terra)', fontWeight: 700 }}>
                ·
              </span>
              We use it to refine suburb baselines and the negotiation success rate.
            </li>
          </ul>
        </div>

        <OutcomeForm />
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
