import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getTenant, assertTenantAccess } from "@/lib/tenant";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenant = await getTenant();
  const { invoice_id } = await req.json();

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  assertTenantAccess(payment.businessId, tenant);

  let invoiceId = invoice_id;
  if (!invoiceId) {
    return NextResponse.json({ error: "invoice_id is required" }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.businessId !== tenant.businessId) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  await prisma.payment.update({
    where: { id },
    data: { invoiceId, status: "CONFIRMED" },
  });

  const newPaid = invoice.amountPaid + payment.amount;
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaid: newPaid,
      status: newPaid >= invoice.total ? "PAID" : "PARTIALLY_PAID",
    },
  });

  return NextResponse.json({ success: true });
}
