import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getTenant, assertTenantAccess } from "@/lib/tenant";
import { generateInvoiceHtml } from "@/lib/pdf/invoice";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const format = req.nextUrl.searchParams.get("format");

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, items: true, business: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Public HTML view for customers (no auth required)
  if (format === "html" || format === "pdf") {
    const html = generateInvoiceHtml({
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      vatAmount: invoice.vatAmount,
      whtAmount: invoice.whtAmount,
      total: invoice.total,
      notes: invoice.notes,
      business: invoice.business,
      customer: invoice.customer,
      items: invoice.items,
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.html"`,
      },
    });
  }

  const tenant = await getTenant();
  assertTenantAccess(invoice.businessId, tenant);

  return NextResponse.json({ invoice });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenant = await getTenant();
  const body = await req.json();

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  assertTenantAccess(invoice.businessId, tenant);

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      status: body.status,
      notes: body.notes,
    },
    include: { customer: true, items: true },
  });

  return NextResponse.json({ invoice: updated });
}
