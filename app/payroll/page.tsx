import { Users, Banknote, Wallet } from "@/components/ui/icons";
import { AddEmployeeForm } from "@/components/payroll/AddEmployeeForm";
import { Card, StatCard, PageHeader } from "@/components/ui/Card";
import prisma from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { formatCurrency } from "@/lib/utils";

export default async function PayrollPage() {
  const tenant = await getTenant();

  const [employees, payrollRun] = await Promise.all([
    prisma.employee.findMany({
      where: { businessId: tenant.businessId, isActive: true },
    }),
    prisma.payrollRun.findFirst({
      where: { businessId: tenant.businessId },
      include: { items: { include: { employee: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const currency = "GHS";

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <PageHeader
        title="Payroll"
        description="Employee list and monthly payroll summary"
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Active staff"
          value={String(employees.length)}
          icon={Users}
        />
        <StatCard
          title="Monthly gross"
          value={formatCurrency(payrollRun?.totalGross ?? 0, currency)}
          icon={Banknote}
        />
        <StatCard
          title="Monthly net pay"
          value={formatCurrency(payrollRun?.totalNet ?? 0, currency)}
          icon={Wallet}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Employees
          </h2>
          <AddEmployeeForm />
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100 bg-white">
              <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                Role
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                Gross
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                Est. net
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-neutral-50">
                <td className="px-6 py-4 text-sm font-medium text-neutral-950">{emp.name}</td>
                <td className="px-6 py-4 text-sm text-neutral-500">{emp.role}</td>
                <td className="px-6 py-4 text-sm tabular-nums text-neutral-950">
                  {formatCurrency(emp.salary, currency)}
                </td>
                <td className="px-6 py-4 text-sm tabular-nums text-neutral-700">
                  {formatCurrency(emp.salary * 0.895, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {payrollRun && (
        <Card className="mt-6 p-6">
          <p className="text-sm font-medium text-neutral-950">
            Latest run — {payrollRun.month}/{payrollRun.year}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {payrollRun.status} · Deductions{" "}
            {formatCurrency(payrollRun.totalDeductions, currency)}
          </p>
          <p className="mt-4 text-xs text-neutral-400">
            Ask the assistant: &quot;Prepare payroll for my {employees.length} staff&quot;
          </p>
        </Card>
      )}
    </div>
  );
}
