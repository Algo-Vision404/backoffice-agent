import prisma from "@/lib/db";
import type { TenantContext } from "@/lib/tenant";
import { z } from "zod";
import type { ToolResult } from "@/agents/types";

const taxSummarySchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
});

/**
 * Computes VAT and WHT summary for a month — suitable for GRA e-VAT prep (report only, no filing).
 */
export async function computeVatWhtSummary(
  args: Record<string, unknown>,
  tenant: TenantContext
): Promise<ToolResult> {
  const parsed = taxSummarySchema.safeParse(args);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  const { month, year } = parsed.data;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const invoices = await prisma.invoice.findMany({
    where: {
      businessId: tenant.businessId,
      issueDate: { gte: startDate, lte: endDate },
      status: { not: "CANCELLED" },
    },
    include: { customer: true },
  });

  const totalSubtotal = invoices.reduce((s, i) => s + i.subtotal, 0);
  const totalVat = invoices.reduce((s, i) => s + i.vatAmount, 0);
  const totalWht = invoices.reduce((s, i) => s + i.whtAmount, 0);
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: tenant.businessId },
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const report = {
    businessName: business.name,
    taxId: business.taxId,
    period: `${monthNames[month - 1]} ${year}`,
    month,
    year,
    invoiceCount: invoices.length,
    totalSubtotal,
    totalVat,
    totalWht,
    totalInvoiced,
    currency: business.currency,
    // Net VAT payable = output VAT (simplified; no input VAT in MVP)
    netVatPayable: totalVat,
    netWhtPayable: totalWht,
    invoices: invoices.map((i) => ({
      invoiceNumber: i.invoiceNumber,
      customer: i.customer.name,
      subtotal: i.subtotal,
      vat: i.vatAmount,
      wht: i.whtAmount,
      total: i.total,
    })),
    disclaimer:
      "This is a summary report for GRA e-VAT preparation only. Not an official filing.",
  };

  return {
    success: true,
    data: report,
    message: `VAT/WHT summary for ${monthNames[month - 1]} ${year}: Output VAT ${business.currency} ${totalVat.toFixed(2)}, WHT ${business.currency} ${totalWht.toFixed(2)} across ${invoices.length} invoice(s).`,
  };
}

export const computeVatWhtSummaryTool = {
  name: "compute_vat_wht_summary",
  description:
    "Generate monthly VAT and WHT summary report for GRA compliance. Does NOT file taxes — report only.",
  parameters: {
    type: "object",
    properties: {
      month: { type: "number", description: "Month (1-12)" },
      year: { type: "number", description: "Year e.g. 2026" },
    },
    required: ["month", "year"],
  },
  execute: computeVatWhtSummary,
};
