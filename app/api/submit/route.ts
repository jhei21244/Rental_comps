import { NextRequest, NextResponse } from 'next/server';
import { isSameOrigin, validateSubmission } from '@/lib/api';

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

  const payload = (body && typeof body === 'object' ? (body as Record<string, unknown>).input : undefined);
  const validation = validateSubmission(payload);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }
  const input = validation.value;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.from('submissions').insert({
      suburb: input.suburb,
      property_type: input.propertyType,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      agreed_rent_pw: input.rentPw,
      parking: input.parking,
      air_con: input.airCon,
      transport_walk_mins: input.transportWalk,
      outdoor_space: input.outdoorSpace,
      internal_laundry: input.internalLaundry,
      furnished: input.furnished === 'Furnished',
      condition: input.condition,
      source: 'web',
    });
    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ ok: false, error: 'Failed to save' }, { status: 500 });
    }
  } else {
    console.log('[dev] Submission received:', input);
  }

  return NextResponse.json({ ok: true });
}
