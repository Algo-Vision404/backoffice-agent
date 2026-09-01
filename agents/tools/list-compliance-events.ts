import prisma from "@/lib/db";
import type { TenantContext } from "@/lib/tenant";
import { z } from "zod";
import type { ToolResult } from "@/agents/types";

const schema = z.object({
  days_ahead: z.number().int().positive().optional().default(30),
});

export async function listComplianceEvents(
  args: Record<string, unknown>,
  tenant: TenantContext
): Promise<ToolResult> {
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + parsed.data.days_ahead);

  const events = await prisma.complianceEvent.findMany({
    where: {
      businessId: tenant.businessId,
      status: { in: ["UPCOMING", "DUE"] },
      dueDate: { lte: horizon },
    },
    orderBy: { dueDate: "asc" },
  });

  const summary = events.map((e) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    dueDate: e.dueDate.toISOString(),
    status: e.status,
    daysUntil: Math.ceil((e.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  }));

  return {
    success: true,
    data: { events: summary, count: events.length },
    message:
      events.length === 0
        ? "No compliance deadlines in the next 30 days."
        : `${events.length} upcoming deadline(s). Next: ${events[0].title} on ${events[0].dueDate.toLocaleDateString("en-GH")}.`,
  };
}

export const listComplianceEventsTool = {
  name: "list_compliance_events",
  description:
    "List upcoming tax, VAT, WHT, and payroll compliance deadlines. Use for reminders and planning.",
  parameters: {
    type: "object",
    properties: {
      days_ahead: { type: "number", description: "How many days ahead to look (default 30)" },
    },
  },
  execute: listComplianceEvents,
};
