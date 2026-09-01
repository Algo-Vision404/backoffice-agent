import { Card, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SettingsForm } from "@/components/settings/SettingsForm";
import prisma from "@/lib/db";
import { getTenant } from "@/lib/tenant";

export default async function SettingsPage() {
  const tenant = await getTenant();
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: tenant.businessId },
    include: { taxRules: true, users: true },
  });

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <PageHeader
        title="Settings"
        description="Business profile and integrations"
      />

      <div className="grid max-w-2xl gap-5">
        <SettingsForm business={business} />

        <Card className="p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Locale
          </h2>
          <dl className="space-y-4 text-sm">
            {[
              ["Country", business.country === "GH" ? "Ghana" : "Nigeria"],
              ["Currency", business.currency],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-neutral-100 pb-4 last:border-0 last:pb-0">
                <dt className="text-neutral-500">{label}</dt>
                <dd className="font-medium text-neutral-950">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Tax rules
          </h2>
          <div className="space-y-3">
            {business.taxRules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
              >
                <p className="text-sm font-medium text-neutral-950">{rule.name}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  VAT {(rule.vatRate * 100).toFixed(1)}% · WHT{" "}
                  {(rule.whtRate * 100).toFixed(1)}%
                  {rule.isDefault && " · Default"}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Integrations
          </h2>
          <div className="space-y-3">
            {[
              {
                name: "WhatsApp Business API",
                desc: "Configure tokens in .env",
                status: "Stub",
                variant: "muted" as const,
              },
              {
                name: "MTN Mobile Money",
                desc: "Sandbox mock provider",
                status: "Mock",
                variant: "muted" as const,
              },
              {
                name: "AI Agent",
                desc: `Mode: ${process.env.AGENT_MODE ?? "mock"}`,
                status: "Active",
                variant: "dark" as const,
              },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-md border border-neutral-200 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-950">{item.name}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{item.desc}</p>
                </div>
                <Badge variant={item.variant}>{item.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Team
          </h2>
          <div className="divide-y divide-neutral-100">
            {business.users.map((user) => (
              <div key={user.id} className="flex justify-between py-3 first:pt-0 last:pb-0">
                <span className="text-sm font-medium text-neutral-950">{user.name}</span>
                <span className="text-sm capitalize text-neutral-500">{user.role}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
