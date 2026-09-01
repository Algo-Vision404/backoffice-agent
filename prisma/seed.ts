import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.agentActionLog.deleteMany();
  await prisma.conversationSession.deleteMany();
  await prisma.payrollItem.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.complianceEvent.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.taxRule.deleteMany();
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();

  const business = await prisma.business.create({
    data: {
      name: "Kofi Designs Studio",
      country: "GH",
      currency: "GHS",
      taxId: "C0001234567",
      phone: "+233241234567",
      address: "14 Oxford Street, Osu, Accra",
    },
  });

  await prisma.user.create({
    data: {
      businessId: business.id,
      name: "Kofi Mensah",
      email: "kofi@kofidesigns.gh",
      phone: "+233241234567",
      role: "owner",
    },
  });

  await prisma.taxRule.create({
    data: {
      businessId: business.id,
      name: "Standard Ghana VAT",
      vatRate: 0.15,
      whtRate: 0.075,
      isDefault: true,
    },
  });

  const customers = await Promise.all([
    prisma.customer.create({
      data: { businessId: business.id, name: "Ama Adjei", phone: "+233209876543", email: "ama@techhub.gh" },
    }),
    prisma.customer.create({
      data: { businessId: business.id, name: "Kwame Boateng", phone: "+233551112233" },
    }),
    prisma.customer.create({
      data: { businessId: business.id, name: "GreenLeaf Clinic", phone: "+233302223344", email: "accounts@greenleaf.gh" },
    }),
  ]);

  const dueDate1 = new Date();
  dueDate1.setDate(dueDate1.getDate() + 7);
  const dueDate2 = new Date();
  dueDate2.setDate(dueDate2.getDate() - 5); // overdue

  const inv1 = await prisma.invoice.create({
    data: {
      businessId: business.id,
      customerId: customers[0].id,
      invoiceNumber: "INV-001",
      status: "SENT",
      currency: "GHS",
      subtotal: 1200,
      vatAmount: 180,
      whtAmount: 0,
      total: 1380,
      amountPaid: 0,
      dueDate: dueDate1,
      items: {
        create: { description: "Website redesign", quantity: 1, unitPrice: 1200, amount: 1200 },
      },
    },
  });

  const inv2 = await prisma.invoice.create({
    data: {
      businessId: business.id,
      customerId: customers[1].id,
      invoiceNumber: "INV-002",
      status: "OVERDUE",
      currency: "GHS",
      subtotal: 800,
      vatAmount: 120,
      whtAmount: 0,
      total: 920,
      amountPaid: 400,
      dueDate: dueDate2,
      items: {
        create: { description: "Logo & branding package", quantity: 1, unitPrice: 800, amount: 800 },
      },
    },
  });

  await prisma.invoice.create({
    data: {
      businessId: business.id,
      customerId: customers[2].id,
      invoiceNumber: "INV-003",
      status: "PAID",
      currency: "GHS",
      subtotal: 2500,
      vatAmount: 375,
      whtAmount: 187.5,
      total: 2687.5,
      amountPaid: 2687.5,
      dueDate: new Date(),
      items: {
        create: { description: "Clinic management portal", quantity: 1, unitPrice: 2500, amount: 2500 },
      },
    },
  });

  await prisma.payment.create({
    data: {
      businessId: business.id,
      invoiceId: inv2.id,
      amount: 400,
      currency: "GHS",
      method: "MTN_MOMO",
      status: "CONFIRMED",
      reference: "MM20260715001",
      payerName: "Kwame Boateng",
    },
  });

  await prisma.payment.create({
    data: {
      businessId: business.id,
      amount: 2687.5,
      currency: "GHS",
      method: "BANK_TRANSFER",
      status: "CONFIRMED",
      reference: "GTB-20260701-8899",
      payerName: "GreenLeaf Clinic",
    },
  });

  const employees = await Promise.all([
    prisma.employee.create({ data: { businessId: business.id, name: "Efua Asante", role: "Designer", salary: 3500 } }),
    prisma.employee.create({ data: { businessId: business.id, name: "Yaw Osei", role: "Developer", salary: 4500 } }),
    prisma.employee.create({ data: { businessId: business.id, name: "Abena Darko", role: "Admin", salary: 2800 } }),
  ]);

  const now = new Date();
  await prisma.payrollRun.create({
    data: {
      businessId: business.id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      totalGross: 10800,
      totalNet: 9180,
      totalDeductions: 1620,
      status: "draft",
      items: {
        create: employees.map((e) => ({
          employeeId: e.id,
          grossPay: e.salary,
          ssnitDeduction: e.salary * 0.055,
          taxDeduction: e.salary * 0.05,
          netPay: e.salary * 0.895,
        })),
      },
    },
  });

  const vatDue = new Date(now.getFullYear(), now.getMonth() + 1, 15);
  await prisma.complianceEvent.create({
    data: {
      businessId: business.id,
      type: "VAT_FILING",
      title: "Monthly VAT Return (GRA e-VAT)",
      dueDate: vatDue,
      status: "UPCOMING",
      description: "File VAT return for current month via GRA portal",
    },
  });

  await prisma.complianceEvent.create({
    data: {
      businessId: business.id,
      type: "PAYROLL",
      title: "Staff salary payout",
      dueDate: new Date(now.getFullYear(), now.getMonth(), 28),
      status: "UPCOMING",
      description: "Process mobile money payroll for 3 staff",
    },
  });

  console.log(`✅ Seeded business: ${business.name} (${business.id})`);
  console.log(`   Invoices: INV-001 (unpaid), INV-002 (partial), INV-003 (paid)`);
  console.log(`   Set DEFAULT_BUSINESS_ID=${business.id} in .env`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
