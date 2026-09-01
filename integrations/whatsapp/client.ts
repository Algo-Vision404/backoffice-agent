/**
 * WhatsApp Business Cloud API client (stub mode when tokens not configured).
 */

export interface WhatsAppMessage {
  to: string;
  body: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  stubbed?: boolean;
}

export async function sendWhatsAppMessage(
  message: WhatsAppMessage
): Promise<WhatsAppSendResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.log("[WhatsApp STUB] Would send to", message.to, ":", message.body);
    return {
      success: true,
      messageId: `stub-${Date.now()}`,
      stubbed: true,
    };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: message.to.replace(/\D/g, ""),
          type: "text",
          text: { body: message.body },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error?.message ?? "WhatsApp API error" };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send WhatsApp message",
    };
  }
}

export function parseWhatsAppWebhook(body: unknown): {
  from: string;
  text: string;
  messageId: string;
} | null {
  const payload = body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            from: string;
            id: string;
            text?: { body: string };
            type: string;
          }>;
        };
      }>;
    }>;
  };

  const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message || message.type !== "text" || !message.text?.body) {
    return null;
  }

  return {
    from: message.from,
    text: message.text.body,
    messageId: message.id,
  };
}
