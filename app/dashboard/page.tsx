"use client";

import { useEffect, useState } from "react";
import { FileText, Wallet, Calendar, MessageSquare } from "@/components/ui/icons";
import { StatCard, Card, PageHeader } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Button } from "@/components/ui/Button";

interface DashboardData {
  business: { name: string; currency: string };
  stats: {
    totalUnpaid: number;
    unpaidCount: number;
    totalReceived: number;
    currency: string;
  };
  recentPayments: Array<{
    id: string;
    amount: number;
    method: string;
    receivedAt: string;
    payerName: string | null;
    invoice: { invoiceNumber: string; customer: { name: string } } | null;
  }>;
  nextDeadline: {
    title: string;
    dueDate: string;
    type: string;
  } | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const currency = data?.stats.currency ?? "GHS";

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <PageHeader
        title="Dashboard"
        description={`${data?.business.name ?? "Loading..."} — overview`}
        action={
          <Button onClick={() => setChatOpen(true)}>
            <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
            Ask assistant
          </Button>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Unpaid invoices"
          value={formatCurrency(data?.stats.totalUnpaid ?? 0, currency)}
          subtitle={`${data?.stats.unpaidCount ?? 0} outstanding`}
          icon={FileText}
        />
        <StatCard
          title="Total received"
          value={formatCurrency(data?.stats.totalReceived ?? 0, currency)}
          subtitle="Confirmed payments"
          icon={Wallet}
        />
        <StatCard
          title="Next deadline"
          value={
            data?.nextDeadline ? formatDate(data.nextDeadline.dueDate) : "—"
          }
          subtitle={data?.nextDeadline?.title ?? "No upcoming deadlines"}
          icon={Calendar}
        />
      </div>

      <Card className="p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Recent payments
        </h2>
        {!data ? (
          <p className="text-sm text-neutral-500">Loading...</p>
        ) : data.recentPayments.length === 0 ? (
          <p className="text-sm text-neutral-500">No payments recorded yet.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {data.recentPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-950">
                    {payment.payerName ?? "Unknown payer"}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {payment.invoice
                      ? `${payment.invoice.invoiceNumber} · ${payment.invoice.customer.name}`
                      : "Unmatched"}{" "}
                    · {payment.method.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-neutral-950">
                    +{formatCurrency(payment.amount, currency)}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {formatDate(payment.receivedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
