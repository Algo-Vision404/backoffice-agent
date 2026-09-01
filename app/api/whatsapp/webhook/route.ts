import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/agents/orchestrator";
import { getTenant } from "@/lib/tenant";
import {
  parseWhatsAppWebhook,
  sendWhatsAppMessage,
} from "@/integrations/whatsapp/client";
import prisma from "@/lib/db";

/**
 * GET /api/whatsapp/webhook — Meta webhook verification
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST /api/whatsapp/webhook — Incoming WhatsApp messages
 * Routes to the same agent orchestrator as web chat.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseWhatsAppWebhook(body);

    if (!parsed) {
      return NextResponse.json({ status: "ignored" });
    }

    const tenant = await getTenant();

    // Find or create WhatsApp session by phone
    let session = await prisma.conversationSession.findFirst({
      where: { businessId: tenant.businessId, phone: parsed.from, channel: "whatsapp" },
      orderBy: { updatedAt: "desc" },
    });

    const response = await runAgent({
      message: parsed.text,
      sessionId: session?.id,
      channel: "whatsapp",
      tenant,
    });

    // Persist phone on session
    if (response.sessionId) {
      await prisma.conversationSession.update({
        where: { id: response.sessionId },
        data: { phone: parsed.from },
      });
    }

    // Reply via WhatsApp
    await sendWhatsAppMessage({ to: parsed.from, body: response.reply });

    return NextResponse.json({ status: "ok", toolActions: response.toolActions });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
