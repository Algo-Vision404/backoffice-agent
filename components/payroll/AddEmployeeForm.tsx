"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function AddEmployeeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, salary, phone: phone || undefined }),
    });

    setSaving(false);
    if (res.ok) {
      setName("");
      setRole("");
      setSalary("");
      setPhone("");
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to add employee");
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Add employee
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4">
      <p className="mb-3 text-sm font-medium text-neutral-950">New employee</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "Name", value: name, onChange: setName, required: true },
          { label: "Role", value: role, onChange: setRole, required: false },
          { label: "Monthly gross (GHS)", value: salary, onChange: setSalary, required: true, type: "number" },
          { label: "Phone", value: phone, onChange: setPhone, required: false },
        ].map((field) => (
          <div key={field.label}>
            <label className="mb-1 block text-xs text-neutral-500">{field.label}</label>
            <input
              type={field.type ?? "text"}
              required={field.required}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Adding..." : "Add"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
