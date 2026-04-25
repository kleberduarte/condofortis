import { NextRequest, NextResponse } from 'next/server'

const DOORMAN_ROLES = ['DOORMAN']
const MANAGEMENT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SYNDIC']

export function middleware(request: NextRequest) {
  const role = request.cookies.get('condofortis-role')?.value
  const { pathname } = request.nextUrl

  // Unauthenticated: redirect protected routes to login
  if (!role) {
    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/portaria')
    ) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // DOORMAN blocked from dashboard → portaria
  if (DOORMAN_ROLES.includes(role) && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/portaria', request.url))
  }

  // RESIDENT has no web app — redirect to login
  if (
    role === 'RESIDENT' &&
    (pathname.startsWith('/dashboard') || pathname.startsWith('/portaria'))
  ) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Management allowed in both dashboard and portaria (admin can check portaria)
  // DOORMAN allowed in portaria only (already handled above)

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/portaria/:path*'],
}
