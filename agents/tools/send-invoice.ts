import prisma from "@/lib/db";
import type { TenantContext } from "@/lib/tenant";
import { z } from "zod";
import type { ToolResult } from "@/agents/types";
import { sendWhatsAppMessage } from "@/integrations/whatsapp/client";
import { generateInvoiceWhatsAppText } from "@/lib/pdf/invoice";
import { invoiceViewUrl } from "@/lib/auth/invoice-access";

const schema = z.object({
  invoice_number: z.string().optional(),
  invoice_id: z.string().optional(),
});

export async function sendInvoice(
  args: Record<string, unknown>,
  tenant: TenantContext
): Promise<ToolResult> {
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  const { invoice_number, invoice_id } = parsed.data;
  if (!invoice_number && !invoice_id) {
    return { success: false, error: "Provide invoice_number or invoice_id" };
  }

  const invoice = await prisma.invoice.findFirst({
    where: {
      businessId: tenant.businessId,
      ...(invoice_id
        ? { id: invoice_id }
        : { invoiceNumber: invoice_number!.toUpperCase() }),
    },
    include: { customer: true, items: true, business: true },
  });

  if (!invoice) {
    return { success: false, error: "Invoice not found" };
  }

  if (!invoice.customer.phone) {
    return {
      success: false,
      error: `Customer ${invoice.customer.name} has no phone number on file. Add their phone first.`,
    };
  }

  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const viewUrl = invoiceViewUrl(invoice.id, baseUrl);

  const message = generateInvoiceWhatsAppText(
    {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      vatAmount: invoice.vatAmount,
      whtAmount: invoice.whtAmount,
      total: invoice.total,
      business: invoice.business,
      customer: invoice.customer,
      items: invoice.items,
    },
    viewUrl
  );

  const result = await sendWhatsAppMessage({
    to: invoice.customer.phone,
    body: message,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error ?? "Failed to send WhatsApp message",
    };
  }

  if (invoice.status === "DRAFT") {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "SENT" },
    });
  }

  return {
    success: true,
    data: { invoiceNumber: invoice.invoiceNumber, sentTo: invoice.customer.phone, stubbed: result.stubbed },
    message: result.stubbed
      ? `Invoice ${invoice.invoiceNumber} prepared for WhatsApp to ${invoice.customer.name} (stub mode — check server logs)`
      : `Invoice ${invoice.invoiceNumber} sent to ${invoice.customer.name} at ${invoice.customer.phone}`,
  };
}

export const sendInvoiceTool = {
  name: "send_invoice",
  description:
    "Send an invoice to the customer via WhatsApp. Includes amount, line items, and a link to view/download. Requires customer phone on file.",
  parameters: {
    type: "object",
    properties: {
      invoice_number: { type: "string", description: "Invoice number e.g. INV-001" },
      invoice_id: { type: "string", description: "Invoice database ID" },
    },
  },
  execute: sendInvoice,
};
