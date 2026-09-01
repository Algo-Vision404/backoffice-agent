import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/agents/orchestrator";
import { getTenant } from "@/lib/tenant";

/**
 * POST /api/whatsapp/test
 * Simulate an incoming WhatsApp message for local testing.
 */
export async function POST(req: NextRequest) {
  try {
    const { message, phone } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const tenant = await getTenant();

    const response = await runAgent({
      message,
      channel: "whatsapp",
      tenant,
    });

    return NextResponse.json({
      ...response,
      simulatedPhone: phone ?? "+233241234567",
      note: "WhatsApp reply would be sent in production. Response shown here for testing.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Test failed" },
      { status: 500 }
    );
  }
}
