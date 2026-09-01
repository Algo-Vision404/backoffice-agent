import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getTenant } from "@/lib/tenant";

export async function GET() {
  const tenant = await getTenant();
  const employees = await prisma.employee.findMany({
    where: { businessId: tenant.businessId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ employees });
}

export async function POST(req: NextRequest) {
  const tenant = await getTenant();
  const { name, role, salary, phone } = await req.json();

  if (!name || !salary) {
    return NextResponse.json({ error: "name and salary are required" }, { status: 400 });
  }

  const employee = await prisma.employee.create({
    data: {
      businessId: tenant.businessId,
      name,
      role: role ?? "Staff",
      salary: parseFloat(salary),
      phone,
    },
  });

  return NextResponse.json({ employee });
}
