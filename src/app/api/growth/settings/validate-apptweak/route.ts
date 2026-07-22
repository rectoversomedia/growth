import { NextRequest, NextResponse } from 'next/server';
import { createApptweakClient } from '@/lib/growth/apptweak/client';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['super_admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const apiKey = body.api_key;

    if (!apiKey) return NextResponse.json({ error: 'api_key is required' }, { status: 400 });

    // Test with temporary client
    const { ApptweakClient } = await import('@/lib/growth/apptweak/client');
    const testClient = new ApptweakClient(apiKey);
    const credits = await testClient.getCredits();

    return NextResponse.json({
      valid: true,
      credits: credits.credits,
      plan: credits.plan,
    });
  } catch (err: any) {
    return NextResponse.json({ valid: false, error: err.message ?? 'Invalid API key' }, { status: 400 });
  }
}
