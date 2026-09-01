import prisma from "@/lib/db";
import { getTenant as getTenantFromSession } from "@/lib/auth/session";

export interface TenantContext {
  businessId: string;
  userId?: string;
}

/** @deprecated Use getTenant() from lib/auth/session */
export async function getDefaultTenant(): Promise<TenantContext> {
  return getTenantFromSession();
}

export async function getTenant(): Promise<TenantContext> {
  return getTenantFromSession();
}

export function assertTenantAccess(
  resourceBusinessId: string,
  tenant: TenantContext
): void {
  if (resourceBusinessId !== tenant.businessId) {
    throw new Error("Access denied: tenant isolation violation");
  }
}
