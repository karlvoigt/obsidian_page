import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from './lib/auth-session';
import visibilityMap from './lib/visibility-map.json';

const PUBLIC_SYSTEM_ROUTES = ['login', 'signup', 'unauthorized'];
const ADMIN_SYSTEM_ROUTES = ['admin'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Normalize slug: remove leading slash, handle trailing slash, default empty to 'home'
  let slug = pathname.slice(1);
  if (slug.endsWith('/')) {
    slug = slug.slice(0, -1);
  }
  if (!slug) {
    slug = 'home';
  }

  // 1. Check if it's a public system route
  if (PUBLIC_SYSTEM_ROUTES.some(route => slug === route || slug.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Get session token cookie
  const sessionCookie = request.cookies.get('session-token');
  const token = sessionCookie?.value;

  // Verify token if it exists
  const payload = token ? await verifySessionToken(token) : null;

  // 2. Check if it's an admin system route
  if (ADMIN_SYSTEM_ROUTES.some(route => slug === route || slug.startsWith(route + '/'))) {
    if (!payload) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    if (payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    return NextResponse.next();
  }

  // 3. Resolve visibility from the prebuilt visibility map
  // Default to "authenticated" if not found in the map as requested by the user
  const visibility = (visibilityMap as Record<string, string>)[slug] || 'authenticated';

  if (visibility === 'public') {
    return NextResponse.next();
  }

  // Page requires authentication
  if (!payload) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Page requires admin privileges
  if (visibility === 'admin' && payload.role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // User is authenticated and meets visibility requirements
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - md_assets, assets, attachments or any file containing a dot (static files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|md_assets|assets|attachments|.*\\..*).*)',
  ],
};
