import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const role = request.cookies.get('condofortis-role')?.value
  const { pathname } = request.nextUrl

  const PROTECTED = ['/dashboard', '/portaria', '/morador']

  // Unauthenticated → login
  if (!role && PROTECTED.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (!role) return NextResponse.next()

  // DOORMAN → only portaria
  if (role === 'DOORMAN' && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/portaria', request.url))
  }
  if (role === 'DOORMAN' && pathname.startsWith('/morador')) {
    return NextResponse.redirect(new URL('/portaria', request.url))
  }

  // RESIDENT → only /morador
  if (role === 'RESIDENT' && (pathname.startsWith('/dashboard') || pathname.startsWith('/portaria'))) {
    return NextResponse.redirect(new URL('/morador', request.url))
  }

  // Management roles → block /morador (not needed for them)
  if (['SUPER_ADMIN', 'ADMIN', 'SYNDIC'].includes(role) && pathname.startsWith('/morador')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/portaria/:path*', '/morador/:path*'],
}
