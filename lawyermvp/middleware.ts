import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/admin/login"];

const ASSET_PATHS = ["/_next", "/favicon.ico"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

function isAssetPath(pathname: string) {
  return ASSET_PATHS.some((path) => pathname.startsWith(path));
}

export function middleware(request: NextRequest) {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!sessionSecret) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (isAssetPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api") && !isPublicPath(pathname)) {
    const cookieSession = request.cookies.get("admin_session")?.value;
    if (cookieSession === sessionSecret) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isPublicPath(pathname)) {
    const cookieSession = request.cookies.get("admin_session")?.value;
    if (cookieSession === sessionSecret && pathname === "/login") {
      const redirectUrl = new URL("/", request.url);
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  const cookieSession = request.cookies.get("admin_session")?.value;
  if (cookieSession === sessionSecret) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") {
    loginUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

