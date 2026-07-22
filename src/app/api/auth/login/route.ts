import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ADMIN_CREDENTIALS = [
  { email: 'admin@rectoverso.id', password: 'Admin123!', role: 'super_admin', name: 'Super Admin' },
  { email: 'manager@rectoverso.id', password: 'Manager123!', role: 'campaign_manager', name: 'Campaign Manager' },
  { email: 'viewer@rectoverso.id', password: 'Viewer123!', role: 'client_viewer', name: 'Client Viewer' },
];

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const admin = ADMIN_CREDENTIALS.find(
      (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password
    );

    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionToken = Buffer.from(JSON.stringify({
      email: admin.email,
      role: admin.role,
      name: admin.name,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })).toString('base64');

    const response = NextResponse.json({
      success: true,
      user: { email: admin.email, role: admin.role, name: admin.name },
    });

    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
