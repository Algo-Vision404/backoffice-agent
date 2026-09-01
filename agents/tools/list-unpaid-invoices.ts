import prisma from "@/lib/db";
import type { TenantContext } from "@/lib/tenant";
import { z } from "zod";
import type { ToolResult } from "@/agents/types";

const listUnpaidSchema = z.object({
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2020).optional(),
});

/**
 * Lists unpaid or partially paid invoices, optionally filtered by month/year.
 */
export async function listUnpaidInvoices(
  args: Record<string, unknown>,
  tenant: TenantContext
): Promise<ToolResult> {
  const parsed = listUnpaidSchema.safeParse(args);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  const now = new Date();
  const month = parsed.data.month ?? now.getMonth() + 1;
  const year = parsed.data.year ?? now.getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const invoices = await prisma.invoice.findMany({
    where: {
      businessId: tenant.businessId,
      status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
      issueDate: { gte: startDate, lte: endDate },
    },
    include: { customer: true },
    orderBy: { dueDate: "asc" },
  });

  const totalOutstanding = invoices.reduce(
    (sum, inv) => sum + (inv.total - inv.amountPaid),
    0
  );

  const summary = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customer: inv.customer.name,
    total: inv.total,
    amountPaid: inv.amountPaid,
    outstanding: inv.total - inv.amountPaid,
    currency: inv.currency,
    status: inv.status,
    dueDate: inv.dueDate.toISOString(),
  }));

  return {
    success: true,
    data: { invoices: summary, totalOutstanding, month, year, count: invoices.length },
    message:
      invoices.length === 0
        ? `No unpaid invoices for ${month}/${year}.`
        : `Found ${invoices.length} unpaid invoice(s) totaling ${summary[0]?.currency ?? "GHS"} ${totalOutstanding.toFixed(2)}.`,
  };
}

export const listUnpaidInvoicesTool = {
  name: "list_unpaid_invoices",
  description:
    "List unpaid or partially paid invoices for a given month and year. Defaults to current month.",
  parameters: {
    type: "object",
    properties: {
      month: { type: "number", description: "Month (1-12)" },
      year: { type: "number", description: "Year e.g. 2026" },
    },
  },
  execute: listUnpaidInvoices,
};
