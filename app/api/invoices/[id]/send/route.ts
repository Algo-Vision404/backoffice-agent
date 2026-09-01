import { NextRequest, NextResponse } from "next/server";
import { sendInvoice } from "@/agents/tools/send-invoice";
import { getTenant } from "@/lib/tenant";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenant = await getTenant();
  const result = await sendInvoice({ invoice_id: id }, tenant);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    message: result.message,
    data: result.data,
  });
}
