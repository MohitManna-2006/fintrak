import { NextRequest, NextResponse } from "next/server";

function hasAuthSessionCookie(req: NextRequest) {
  // Support both Auth.js v5 and older next-auth cookie names.
  return Boolean(
    req.cookies.get("__Secure-authjs.session-token")?.value ||
      req.cookies.get("authjs.session-token")?.value ||
      req.cookies.get("__Secure-next-auth.session-token")?.value ||
      req.cookies.get("next-auth.session-token")?.value
  );
}

export default function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const isAuthenticated = hasAuthSessionCookie(req);
  const isPublicRoute = nextUrl.pathname === "/login" || nextUrl.pathname.startsWith("/api/auth/");
  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");

  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (isDashboardRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
