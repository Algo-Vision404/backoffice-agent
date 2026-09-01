"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles } from "@/components/ui/icons";
import { Card, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  amountPaid: number;
  currency: string;
  dueDate: string;
  issueDate: string;
  customer: { name: string };
  items: Array<{ description: string; amount: number }>;
}

const statusVariant: Record<string, "default" | "outline" | "muted" | "dark"> = {
  PAID: "dark",
  OVERDUE: "default",
  SENT: "outline",
  PARTIALLY_PAID: "muted",
  DRAFT: "muted",
  CANCELLED: "muted",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices ?? []))
      .catch(console.error);
  }, []);

  function refreshInvoices() {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices ?? []));
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <PageHeader
        title="Invoices"
        description="Create, send, and track invoices"
        action={
          <Button onClick={() => setChatOpen(true)}>
            <Sparkles className="h-4 w-4" strokeWidth={1.5} />
            Create via AI
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 bg-white">
              <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                Invoice
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                Due
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {invoices.map((inv) => (
              <tr key={inv.id} className="transition-colors hover:bg-neutral-50">
                <td className="px-6 py-4">
                  <Link href={`/invoices/${inv.id}`} className="text-sm font-medium text-neutral-950 hover:underline">
                    {inv.invoiceNumber}
                  </Link>
                  <p className="mt-0.5 text-xs text-neutral-500">{inv.items[0]?.description}</p>
                </td>
                <td className="px-6 py-4 text-sm text-neutral-700">{inv.customer.name}</td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium tabular-nums text-neutral-950">
                    {formatCurrency(inv.total, inv.currency)}
                  </p>
                  {inv.amountPaid > 0 && inv.amountPaid < inv.total && (
                    <p className="mt-0.5 text-xs text-neutral-500">
                      Paid {formatCurrency(inv.amountPaid, inv.currency)}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Badge variant={statusVariant[inv.status] ?? "muted"}>
                    {inv.status.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-neutral-500">
                  {formatDate(inv.dueDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <p className="p-12 text-center text-sm text-neutral-500">
            No invoices yet. Create one via the assistant.
          </p>
        )}
      </Card>

      <ChatPanel
        isOpen={chatOpen}
        onClose={() => {
          setChatOpen(false);
          refreshInvoices();
        }}
        title="Create invoice"
      />
    </div>
  );
}
