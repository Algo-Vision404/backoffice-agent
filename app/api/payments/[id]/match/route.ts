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

  if (!invoice_id) {
    return NextResponse.json({ error: "invoice_id is required" }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: invoice_id } });
  if (!invoice || invoice.businessId !== tenant.businessId) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const remaining = invoice.total - invoice.amountPaid;
  if (remaining <= 0) {
    return NextResponse.json({ error: "Invoice is already fully paid" }, { status: 400 });
  }
  if (payment.amount > remaining + 0.01) {
    return NextResponse.json(
      { error: `Payment amount exceeds outstanding balance (${remaining.toFixed(2)})` },
      { status: 400 }
    );
  }

  await prisma.payment.update({
    where: { id },
    data: { invoiceId: invoice_id, status: "CONFIRMED" },
  });

  const newPaid = invoice.amountPaid + payment.amount;
  await prisma.invoice.update({
    where: { id: invoice_id },
    data: {
      amountPaid: newPaid,
      status: newPaid >= invoice.total ? "PAID" : "PARTIALLY_PAID",
    },
  });

  return NextResponse.json({ success: true });
}
