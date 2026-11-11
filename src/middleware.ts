import { NextResponse, type NextRequest } from "next/server";

/** HTTP-level gate: protected pages require a session cookie (validated again server-side). */
const PROTECTED = ["/dashboard", "/resume", "/tracker", "/coach", "/assessments", "/settings", "/admin", "/onboarding"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/")) && !req.cookies.get("ep_session")) {
    const url = req.nextUrl.clone(); url.pathname = "/login"; url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
