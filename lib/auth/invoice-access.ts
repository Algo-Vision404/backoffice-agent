import { signPayload, verifySignedPayload } from "@/lib/auth/token";

const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export function createInvoiceAccessToken(invoiceId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ invoiceId, exp: Date.now() + MAX_AGE_MS })
  ).toString("base64url");
  return signPayload(payload);
}

export function verifyInvoiceAccessToken(invoiceId: string, token: string): boolean {
  const raw = verifySignedPayload(token);
  if (!raw) return false;
  try {
    const data = JSON.parse(Buffer.from(raw, "base64url").toString()) as {
      invoiceId: string;
      exp: number;
    };
    return data.invoiceId === invoiceId && data.exp > Date.now();
  } catch {
    return false;
  }
}

export function invoiceViewUrl(invoiceId: string, baseUrl?: string): string {
  const root = baseUrl ?? process.env.APP_URL ?? "http://localhost:3000";
  const token = createInvoiceAccessToken(invoiceId);
  return `${root}/api/invoices/${invoiceId}?format=html&token=${encodeURIComponent(token)}`;
}
