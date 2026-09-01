/**
 * Parse bank/MoMo CSV statements into payment records.
 * Supports common Ghana bank export formats (Date, Description, Amount, Reference).
 */
export interface ParsedBankRow {
  date: Date;
  description: string;
  amount: number;
  reference?: string;
  payerName?: string;
}

export function parseBankCsv(csvText: string): ParsedBankRow[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const rows: ParsedBankRow[] = [];

  const dateIdx = findColumn(header, ["date", "transaction date", "value date"]);
  const descIdx = findColumn(header, ["description", "narration", "details", "particulars"]);
  const amountIdx = findColumn(header, ["amount", "credit", "deposit", "value"]);
  const refIdx = findColumn(header, ["reference", "ref", "transaction id", "txn id"]);

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 2) continue;

    const amountStr = cols[amountIdx >= 0 ? amountIdx : cols.length - 1]
      ?.replace(/[,"]/g, "")
      .trim();
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) continue; // skip debits/withdrawals for now

    const dateStr = cols[dateIdx >= 0 ? dateIdx : 0];
    const description = cols[descIdx >= 0 ? descIdx : 1] ?? "";
    const reference = refIdx >= 0 ? cols[refIdx] : undefined;

    rows.push({
      date: parseDate(dateStr),
      description,
      amount: Math.abs(amount),
      reference,
      payerName: extractPayerName(description),
    });
  }

  return rows;
}

function findColumn(header: string, names: string[]): number {
  const cols = header.split(",");
  return cols.findIndex((c) => names.some((n) => c.trim().includes(n)));
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDate(str: string): Date {
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  // DD/MM/YYYY
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return new Date();
}

function extractPayerName(description: string): string | undefined {
  const momoMatch = description.match(/from\s+(.+?)(?:\s+-|\s+\d|$)/i);
  if (momoMatch) return momoMatch[1].trim();
  return description.split("-")[0]?.trim() || undefined;
}

export async function matchPaymentToInvoice(
  businessId: string,
  amount: number,
  reference?: string
): Promise<string | null> {
  const { default: prisma } = await import("@/lib/db");

  if (reference) {
    const byRef = await prisma.invoice.findFirst({
      where: {
        businessId,
        invoiceNumber: reference.toUpperCase().startsWith("INV") ? reference.toUpperCase() : undefined,
        status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
      },
    });
    if (byRef) return byRef.id;

    const allOpen = await prisma.invoice.findMany({
      where: {
        businessId,
        status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
      },
    });
    const fuzzy = allOpen.find((i) =>
      reference.toLowerCase().includes(i.invoiceNumber.toLowerCase())
    );
    if (fuzzy) return fuzzy.id;
  }

  const byAmount = await prisma.invoice.findFirst({
    where: {
      businessId,
      total: amount,
      status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
    },
    orderBy: { dueDate: "asc" },
  });

  return byAmount?.id ?? null;
}
