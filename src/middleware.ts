import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/api/launch"];
const LAUNCH_PREFIX = "/launch";

// Routes sellers are allowed to access
const SELLER_ALLOWED_PATHS = [
  "/",              // dashboard
  "/lancamento",    // data entry
  "/api/entries/launch",
  "/api/clients",
  "/api/auth",
  "/api/dashboard", // all dashboard API endpoints
  "/api/kpis",      // for filters
  "/api/sellers",   // for filters
  "/api/units",     // for unit filter
];

// Routes sellers are NOT allowed (admin-only config pages)
const SELLER_BLOCKED_PATHS = [
  "/config",
  "/campaigns",
  "/history",
];

function isPublic(pathname: string): boolean {
  if (pathname.startsWith(LAUNCH_PREFIX)) return true;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function isSellerBlocked(pathname: string): boolean {
  return SELLER_BLOCKED_PATHS.some((p) => pathname.startsWith(p));
}

function isSellerAllowed(pathname: string): boolean {
  return SELLER_ALLOWED_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({ req: request });

  // Authenticated user on /login or /register -> redirect to dashboard
  if ((pathname === "/login" || pathname === "/register") && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Public routes -> allow
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Protected routes -> require token
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Seller role restrictions: block admin-only pages, allow dashboard + lancamento + APIs
  if (token.role === "SELLER") {
    if (isSellerBlocked(pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (!isSellerAllowed(pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
