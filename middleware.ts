import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySignedPayloadEdge } from "@/lib/auth/token-edge";

const SESSION_COOKIE_NAME = "bo_session";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/whatsapp/webhook",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return true;
  }
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return true;
  }
  return false;
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  const payload = await verifySignedPayloadEdge(token);
  return payload !== null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Customer invoice links — token verified in route handler
  const isPublicInvoiceView =
    pathname.match(/^\/api\/invoices\/[^/]+$/) &&
    request.nextUrl.searchParams.get("format") === "html";

  if (isPublicInvoiceView) {
    return NextResponse.next();
  }

  const valid = await hasValidSession(request);

  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
