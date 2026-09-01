/**
 * Mock Mobile Money provider for MTN MoMo / Vodafone Cash.
 * Replace with real API integration in production.
 */

export interface MoMoPaymentRequest {
  amount: number;
  currency: "GHS" | "NGN";
  phone: string;
  reference: string;
  description?: string;
}

export interface MoMoPaymentResult {
  success: boolean;
  transactionId?: string;
  status: "pending" | "completed" | "failed";
  stubbed: boolean;
  message?: string;
}

export async function initiateMoMoPayment(
  request: MoMoPaymentRequest
): Promise<MoMoPaymentResult> {
  // Stub: simulate successful collection request
  console.log("[MoMo STUB] Payment request:", request);

  return {
    success: true,
    transactionId: `MOMO-${Date.now()}`,
    status: "pending",
    stubbed: true,
    message: `Payment request of ${request.currency} ${request.amount} sent to ${request.phone}. Awaiting customer approval.`,
  };
}

export async function checkMoMoTransaction(
  transactionId: string
): Promise<MoMoPaymentResult> {
  console.log("[MoMo STUB] Checking transaction:", transactionId);

  return {
    success: true,
    transactionId,
    status: "completed",
    stubbed: true,
    message: "Transaction completed (sandbox mock).",
  };
}
