import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/db";
import type { TenantContext } from "@/lib/tenant";

const COOKIE_NAME = "bo_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionData {
  businessId: string;
  userId: string;
  userName: string;
}

function getSecret(): string {
  return process.env.SESSION_SECRET ?? "dev-session-secret-change-me";
}

function sign(payload: string): string {
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verify(token: string): string | null {
  const idx = token.lastIndexOf(".");
  if (idx === -1) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return payload;
}

export async function createSession(data: SessionData): Promise<void> {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const token = sign(payload);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionData | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verify(token);
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionData;
  } catch {
    return null;
  }
}

/** Resolve tenant from session, falling back to DEFAULT_BUSINESS_ID for webhooks */
export async function getTenant(): Promise<TenantContext> {
  const session = await getSession();
  if (session) {
    return { businessId: session.businessId, userId: session.userId };
  }

  const businessId = process.env.DEFAULT_BUSINESS_ID;
  if (businessId) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (business) return { businessId: business.id };
  }

  const business = await prisma.business.findFirst({ orderBy: { createdAt: "asc" } });
  if (!business) {
    throw new Error("No business found. Run npm run db:seed");
  }
  return { businessId: business.id };
}

export async function loginWithPhone(phone: string): Promise<SessionData | null> {
  const normalized = phone.replace(/\s/g, "");
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: normalized },
        { phone: phone },
        { email: normalized },
      ],
    },
    include: { business: true },
  });

  if (!user) return null;

  return {
    businessId: user.businessId,
    userId: user.id,
    userName: user.name,
  };
}
