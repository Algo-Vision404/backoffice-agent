import { Prisma } from "@prisma/client";
import type { TenantContext } from "@/lib/tenant";

/** Structured result returned by every agent tool */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AgentMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolName?: string;
  toolResult?: ToolResult;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, tenant: TenantContext) => Promise<ToolResult>;
}

export type AgentChannel = "web" | "whatsapp";

export interface AgentRequest {
  message: string;
  sessionId?: string;
  channel?: AgentChannel;
  tenant?: TenantContext;
}

export interface AgentResponse {
  reply: string;
  sessionId: string;
  toolActions: Array<{
    toolName: string;
    success: boolean;
    message?: string;
    data?: unknown;
  }>;
}

export type InvoiceWithCustomer = Prisma.InvoiceGetPayload<{
  include: { customer: true; items: true };
}>;
