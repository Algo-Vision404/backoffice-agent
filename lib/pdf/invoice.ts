import { formatCurrency, formatDate } from "@/lib/utils";

interface InvoicePdfData {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  status: string;
  currency: string;
  subtotal: number;
  vatAmount: number;
  whtAmount: number;
  total: number;
  notes?: string | null;
  business: {
    name: string;
    address?: string | null;
    phone?: string | null;
    taxId?: string | null;
  };
  customer: {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
}

export function generateInvoiceHtml(data: InvoicePdfData): string {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e5e5">${item.description}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e5e5;text-align:center">${item.quantity}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e5e5;text-align:right">${formatCurrency(item.unitPrice, data.currency)}</td>
        <td style="padding:12px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:600">${formatCurrency(item.amount, data.currency)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0a0a0a; padding: 48px; max-width: 800px; margin: 0 auto; }
    @media print { body { padding: 24px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;margin-bottom:48px">
    <div>
      <h1 style="font-size:24px;font-weight:600;letter-spacing:-0.5px">${data.business.name}</h1>
      ${data.business.address ? `<p style="color:#737373;font-size:13px;margin-top:4px">${data.business.address}</p>` : ""}
      ${data.business.phone ? `<p style="color:#737373;font-size:13px">${data.business.phone}</p>` : ""}
      ${data.business.taxId ? `<p style="color:#737373;font-size:13px">TIN: ${data.business.taxId}</p>` : ""}
    </div>
    <div style="text-align:right">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#737373">Invoice</p>
      <p style="font-size:20px;font-weight:600;margin-top:4px">${data.invoiceNumber}</p>
      <p style="color:#737373;font-size:13px;margin-top:8px">Issued: ${formatDate(data.issueDate)}</p>
      <p style="color:#737373;font-size:13px">Due: ${formatDate(data.dueDate)}</p>
    </div>
  </div>

  <div style="margin-bottom:32px;padding:16px;background:#fafafa;border-radius:8px">
    <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#737373;margin-bottom:4px">Bill to</p>
    <p style="font-weight:600">${data.customer.name}</p>
    ${data.customer.phone ? `<p style="color:#737373;font-size:13px">${data.customer.phone}</p>` : ""}
    ${data.customer.email ? `<p style="color:#737373;font-size:13px">${data.customer.email}</p>` : ""}
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:32px;font-size:14px">
    <thead>
      <tr style="border-bottom:2px solid #0a0a0a">
        <th style="text-align:left;padding:8px 0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#737373">Description</th>
        <th style="text-align:center;padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#737373">Qty</th>
        <th style="text-align:right;padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#737373">Rate</th>
        <th style="text-align:right;padding:8px 0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#737373">Amount</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div style="margin-left:auto;width:280px;font-size:14px">
    <div style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:#737373">Subtotal</span><span>${formatCurrency(data.subtotal, data.currency)}</span></div>
    ${data.vatAmount > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:#737373">VAT (15%)</span><span>${formatCurrency(data.vatAmount, data.currency)}</span></div>` : ""}
    ${data.whtAmount > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:#737373">WHT</span><span>-${formatCurrency(data.whtAmount, data.currency)}</span></div>` : ""}
    <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid #0a0a0a;margin-top:8px;font-size:18px;font-weight:600"><span>Total</span><span>${formatCurrency(data.total, data.currency)}</span></div>
  </div>

  ${data.notes ? `<p style="margin-top:32px;color:#737373;font-size:13px">${data.notes}</p>` : ""}

  <p style="margin-top:48px;color:#a3a3a3;font-size:11px;text-align:center">Generated by BackOffice Agent</p>

  <button class="no-print" onclick="window.print()" style="margin-top:24px;padding:10px 20px;background:#0a0a0a;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">Print / Save as PDF</button>
</body>
</html>`;
}

export function generateInvoiceWhatsAppText(data: InvoicePdfData, viewUrl: string): string {
  return `Invoice ${data.invoiceNumber} from ${data.business.name}

Amount: ${formatCurrency(data.total, data.currency)}
Due: ${formatDate(data.dueDate)}

${data.items.map((i) => `• ${i.description}: ${formatCurrency(i.amount, data.currency)}`).join("\n")}

View & download: ${viewUrl}`;
}
