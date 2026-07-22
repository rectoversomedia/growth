import { cookies } from 'next/headers';
import type { Session, UserRole } from '@/types/growth/app';

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('admin_session');

  if (!sessionCookie) return null;

  try {
    const session: Session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    if (session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireRole(roles: UserRole[]): Promise<Session> {
  const session = await requireAuth();
  if (!roles.includes(session.role)) {
    throw new Error('Forbidden');
  }
  return session;
}
