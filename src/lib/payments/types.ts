export type ProviderName = "razorpay" | "mock";

export interface PaymentProvider {
  readonly name: ProviderName;
  /** Public key id for the browser checkout widget (null for mock). */
  readonly publicKey: string | null;
  createOrder(input: { amountPaise: number; receipt: string }): Promise<{ providerOrderId: string }>;
  verifyPayment(providerOrderId: string, paymentId: string, signature: string): boolean;
  verifyWebhook(rawBody: string, signature: string | null): boolean;
}
