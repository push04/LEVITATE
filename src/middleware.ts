import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl;

  // Check for subdomain (not www, not main domain)
  if (hostname !== 'levitatelabs.online' && hostname !== 'www.levitatelabs.online' && hostname.includes('levitatelabs.online')) {
    const subdomain = hostname.split('.')[0];
    url.pathname = `/${subdomain}${url.pathname}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}
export const config = { matcher: '/:path*' };
