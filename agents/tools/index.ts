import type { ToolDefinition } from "@/agents/types";
import { createInvoiceTool } from "./create-invoice";
import { listUnpaidInvoicesTool } from "./list-unpaid-invoices";
import { recordPaymentTool } from "./record-payment";
import { computeVatWhtSummaryTool } from "./compute-vat-wht-summary";
import { preparePayrollTool } from "./prepare-payroll";
import { sendInvoiceTool } from "./send-invoice";
import { importBankStatementTool } from "./import-bank-statement";
import { listComplianceEventsTool } from "./list-compliance-events";

/** Registry of all agent tools */
export const agentTools: ToolDefinition[] = [
  createInvoiceTool,
  sendInvoiceTool,
  listUnpaidInvoicesTool,
  recordPaymentTool,
  importBankStatementTool,
  computeVatWhtSummaryTool,
  preparePayrollTool,
  listComplianceEventsTool,
];

export function getToolByName(name: string): ToolDefinition | undefined {
  return agentTools.find((t) => t.name === name);
}

export function getOpenAIToolDefinitions() {
  return agentTools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}
