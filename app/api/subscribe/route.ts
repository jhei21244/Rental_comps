import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { isSameOrigin, isValidEmail } from '@/lib/api';
import { SUBURB_NAMES } from '@/lib/suburbs';

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, suburb } = (body && typeof body === 'object'
    ? (body as Record<string, unknown>)
    : {}) as { email?: unknown; suburb?: unknown };

  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 });
  }

  let normalisedSuburb: string | null = null;
  if (typeof suburb === 'string' && suburb.length > 0) {
    const match = SUBURB_NAMES.find((n) => n.toLowerCase() === suburb.toLowerCase());
    if (!match) {
      return NextResponse.json({ ok: false, error: 'Unknown suburb' }, { status: 400 });
    }
    normalisedSuburb = match;
  }

  const emailHash = createHash('sha256').update(email.toLowerCase().trim()).digest('hex');

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.from('subscriptions').insert({
      email_hash: emailHash,
      suburb: normalisedSuburb,
    });
    if (error) {
      console.error('Supabase subscribe error:', error);
      return NextResponse.json({ ok: false, error: 'Failed to subscribe' }, { status: 500 });
    }
  } else {
    console.log('[dev] Subscription received:', { emailHash, suburb: normalisedSuburb });
  }

  return NextResponse.json({ ok: true });
}
