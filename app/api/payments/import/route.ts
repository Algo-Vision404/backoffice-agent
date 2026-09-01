import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getTenant, assertTenantAccess } from "@/lib/tenant";
import { parseBankCsv, matchPaymentToInvoice } from "@/lib/import/bank-csv";

export async function POST(req: NextRequest) {
  const tenant = await getTenant();
  const { csv } = await req.json();

  if (!csv || typeof csv !== "string") {
    return NextResponse.json({ error: "csv field is required" }, { status: 400 });
  }

  const rows = parseBankCsv(csv);
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: tenant.businessId },
  });

  let matched = 0;
  let unmatched = 0;
  let skipped = 0;
  const results = [];

  for (const row of rows) {
    const existing = await prisma.payment.findFirst({
      where: {
        businessId: tenant.businessId,
        reference: row.reference ?? undefined,
        amount: row.amount,
        receivedAt: row.date,
      },
    });

    if (existing) {
      skipped++;
      results.push({ amount: row.amount, matched: !!existing.invoiceId, reference: row.reference, skipped: true });
      continue;
    }

    const invoiceId = await matchPaymentToInvoice(tenant.businessId, row.amount, row.reference);

    await prisma.payment.create({
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
    });

    if (invoiceId) {
      matched++;
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (invoice) {
        const remaining = Math.max(0, invoice.total - invoice.amountPaid);
        const applied = Math.min(row.amount, remaining);
        const newPaid = invoice.amountPaid + applied;
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            amountPaid: newPaid,
            status: newPaid >= invoice.total ? "PAID" : "PARTIALLY_PAID",
          },
        });
      }
    } else {
      unmatched++;
    }

    results.push({ amount: row.amount, matched: !!invoiceId, reference: row.reference });
  }

  return NextResponse.json({ total: rows.length, matched, unmatched, skipped, results });
}
