import prisma from "@/lib/db";
import type { TenantContext } from "@/lib/tenant";
import { buildSystemPrompt } from "@/agents/system-prompt";
import { agentTools, getToolByName } from "@/agents/tools";
import type {
  AgentRequest,
  AgentResponse,
  AgentMessage,
  ToolResult,
} from "@/agents/types";
import { AgentActionType } from "@prisma/client";

/**
 * Agent Orchestrator
 *
 * Flow:
 * 1. Load/create conversation session
 * 2. Append user message to history
 * 3. Call LLM (live) or rule-based parser (mock)
 * 4. Execute any tool calls with tenant isolation
 * 5. Log actions and return natural-language reply
 */
export async function runAgent(request: AgentRequest): Promise<AgentResponse> {
  const tenant = request.tenant!;
  const channel = request.channel ?? "web";

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: tenant.businessId },
  });

  // Session management
  let session = request.sessionId
    ? await prisma.conversationSession.findFirst({
        where: { id: request.sessionId, businessId: tenant.businessId },
      })
    : null;

  if (!session) {
    session = await prisma.conversationSession.create({
      data: {
        businessId: tenant.businessId,
        channel,
        messages: "[]",
      },
    });
  }

  const history: AgentMessage[] = JSON.parse(session.messages);
  history.push({ role: "user", content: request.message });

  const toolActions: AgentResponse["toolActions"] = [];
  let reply: string;

  const useLiveAgent =
    process.env.AGENT_MODE === "live" && !!process.env.OPENAI_API_KEY;

  if (useLiveAgent) {
    reply = await runLiveAgent({
      business,
      history,
      tenant,
      channel,
      toolActions,
    });
  } else {
    reply = await runMockAgent({
      message: request.message,
      tenant,
      channel,
      toolActions,
    });
  }

  history.push({ role: "assistant", content: reply });

  await prisma.conversationSession.update({
    where: { id: session.id },
    data: { messages: JSON.stringify(history) },
  });

  return { reply, sessionId: session.id, toolActions };
}

async function runLiveAgent(params: {
  business: { name: string; country: string };
  history: AgentMessage[];
  tenant: TenantContext;
  channel: string;
  toolActions: AgentResponse["toolActions"];
}): Promise<string> {
  const { generateText, tool } = await import("ai");
  const { openai } = await import("@ai-sdk/openai");
  const { z } = await import("zod");

  const systemPrompt = buildSystemPrompt(params.business.name, params.business.country);

  const messages = params.history.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  const tools = Object.fromEntries(
    agentTools.map((t) => [
      t.name,
      tool({
        description: t.description,
        parameters: z.object({}).passthrough(),
        execute: async (args: Record<string, unknown>) => {
          const toolResult = await executeTool(
            t.name,
            args,
            params.tenant,
            params.channel
          );
          params.toolActions.push({
            toolName: t.name,
            success: toolResult.success,
            message: toolResult.message,
            data: toolResult.data,
          });
          return toolResult;
        },
      }),
    ])
  );

  const result = await generateText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages,
    tools,
    maxSteps: 5,
  });

  return result.text || "Done. Let me know if you need anything else.";
}

/** Rule-based mock agent for local dev without OpenAI API key */
async function runMockAgent(params: {
  message: string;
  tenant: TenantContext;
  channel: string;
  toolActions: AgentResponse["toolActions"];
}): Promise<string> {
  const msg = params.message.toLowerCase();

  // Create invoice pattern
  const invoiceMatch = params.message.match(
    /create\s+(?:an?\s+)?invoice\s+for\s+([^,]+),?\s+([\d,]+(?:\.\d+)?)\s*(ghs|ngn)?\s*(?:for\s+(.+?))?(?:,?\s*due\s+in\s+(\d+)\s+days?)?\.?$/i
  );

  if (invoiceMatch || (msg.includes("create") && msg.includes("invoice"))) {
    if (invoiceMatch) {
      const [, customer, amountStr, currency, description, dueDays] = invoiceMatch;
      const result = await executeTool(
        "create_invoice",
        {
          customer_name: customer.trim(),
          amount: parseFloat(amountStr.replace(/,/g, "")),
          currency: (currency?.toUpperCase() as "GHS" | "NGN") || "GHS",
          description: description?.trim() || "Professional services",
          due_days: dueDays ? parseInt(dueDays) : 14,
        },
        params.tenant,
        params.channel
      );
      params.toolActions.push({
        toolName: "create_invoice",
        success: result.success,
        message: result.message,
        data: result.data,
      });
      return result.success
        ? `${result.message}\n\nShall I send this invoice to the customer via WhatsApp?`
        : `Error: ${result.error}`;
    }
    return "I'd be happy to create an invoice. Please provide:\n• Customer name\n• Amount (e.g. 1,200 GHS)\n• Description\n• Due days (optional, default 14)\n\nExample: \"Create an invoice for Kofi, 1,200 GHS for web design, due in 14 days.\"";
  }

  // Unpaid invoices
  if (msg.includes("unpaid") || msg.includes("outstanding")) {
    const monthMatch = msg.match(/(january|february|march|april|may|june|july|august|september|october|november|december)/i);
    const months: Record<string, number> = {
      january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
      july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    };
    const now = new Date();
    const month = monthMatch ? months[monthMatch[1].toLowerCase()] : now.getMonth() + 1;

    const result = await executeTool(
      "list_unpaid_invoices",
      { month, year: now.getFullYear() },
      params.tenant,
      params.channel
    );
    params.toolActions.push({
      toolName: "list_unpaid_invoices",
      success: result.success,
      message: result.message,
      data: result.data,
    });

    const data = result.data as { invoices?: Array<{ invoiceNumber: string; customer: string; outstanding: number; currency: string }>; totalOutstanding?: number };
    if (!data?.invoices?.length) {
      return result.message ?? "No unpaid invoices found.";
    }

    const lines = data.invoices.map(
      (i) => `• ${i.invoiceNumber} — ${i.customer}: ${i.currency} ${i.outstanding.toFixed(2)}`
    );
    return `${result.message}\n\n${lines.join("\n")}`;
  }

  // VAT summary
  const vatMatch = msg.match(/vat.*?(january|february|march|april|may|june|july|august|september|october|november|december)/i);
  if (msg.includes("vat") || msg.includes("tax") || msg.includes("wht")) {
    const months: Record<string, number> = {
      january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
      july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    };
    const now = new Date();
    const month = vatMatch ? months[vatMatch[1].toLowerCase()] : now.getMonth() + 1;

    const result = await executeTool(
      "compute_vat_wht_summary",
      { month, year: now.getFullYear() },
      params.tenant,
      params.channel
    );
    params.toolActions.push({
      toolName: "compute_vat_wht_summary",
      success: result.success,
      message: result.message,
      data: result.data,
    });
    return result.success
      ? `${result.message}\n\n(This is a report only — not filed with GRA.)`
      : `Error: ${result.error}`;
  }

  // Record payment
  if (msg.includes("record") && msg.includes("payment")) {
    const payMatch = params.message.match(
      /([\d,]+(?:\.\d+)?)\s*(ghs|ngn)?.*?(?:for\s+)?(inv-\d+)/i
    );
    if (payMatch) {
      const result = await executeTool(
        "record_payment",
        {
          amount: parseFloat(payMatch[1].replace(/,/g, "")),
          invoice_number: payMatch[3].toUpperCase(),
          payment_method: msg.includes("momo") ? "MTN_MOMO" : "BANK_TRANSFER",
        },
        params.tenant,
        params.channel
      );
      params.toolActions.push({
        toolName: "record_payment",
        success: result.success,
        message: result.message,
        data: result.data,
      });
      return result.success ? result.message! : `Error: ${result.error}`;
    }
    return "To record a payment, tell me the amount and invoice number.\n\nExample: \"Record payment of 1,200 GHS for INV-001 via MoMo\"";
  }

  // Payroll
  if (msg.includes("payroll") || msg.includes("staff salary") || msg.includes("prepare payroll")) {
    const now = new Date();
    const result = await executeTool(
      "prepare_payroll",
      { month: now.getMonth() + 1, year: now.getFullYear() },
      params.tenant,
      params.channel
    );
    params.toolActions.push({
      toolName: "prepare_payroll",
      success: result.success,
      message: result.message,
      data: result.data,
    });

    if (!result.success) return `Error: ${result.error}`;

    const data = result.data as {
      items?: Array<{ name: string; net: number }>;
      currency?: string;
      totalNet?: number;
    };
    const lines = (data.items ?? []).map(
      (i) => `• ${i.name}: ${data.currency} ${i.net.toFixed(2)}`
    );
    return `${result.message}\n\n${lines.join("\n")}\n\nTotal net: ${data.currency} ${data.totalNet?.toFixed(2)}`;
  }

  // Send invoice via WhatsApp
  if (msg.includes("send") && msg.includes("invoice")) {
    const invMatch = params.message.match(/(inv-\d+)/i);
    if (invMatch) {
      const result = await executeTool(
        "send_invoice",
        { invoice_number: invMatch[1].toUpperCase() },
        params.tenant,
        params.channel
      );
      params.toolActions.push({ toolName: "send_invoice", success: result.success, message: result.message, data: result.data });
      return result.success ? result.message! : `Error: ${result.error}`;
    }
    return "Which invoice should I send? Provide the invoice number, e.g. \"Send invoice INV-001 via WhatsApp\"";
  }

  // Compliance deadlines
  if (msg.includes("deadline") || msg.includes("compliance") || msg.includes("remind")) {
    const result = await executeTool("list_compliance_events", {}, params.tenant, params.channel);
    params.toolActions.push({ toolName: "list_compliance_events", success: result.success, message: result.message, data: result.data });
    return result.message ?? "No upcoming deadlines.";
  }

  // Help / greeting
  if (msg.match(/^(hi|hello|hey|help|what can you)/)) {
    return `Hello. I'm your back-office assistant. I can help with:

Invoices — "Create an invoice for Kofi, 1,200 GHS for web design"
Send — "Send invoice INV-001 via WhatsApp"
Payments — "Record payment of 1,200 GHS for INV-001"
Import — paste bank CSV or use Payments page
Tax — "How much VAT do I owe for July?"
Deadlines — "Show compliance deadlines"

What would you like to do?`;
  }

  return "I'm not sure I understood that. Try:\n• \"Create an invoice for [customer], [amount] GHS for [service]\"\n• \"Show unpaid invoices this month\"\n• \"How much VAT do I owe for July?\"\n• \"Record payment of [amount] for INV-001\"";
}

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  tenant: TenantContext,
  channel: string
): Promise<ToolResult> {
  const tool = getToolByName(toolName);
  if (!tool) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }

  let result: ToolResult;
  try {
    result = await tool.execute(args, tenant);
  } catch (err) {
    result = {
      success: false,
      error: err instanceof Error ? err.message : "Tool execution failed",
    };
  }

  // Audit log for money/tax actions
  const actionTypeMap: Record<string, AgentActionType> = {
    create_invoice: "CREATE_INVOICE",
    record_payment: "RECORD_PAYMENT",
    compute_vat_wht_summary: "COMPUTE_TAX",
    prepare_payroll: "PREPARE_PAYROLL",
    send_invoice: "SEND_MESSAGE",
    import_bank_statement: "RECORD_PAYMENT",
    list_compliance_events: "OTHER",
    list_unpaid_invoices: "OTHER",
  };

  await prisma.agentActionLog.create({
    data: {
      businessId: tenant.businessId,
      actionType: actionTypeMap[toolName] ?? "OTHER",
      toolName,
      input: JSON.stringify(args),
      output: JSON.stringify(result),
      success: result.success,
      channel,
    },
  });

  return result;
}
