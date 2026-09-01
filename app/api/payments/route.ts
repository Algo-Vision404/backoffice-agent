import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getTenant } from "@/lib/tenant";

export async function GET() {
  const tenant = await getTenant();

  const payments = await prisma.payment.findMany({
    where: { businessId: tenant.businessId },
    include: { invoice: { include: { customer: true } } },
    orderBy: { receivedAt: "desc" },
  });

  const invoices = await prisma.invoice.findMany({
    where: { businessId: tenant.businessId },
    select: { id: true, invoiceNumber: true, total: true, amountPaid: true, status: true },
  });

  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      businessId: tenant.businessId,
      status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
    },
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      amountPaid: true,
      customer: { select: { name: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  const cashPosition = {
    totalInvoiced: invoices.reduce((s, i) => s + i.total, 0),
    totalCollected: payments
      .filter((p) => p.status === "CONFIRMED")
      .reduce((s, p) => s + p.amount, 0),
    outstanding: invoices.reduce((s, i) => s + (i.total - i.amountPaid), 0),
  };

  return NextResponse.json({ payments, cashPosition, unpaidInvoices });
}
