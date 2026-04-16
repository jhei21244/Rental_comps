import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { input, result } = body;

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
    }
  } else {
    console.log('[dev] Submission received:', { input, result });
  }

  return NextResponse.json(result);
}
