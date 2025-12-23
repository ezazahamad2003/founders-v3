import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets / Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml")
  ) {
    return NextResponse.next();
  }

  // Allow login page and admin auth endpoints
  if (pathname === "/login" || pathname.startsWith("/api/admin/")) {
    return NextResponse.next();
  }

  // Everything else requires admin session cookie
  const secret = process.env.ADMIN_PASSWORD || process.env.ADMIN_SESSION_SECRET;
  const sessionCookie = request.cookies.get("admin_session")?.value;

  if (!secret || sessionCookie !== secret) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protect all routes (pages + API) except:
     * - next internals/assets (handled above)
     * - /login
     * - /api/admin/*
     */
    "/((?!_next/static|_next/image).*)",
  ],
};

