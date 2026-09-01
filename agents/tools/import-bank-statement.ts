import prisma from "@/lib/db";
import type { TenantContext } from "@/lib/tenant";
import { z } from "zod";
import type { ToolResult } from "@/agents/types";
import { parseBankCsv, matchPaymentToInvoice } from "@/lib/import/bank-csv";

const schema = z.object({
  csv_content: z.string().min(1, "CSV content is required"),
});

export async function importBankStatement(
  args: Record<string, unknown>,
  tenant: TenantContext
): Promise<ToolResult> {
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  const rows = parseBankCsv(parsed.data.csv_content);
  if (rows.length === 0) {
    return { success: false, error: "No valid credit transactions found in CSV" };
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: tenant.businessId },
  });

  let matched = 0;
  let unmatched = 0;
  const results: Array<{ amount: number; status: string; invoice?: string }> = [];

  for (const row of rows) {
    const invoiceId = await matchPaymentToInvoice(
      tenant.businessId,
      row.amount,
      row.reference
    );

    const payment = await prisma.payment.create({
      data: {
        businessId: tenant.businessId,
        invoiceId,
        amount: row.amount,
        currency: business.currency,
        method: row.description.toLowerCase().includes("momo") ? "MTN_MOMO" : "BANK_TRANSFER",
        status: invoiceId ? "CONFIRMED" : "UNMATCHED",
        reference: row.reference,
        payerName: row.payerName,
        receivedAt: row.date,
        notes: row.description,
      },
      include: { invoice: true },
    });

    if (invoiceId) {
      matched++;
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (invoice) {
        const newPaid = invoice.amountPaid + row.amount;
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            amountPaid: newPaid,
            status: newPaid >= invoice.total ? "PAID" : "PARTIALLY_PAID",
          },
        });
      }
      results.push({
        amount: row.amount,
        status: "matched",
        invoice: payment.invoice?.invoiceNumber,
      });
    } else {
      unmatched++;
      results.push({ amount: row.amount, status: "unmatched" });
    }
  }

  return {
    success: true,
    data: { total: rows.length, matched, unmatched, results },
    message: `Imported ${rows.length} transactions: ${matched} matched to invoices, ${unmatched} unmatched.`,
  };
}

export const importBankStatementTool = {
  name: "import_bank_statement",
  description:
    "Import bank or MoMo statement from CSV text. Auto-matches payments to invoices by reference or amount. Returns match summary.",
  parameters: {
    type: "object",
    properties: {
      csv_content: { type: "string", description: "Raw CSV text from bank export" },
    },
    required: ["csv_content"],
  },
  execute: importBankStatement,
};
