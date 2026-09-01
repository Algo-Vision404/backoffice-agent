import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getTenant } from "@/lib/tenant";

export async function GET() {
  const tenant = await getTenant();

  const invoices = await prisma.invoice.findMany({
    where: { businessId: tenant.businessId },
    include: { customer: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invoices });
}
