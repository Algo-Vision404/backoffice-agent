import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getTenant, assertTenantAccess, handleApiError } from "@/lib/tenant";
import { verifyInvoiceAccessToken, invoiceViewUrl } from "@/lib/auth/invoice-access";
import { generateInvoiceHtml } from "@/lib/pdf/invoice";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const format = req.nextUrl.searchParams.get("format");

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, items: true, business: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (format === "html" || format === "pdf") {
      const token = req.nextUrl.searchParams.get("token");
      if (!token || !verifyInvoiceAccessToken(id, token)) {
        return NextResponse.json({ error: "Invalid or expired invoice link" }, { status: 403 });
      }

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

    return NextResponse.json({
      invoice,
      viewUrl: invoiceViewUrl(id),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
  } catch (err) {
    return handleApiError(err);
  }
}
