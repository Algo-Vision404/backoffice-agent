import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/auth/errors";
import { requireTenant } from "@/lib/auth/session";

export type TenantContext = {
  businessId: string;
  userId?: string;
};

export async function getTenant(): Promise<TenantContext> {
  return requireTenant();
}

export function assertTenantAccess(
  resourceBusinessId: string,
  tenant: TenantContext
): void {
  if (resourceBusinessId !== tenant.businessId) {
    throw new UnauthorizedError("Access denied");
  }
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  console.error(err);
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Internal server error" },
    { status: 500 }
  );
}
