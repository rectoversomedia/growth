import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('admin_session');

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    try {
      const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());

      if (session.exp < Date.now()) {
        return NextResponse.json({ authenticated: false, user: null, error: 'Session expired' }, { status: 401 });
      }

      return NextResponse.json({
        authenticated: true,
        user: {
          email: session.email,
          role: session.role,
          name: session.name,
        },
      });
    } catch {
      return NextResponse.json({ authenticated: false, user: null, error: 'Invalid session' }, { status: 401 });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
