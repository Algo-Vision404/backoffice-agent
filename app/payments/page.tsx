"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload, FileText, CheckCircle, Clock } from "@/components/ui/icons";
import { Card, StatCard, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  payerName: string | null;
  receivedAt: string;
  invoice: { id: string; invoiceNumber: string; customer: { name: string } } | null;
}

interface UnpaidInvoice {
  id: string;
  invoiceNumber: string;
  total: number;
  amountPaid: number;
  customer: { name: string };
}

interface PaymentsData {
  payments: Payment[];
  cashPosition: { totalInvoiced: number; totalCollected: number; outstanding: number };
  unpaidInvoices: UnpaidInvoice[];
}

export default function PaymentsPage() {
  const [data, setData] = useState<PaymentsData | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Record<string, string>>({});

  function load() {
    fetch("/api/payments")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }

  useEffect(() => { load(); }, []);

  const currency = data?.payments[0]?.currency ?? "GHS";
  const unmatched = (data?.payments ?? []).filter((p) => p.status === "UNMATCHED");

  async function handleImport() {
    setImporting(true);
    setImportResult(null);
    const res = await fetch("/api/payments/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: csvText }),
    });
    const result = await res.json();
    setImporting(false);
    if (res.ok) {
      setImportResult(`Imported ${result.total}: ${result.matched} matched, ${result.unmatched} unmatched`);
      setCsvText("");
      setShowImport(false);
      load();
    } else {
      setImportResult(result.error ?? "Import failed");
    }
  }

  async function handleMatch(paymentId: string) {
    const invoiceId = selectedInvoice[paymentId];
    if (!invoiceId) return;
    setMatchingId(paymentId);
    const res = await fetch(`/api/payments/${paymentId}/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });
    setMatchingId(null);
    if (res.ok) load();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setShowImport(true);
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <PageHeader
        title="Payments"
        description="Track incoming payments and cash position"
        action={
          <label className="cursor-pointer">
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            <span className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50">
              <Upload className="h-4 w-4" strokeWidth={1.5} />
              Import CSV
            </span>
          </label>
        }
      />

      {showImport && (
        <Card className="mb-6 p-6">
          <h3 className="mb-3 text-sm font-semibold">Import bank statement</h3>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-neutral-300 p-3 font-mono text-xs"
            placeholder="Paste CSV: Date, Description, Amount, Reference"
          />
          <div className="mt-3 flex gap-2">
            <Button onClick={handleImport} disabled={importing || !csvText.trim()}>
              {importing ? "Importing..." : "Import & match"}
            </Button>
            <Button variant="ghost" onClick={() => setShowImport(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {importResult && <p className="mb-4 text-sm text-neutral-600">{importResult}</p>}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Total invoiced" value={formatCurrency(data?.cashPosition.totalInvoiced ?? 0, currency)} icon={FileText} />
        <StatCard title="Total collected" value={formatCurrency(data?.cashPosition.totalCollected ?? 0, currency)} icon={CheckCircle} />
        <StatCard title="Outstanding" value={formatCurrency(data?.cashPosition.outstanding ?? 0, currency)} icon={Clock} />
      </div>

      {unmatched.length > 0 && (
        <Card className="mb-6 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Unmatched ({unmatched.length})
          </h2>
          {unmatched.map((p) => (
            <div key={p.id} className="flex flex-col gap-2 border-b border-neutral-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-sm font-medium">{p.payerName ?? "Unknown"}</span>
                <span className="ml-2 text-sm tabular-nums text-neutral-600">{formatCurrency(p.amount, p.currency)}</span>
                {p.reference && <p className="text-xs text-neutral-400">Ref: {p.reference}</p>}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedInvoice[p.id] ?? ""}
                  onChange={(e) => setSelectedInvoice((s) => ({ ...s, [p.id]: e.target.value }))}
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                >
                  <option value="">Select invoice...</option>
                  {(data?.unpaidInvoices ?? []).map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.customer.name} ({formatCurrency(inv.total - inv.amountPaid, p.currency)} due)
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={!selectedInvoice[p.id] || matchingId === p.id}
                  onClick={() => handleMatch(p.id)}
                >
                  {matchingId === p.id ? "..." : "Match"}
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card className="p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-neutral-500">History</h2>
        <div className="divide-y divide-neutral-100">
          {(data?.payments ?? []).map((payment) => (
            <div key={payment.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{payment.payerName ?? "Unknown"}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {payment.invoice ? (
                    <Link href={`/invoices/${payment.invoice.id}`} className="underline">
                      {payment.invoice.invoiceNumber}
                    </Link>
                  ) : "Unmatched"}{" "}
                  · {payment.method.replace(/_/g, " ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(payment.amount, payment.currency)}</p>
                <p className="text-xs text-neutral-400">{formatDate(payment.receivedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
