import { cookies } from "next/headers";
import prisma from "@/lib/db";
import type { TenantContext } from "@/lib/tenant";
import { UnauthorizedError } from "@/lib/auth/errors";
import { verifyPassword } from "@/lib/auth/password";
import { signPayload, verifySignedPayload } from "@/lib/auth/token";

const COOKIE_NAME = "bo_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionData {
  businessId: string;
  userId: string;
  userName: string;
}

export async function createSession(data: SessionData): Promise<void> {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const token = signPayload(payload);
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
  const payload = verifySignedPayload(token);
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionData;
  } catch {
    return null;
  }
}

/** Requires a valid authenticated session — no fallback. */
export async function requireTenant(): Promise<TenantContext> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return { businessId: session.businessId, userId: session.userId };
}

/** For WhatsApp webhook only — uses DEFAULT_BUSINESS_ID. */
export async function getWebhookTenant(): Promise<TenantContext> {
  const businessId = process.env.DEFAULT_BUSINESS_ID;
  if (!businessId) {
    throw new Error("DEFAULT_BUSINESS_ID is required for WhatsApp webhook");
  }
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) {
    throw new Error("DEFAULT_BUSINESS_ID does not match any business");
  }
  return { businessId: business.id };
}

export async function loginWithCredentials(
  identifier: string,
  password: string
): Promise<SessionData | null> {
  const normalized = identifier.replace(/\s/g, "");
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: normalized },
        { phone: identifier },
        { email: normalized },
        { email: identifier },
      ],
    },
    include: { business: true },
  });

  if (!user?.passwordHash) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  return {
    businessId: user.businessId,
    userId: user.id,
    userName: user.name,
  };
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
