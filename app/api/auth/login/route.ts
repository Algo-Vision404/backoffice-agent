import { NextRequest, NextResponse } from "next/server";
import { createSession, loginWithCredentials } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Retry in ${limit.retryAfterSec}s.` },
      { status: 429 }
    );
  }

  const { phone, password } = await req.json();
  if (!phone || !password) {
    return NextResponse.json({ error: "Phone/email and password are required" }, { status: 400 });
  }

  const session = await loginWithCredentials(phone, password);
  if (!session) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createSession(session);
  return NextResponse.json({ success: true, user: { userName: session.userName } });
}
