import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/agents/orchestrator";
import { getTenant } from "@/lib/tenant";

/**
 * POST /api/agent/chat
 * Main agent endpoint — used by web chat UI and WhatsApp webhook.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId, channel } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const tenant = await getTenant();

    const response = await runAgent({
      message,
      sessionId,
      channel: channel ?? "web",
      tenant,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error("Agent error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent failed" },
      { status: 500 }
    );
  }
}
