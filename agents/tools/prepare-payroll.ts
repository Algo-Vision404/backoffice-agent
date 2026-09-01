import prisma from "@/lib/db";
import type { TenantContext } from "@/lib/tenant";
import { z } from "zod";
import type { ToolResult } from "@/agents/types";

const payrollSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
});

const SSNIT_RATE = 0.055; // Employee SSNIT contribution (placeholder)
const TAX_RATE = 0.05; // Simplified PAYE placeholder

/**
 * Prepares a monthly payroll run for all active employees.
 * Computes gross, SSNIT, tax deductions, and net pay.
 * Does NOT initiate payments — summary only (human-in-the-loop).
 */
export async function preparePayroll(
  args: Record<string, unknown>,
  tenant: TenantContext
): Promise<ToolResult> {
  const parsed = payrollSchema.safeParse(args);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  const { month, year } = parsed.data;

  const employees = await prisma.employee.findMany({
    where: { businessId: tenant.businessId, isActive: true },
  });

  if (employees.length === 0) {
    return {
      success: false,
      error: "No active employees found. Add employees in Settings first.",
    };
  }

  const items = employees.map((emp) => {
    const ssnitDeduction = Math.round(emp.salary * SSNIT_RATE * 100) / 100;
    const taxDeduction = Math.round(emp.salary * TAX_RATE * 100) / 100;
    const netPay = Math.round((emp.salary - ssnitDeduction - taxDeduction) * 100) / 100;
    return { employeeId: emp.id, name: emp.name, role: emp.role, grossPay: emp.salary, ssnitDeduction, taxDeduction, netPay };
  });

  const totalGross = items.reduce((s, i) => s + i.grossPay, 0);
  const totalDeductions = items.reduce((s, i) => s + i.ssnitDeduction + i.taxDeduction, 0);
  const totalNet = items.reduce((s, i) => s + i.netPay, 0);

  const payrollRun = await prisma.payrollRun.upsert({
    where: { businessId_month_year: { businessId: tenant.businessId, month, year } },
    create: {
      businessId: tenant.businessId,
      month,
      year,
      totalGross,
      totalNet,
      totalDeductions,
      status: "draft",
      items: {
        create: items.map(({ employeeId, grossPay, ssnitDeduction, taxDeduction, netPay }) => ({
          employeeId,
          grossPay,
          ssnitDeduction,
          taxDeduction,
          netPay,
        })),
      },
    },
    update: {
      totalGross,
      totalNet,
      totalDeductions,
      status: "draft",
      items: {
        deleteMany: {},
        create: items.map(({ employeeId, grossPay, ssnitDeduction, taxDeduction, netPay }) => ({
          employeeId,
          grossPay,
          ssnitDeduction,
          taxDeduction,
          netPay,
        })),
      },
    },
    include: { items: { include: { employee: true } } },
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: tenant.businessId },
  });

  return {
    success: true,
    data: {
      payrollRunId: payrollRun.id,
      period: `${monthNames[month - 1]} ${year}`,
      staffCount: employees.length,
      totalGross,
      totalDeductions,
      totalNet,
      currency: business.currency,
      items: items.map((i) => ({
        name: i.name,
        role: i.role,
        gross: i.grossPay,
        net: i.netPay,
      })),
      disclaimer: "Payroll prepared for review only. No payments initiated.",
    },
    message: `Payroll for ${monthNames[month - 1]} ${year}: ${employees.length} staff, net payout ${business.currency} ${totalNet.toFixed(2)}.`,
  };
}

export const preparePayrollTool = {
  name: "prepare_payroll",
  description:
    "Prepare monthly payroll for all active employees. Computes gross/net with SSNIT and tax deductions. Does NOT send payments — summary for bank/MoMo transfer prep only.",
  parameters: {
    type: "object",
    properties: {
      month: { type: "number", description: "Month (1-12)" },
      year: { type: "number", description: "Year e.g. 2026" },
    },
    required: ["month", "year"],
  },
  execute: preparePayroll,
};
