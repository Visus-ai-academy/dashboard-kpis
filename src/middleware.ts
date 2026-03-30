import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth"];
const LAUNCH_PREFIX = "/launch";

function isPublic(pathname: string): boolean {
  if (pathname.startsWith(LAUNCH_PREFIX)) return true;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({ req: request });

  // Authenticated user on /login -> redirect to dashboard
  if (pathname === "/login" && token) {
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
