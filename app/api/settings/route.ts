import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getTenant } from "@/lib/tenant";

export async function GET() {
  const tenant = await getTenant();
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: tenant.businessId },
    include: { taxRules: true },
  });
  return NextResponse.json({ business });
}

export async function PATCH(req: NextRequest) {
  const tenant = await getTenant();
  const body = await req.json();

  const business = await prisma.business.update({
    where: { id: tenant.businessId },
    data: {
      name: body.name,
      phone: body.phone,
      address: body.address,
      taxId: body.taxId,
    },
  });

  if (body.vatRate !== undefined) {
    await prisma.taxRule.updateMany({
      where: { businessId: tenant.businessId, isDefault: true },
      data: { vatRate: parseFloat(body.vatRate) },
    });
  }

  return NextResponse.json({ business });
}
