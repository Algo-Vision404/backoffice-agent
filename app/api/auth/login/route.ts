import { NextRequest, NextResponse } from "next/server";
import { createSession, loginWithPhone } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone) {
    return NextResponse.json({ error: "Phone or email is required" }, { status: 400 });
  }

  const session = await loginWithPhone(phone);
  if (!session) {
    return NextResponse.json({ error: "No account found for this phone/email" }, { status: 401 });
  }

  await createSession(session);
  return NextResponse.json({ success: true, user: session });
}
