import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, suburb } = body as { email: string; suburb: string };

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 });
  }

  const emailHash = createHash('sha256').update(email.toLowerCase().trim()).digest('hex');

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.from('subscriptions').insert({
      email_hash: emailHash,
      suburb,
    });
    if (error) {
      console.error('Supabase subscribe error:', error);
      return NextResponse.json({ ok: false, error: 'Failed to subscribe' }, { status: 500 });
    }
  } else {
    console.log('[dev] Subscription received:', { emailHash, suburb });
  }

  return NextResponse.json({ ok: true });
}
