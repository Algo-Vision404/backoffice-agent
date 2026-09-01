"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

interface ComplianceEvent {
  id: string;
  type: string;
  title: string;
  dueDate: string;
  status: string;
  description: string | null;
}

const statusVariant: Record<string, "default" | "outline" | "muted" | "dark"> = {
  DUE: "default",
  UPCOMING: "outline",
  COMPLETED: "dark",
  MISSED: "muted",
};

export default function CompliancePage() {
  const [events, setEvents] = useState<ComplianceEvent[]>([]);

  useEffect(() => {
    fetch("/api/compliance")
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(console.error);
  }, []);

  async function markComplete(id: string) {
    await fetch("/api/compliance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "COMPLETED" }),
    });
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "COMPLETED" } : e))
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <PageHeader
        title="Compliance"
        description="Tax deadlines, VAT/WHT filings, and payroll dates"
      />

      <Card className="divide-y divide-neutral-100">
        {events.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-500">No compliance events.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="flex items-center justify-between p-6">
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-neutral-950">{event.title}</p>
                  <Badge variant={statusVariant[event.status] ?? "muted"}>
                    {event.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {event.type.replace(/_/g, " ")} · Due {formatDate(event.dueDate)}
                </p>
                {event.description && (
                  <p className="mt-1 text-xs text-neutral-400">{event.description}</p>
                )}
              </div>
              {event.status !== "COMPLETED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markComplete(event.id)}
                >
                  Mark done
                </Button>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
