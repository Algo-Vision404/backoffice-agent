import prisma from "@/lib/db";
import type { TenantContext } from "@/lib/tenant";
import { z } from "zod";
import type { ToolResult } from "@/agents/types";

const createInvoiceSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.enum(["GHS", "NGN"]).optional().default("GHS"),
  due_days: z.number().int().positive().optional().default(14),
  description: z.string().min(1, "Description is required"),
  apply_vat: z.boolean().optional().default(true),
  apply_wht: z.boolean().optional().default(false),
});

/**
 * Creates an invoice with line item, VAT/WHT calculation, and invoice number.
 * Finds or creates customer by name within the tenant.
 */
export async function createInvoice(
  args: Record<string, unknown>,
  tenant: TenantContext
): Promise<ToolResult> {
  const parsed = createInvoiceSchema.safeParse(args);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  const { customer_name, amount, currency, due_days, description, apply_vat, apply_wht } =
    parsed.data;

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: tenant.businessId },
    include: { taxRules: { where: { isDefault: true }, take: 1 } },
  });

  const taxRule = business.taxRules[0];
  const vatRate = apply_vat ? (taxRule?.vatRate ?? 0.15) : 0;
  const whtRate = apply_wht ? (taxRule?.whtRate ?? 0.075) : 0;

  const subtotal = amount;
  const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
  const whtAmount = Math.round(subtotal * whtRate * 100) / 100;
  const total = Math.round((subtotal + vatAmount - whtAmount) * 100) / 100;

  // Find or create customer
  let customer = await prisma.customer.findFirst({
    where: {
      businessId: tenant.businessId,
      name: customer_name,
    },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        businessId: tenant.businessId,
        name: customer_name,
      },
    });
  }

  // Generate invoice number
  const count = await prisma.invoice.count({
    where: { businessId: tenant.businessId },
  });
  const invoiceNumber = `INV-${String(count + 1).padStart(3, "0")}`;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + due_days);

  const invoice = await prisma.invoice.create({
    data: {
      businessId: tenant.businessId,
      customerId: customer.id,
      invoiceNumber,
      status: "SENT",
      currency: currency as "GHS" | "NGN",
      subtotal,
      vatAmount,
      whtAmount,
      total,
      dueDate,
      items: {
        create: {
          description,
          quantity: 1,
          unitPrice: amount,
          amount,
        },
      },
    },
    include: { customer: true, items: true },
  });

  return {
    success: true,
    data: invoice,
    message: `Created invoice ${invoiceNumber} for ${customer_name}: ${currency} ${total.toFixed(2)} (due ${dueDate.toLocaleDateString("en-GH")})`,
  };
}

export const createInvoiceTool = {
  name: "create_invoice",
  description:
    "Create and send an invoice for a customer. Calculates VAT (15% default) and optional WHT. Ask for confirmation if details are ambiguous.",
  parameters: {
    type: "object",
    properties: {
      customer_name: { type: "string", description: "Customer or client name" },
      amount: { type: "number", description: "Invoice amount before tax" },
      currency: { type: "string", enum: ["GHS", "NGN"], description: "Currency code" },
      due_days: { type: "number", description: "Days until due date (default 14)" },
      description: { type: "string", description: "Line item description / service" },
      apply_vat: { type: "boolean", description: "Apply VAT (default true for Ghana)" },
      apply_wht: { type: "boolean", description: "Apply withholding tax" },
    },
    required: ["customer_name", "amount", "description"],
  },
  execute: createInvoice,
};
