import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { runMaintenanceJobs } from "@/lib/jobs/maintenance";

export async function GET() {
  const tenant = await getTenant();
  await runMaintenanceJobs(tenant.businessId);

  const events = await prisma.complianceEvent.findMany({
    where: { businessId: tenant.businessId },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({ events });
}

export async function PATCH(req: Request) {
  const tenant = await getTenant();
  const { id, status } = await req.json();

  const event = await prisma.complianceEvent.findFirst({
    where: { id, businessId: tenant.businessId },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.complianceEvent.update({
    where: { id: event.id },
    data: { status },
  });

  return NextResponse.json({ event: updated });
}
