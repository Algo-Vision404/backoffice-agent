import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/agents/orchestrator";
import { getWebhookTenant } from "@/lib/auth/session";
import { verifyWhatsAppSignature } from "@/lib/auth/whatsapp";
import {
  parseWhatsAppWebhook,
  sendWhatsAppMessage,
} from "@/integrations/whatsapp/client";
import prisma from "@/lib/db";

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

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (!verifyWhatsAppSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const body = JSON.parse(rawBody);
    const parsed = parseWhatsAppWebhook(body);

    if (!parsed) {
      return NextResponse.json({ status: "ignored" });
    }

    const tenant = await getWebhookTenant();

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

    if (response.sessionId) {
      await prisma.conversationSession.update({
        where: { id: response.sessionId },
        data: { phone: parsed.from },
      });
    }

    await sendWhatsAppMessage({ to: parsed.from, body: response.reply });

    return NextResponse.json({ status: "ok", toolActions: response.toolActions });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
