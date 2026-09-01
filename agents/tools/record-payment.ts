import prisma from "@/lib/db";
import type { TenantContext } from "@/lib/tenant";
import { z } from "zod";
import type { ToolResult } from "@/agents/types";

const recordPaymentSchema = z.object({
  invoice_id: z.string().optional(),
  invoice_number: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  payment_method: z
    .enum(["MTN_MOMO", "VODAFONE_CASH", "BANK_TRANSFER", "CASH", "OTHER"])
    .optional()
    .default("MTN_MOMO"),
  reference: z.string().optional(),
  payer_name: z.string().optional(),
});

/**
 * Records a payment and matches it to an invoice if provided.
 * Updates invoice status and amountPaid automatically.
 */
export async function recordPayment(
  args: Record<string, unknown>,
  tenant: TenantContext
): Promise<ToolResult> {
  const parsed = recordPaymentSchema.safeParse(args);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  const { invoice_id, invoice_number, amount, payment_method, reference, payer_name } =
    parsed.data;

  let invoice = null;

  if (invoice_id) {
    invoice = await prisma.invoice.findFirst({
      where: { id: invoice_id, businessId: tenant.businessId },
    });
  } else if (invoice_number) {
    invoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: invoice_number, businessId: tenant.businessId },
    });
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: tenant.businessId },
  });

  const payment = await prisma.payment.create({
    data: {
      businessId: tenant.businessId,
      invoiceId: invoice?.id,
      amount,
      currency: business.currency,
      method: payment_method,
      status: invoice ? "CONFIRMED" : "UNMATCHED",
      reference,
      payerName: payer_name,
    },
  });

  if (invoice) {
    const newAmountPaid = invoice.amountPaid + amount;
    let status: "PARTIALLY_PAID" | "PAID" | "SENT" = "PARTIALLY_PAID";

    if (newAmountPaid >= invoice.total) {
      status = "PAID";
    } else if (newAmountPaid > 0) {
      status = "PARTIALLY_PAID";
    }

    // Flag discrepancy if over/under paid
    const discrepancy = Math.abs(newAmountPaid - invoice.total) > 0.01 && status === "PAID"
      ? newAmountPaid - invoice.total
      : null;

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { amountPaid: newAmountPaid, status },
    });

    return {
      success: true,
      data: { payment, invoiceNumber: invoice.invoiceNumber, discrepancy },
      message: discrepancy
        ? `Recorded ${business.currency} ${amount} for ${invoice.invoiceNumber}. Note: payment differs from invoice total by ${business.currency} ${discrepancy.toFixed(2)}.`
        : `Recorded ${business.currency} ${amount} payment for invoice ${invoice.invoiceNumber}.`,
    };
  }

  return {
    success: true,
    data: { payment },
    message: `Recorded unmatched payment of ${business.currency} ${amount}. No invoice linked — please specify invoice number to reconcile.`,
  };
}

export const recordPaymentTool = {
  name: "record_payment",
  description:
    "Record an incoming payment and match it to an invoice. Use invoice_number or invoice_id. Flags discrepancies if amount doesn't match.",
  parameters: {
    type: "object",
    properties: {
      invoice_id: { type: "string", description: "Invoice database ID" },
      invoice_number: { type: "string", description: "Invoice number e.g. INV-001" },
      amount: { type: "number", description: "Payment amount received" },
      payment_method: {
        type: "string",
        enum: ["MTN_MOMO", "VODAFONE_CASH", "BANK_TRANSFER", "CASH", "OTHER"],
      },
      reference: { type: "string", description: "MoMo or bank reference number" },
      payer_name: { type: "string", description: "Name of payer" },
    },
    required: ["amount"],
  },
  execute: recordPayment,
};
