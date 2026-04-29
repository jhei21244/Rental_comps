import { NextRequest, NextResponse } from 'next/server';
import { isSameOrigin, validateOutcome } from '@/lib/api';

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

  const validation = validateOutcome(body);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }
  const v = validation.value;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.from('outcomes').insert({
      submission_id: v.submissionId,
      outcome_type: v.outcomeType,
      renewal_increase_pw: v.renewalIncreasePw,
      negotiated: v.negotiated,
      negotiation_success: v.negotiationSuccess,
      final_rent_pw: v.finalRentPw,
    });
    if (error) {
      console.error('Supabase outcomes insert error:', error);
      return NextResponse.json({ ok: false, error: 'Failed to save' }, { status: 500 });
    }
  } else {
    console.log('[dev] Outcome received:', v);
  }

  return NextResponse.json({ ok: true });
}
