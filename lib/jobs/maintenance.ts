import prisma from "@/lib/db";

/** Mark SENT invoices past due date as OVERDUE */
export async function markOverdueInvoices(businessId: string): Promise<number> {
  const now = new Date();
  const result = await prisma.invoice.updateMany({
    where: {
      businessId,
      status: { in: ["SENT", "PARTIALLY_PAID"] },
      dueDate: { lt: now },
    },
    data: { status: "OVERDUE" },
  });
  return result.count;
}

/** Update compliance events that are past due */
export async function updateComplianceStatuses(businessId: string): Promise<number> {
  const now = new Date();
  const result = await prisma.complianceEvent.updateMany({
    where: {
      businessId,
      status: "UPCOMING",
      dueDate: { lte: now },
    },
    data: { status: "DUE" },
  });
  return result.count;
}

export async function runMaintenanceJobs(businessId: string) {
  const [overdueCount, dueCount] = await Promise.all([
    markOverdueInvoices(businessId),
    updateComplianceStatuses(businessId),
  ]);
  return { overdueCount, dueCount };
}
