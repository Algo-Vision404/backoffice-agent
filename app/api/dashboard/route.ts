import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { runMaintenanceJobs } from "@/lib/jobs/maintenance";

export async function GET() {
  const tenant = await getTenant();
  await runMaintenanceJobs(tenant.businessId);

  const [business, unpaidInvoices, recentPayments, nextDeadline] = await Promise.all([
    prisma.business.findUnique({ where: { id: tenant.businessId } }),
    prisma.invoice.findMany({
      where: {
        businessId: tenant.businessId,
        status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
      },
    }),
    prisma.payment.findMany({
      where: { businessId: tenant.businessId },
      orderBy: { receivedAt: "desc" },
      take: 5,
      include: { invoice: { include: { customer: true } } },
    }),
    prisma.complianceEvent.findFirst({
      where: {
        businessId: tenant.businessId,
        status: { in: ["UPCOMING", "DUE"] },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const totalUnpaid = unpaidInvoices.reduce(
    (sum, inv) => sum + (inv.total - inv.amountPaid),
    0
  );

  const totalReceived = await prisma.payment.aggregate({
    where: { businessId: tenant.businessId, status: "CONFIRMED" },
    _sum: { amount: true },
  });

  return NextResponse.json({
    business,
    stats: {
      totalUnpaid,
      unpaidCount: unpaidInvoices.length,
      totalReceived: totalReceived._sum.amount ?? 0,
      currency: business?.currency ?? "GHS",
    },
    recentPayments,
    nextDeadline,
  });
}
