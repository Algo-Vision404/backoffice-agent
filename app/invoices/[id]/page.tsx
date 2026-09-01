"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  subtotal: number;
  vatAmount: number;
  whtAmount: number;
  total: number;
  amountPaid: number;
  issueDate: string;
  dueDate: string;
  notes: string | null;
  customer: { name: string; phone: string | null; email: string | null };
  items: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [id, setId] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      fetch(`/api/invoices/${p.id}`)
        .then((r) => r.json())
        .then((d) => setInvoice(d.invoice));
    });
  }, [params]);

  async function handleSendWhatsApp() {
    if (!id) return;
    setSending(true);
    setSendMessage(null);
    const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
    const data = await res.json();
    setSending(false);
    if (res.ok) {
      setSendMessage(data.message);
      fetch(`/api/invoices/${id}`)
        .then((r) => r.json())
        .then((d) => setInvoice(d.invoice));
    } else {
      setSendMessage(data.error ?? "Failed to send");
    }
  }

  if (!invoice) {
    return <div className="p-8 text-sm text-neutral-500">Loading...</div>;
  }

  const outstanding = invoice.total - invoice.amountPaid;

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <PageHeader
        title={invoice.invoiceNumber}
        description={`${invoice.customer.name} · ${formatDate(invoice.issueDate)}`}
        action={
          <div className="flex gap-2">
            {invoice.customer.phone && invoice.status !== "PAID" && (
              <Button onClick={handleSendWhatsApp} disabled={sending}>
                {sending ? "Sending..." : "Send via WhatsApp"}
              </Button>
            )}
            <a href={`/api/invoices/${id}?format=html`} target="_blank" rel="noreferrer">
              <Button variant="outline">View / Print PDF</Button>
            </a>
            <Link href="/invoices">
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex items-center gap-3">
        <Badge variant={invoice.status === "PAID" ? "dark" : "outline"}>
          {invoice.status.replace(/_/g, " ")}
        </Badge>
        {sendMessage && <span className="text-sm text-neutral-500">{sendMessage}</span>}
        {outstanding > 0 && (
          <span className="text-sm text-neutral-500">
            {formatCurrency(outstanding, invoice.currency)} outstanding
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wider text-neutral-500">
                <th className="pb-3">Description</th>
                <th className="pb-3 text-center">Qty</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} className="border-b border-neutral-100">
                  <td className="py-3">{item.description}</td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-right tabular-nums">{formatCurrency(item.amount, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-6 ml-auto w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span>{formatCurrency(invoice.subtotal, invoice.currency)}</span></div>
            {invoice.vatAmount > 0 && <div className="flex justify-between"><span className="text-neutral-500">VAT</span><span>{formatCurrency(invoice.vatAmount, invoice.currency)}</span></div>}
            {invoice.whtAmount > 0 && <div className="flex justify-between"><span className="text-neutral-500">WHT</span><span>-{formatCurrency(invoice.whtAmount, invoice.currency)}</span></div>}
            <div className="flex justify-between border-t border-neutral-200 pt-2 font-semibold"><span>Total</span><span>{formatCurrency(invoice.total, invoice.currency)}</span></div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">Customer</h3>
          <p className="font-medium">{invoice.customer.name}</p>
          {invoice.customer.phone && <p className="mt-1 text-sm text-neutral-500">{invoice.customer.phone}</p>}
          {invoice.customer.email && <p className="text-sm text-neutral-500">{invoice.customer.email}</p>}
          <p className="mt-4 text-xs text-neutral-400">Due {formatDate(invoice.dueDate)}</p>
        </Card>
      </div>
    </div>
  );
}
