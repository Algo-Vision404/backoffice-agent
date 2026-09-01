"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Business {
  name: string;
  phone: string | null;
  taxId: string | null;
  address: string | null;
  taxRules: Array<{ vatRate: number; isDefault: boolean }>;
}

export function SettingsForm({ business }: { business: Business }) {
  const defaultVat = business.taxRules.find((r) => r.isDefault)?.vatRate ?? 0.15;
  const [name, setName] = useState(business.name);
  const [phone, setPhone] = useState(business.phone ?? "");
  const [taxId, setTaxId] = useState(business.taxId ?? "");
  const [address, setAddress] = useState(business.address ?? "");
  const [vatRate, setVatRate] = useState(String(defaultVat * 100));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone: phone || null,
        taxId: taxId || null,
        address: address || null,
        vatRate: (parseFloat(vatRate) / 100).toString(),
      }),
    });

    setSaving(false);
    if (res.ok) {
      setMessage("Settings saved");
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Failed to save");
    }
  }

  return (
    <Card className="p-6">
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-neutral-500">
        Business profile
      </h2>
      <form onSubmit={handleSave} className="space-y-4">
        {[
          { label: "Name", value: name, onChange: setName },
          { label: "Phone", value: phone, onChange: setPhone },
          { label: "Tax ID", value: taxId, onChange: setTaxId },
          { label: "Address", value: address, onChange: setAddress },
        ].map((field) => (
          <div key={field.label}>
            <label className="mb-1 block text-xs font-medium text-neutral-500">{field.label}</label>
            <input
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Default VAT rate (%)</label>
          <input
            type="number"
            step="0.1"
            value={vatRate}
            onChange={(e) => setVatRate(e.target.value)}
            className="w-32 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
          {message && <span className="text-sm text-neutral-500">{message}</span>}
        </div>
      </form>
    </Card>
  );
}
