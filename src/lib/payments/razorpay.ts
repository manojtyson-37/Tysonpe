import Razorpay from "razorpay";
import { verifyPaymentSignature, verifyWebhookSignature } from "./signature";
import type { PaymentProvider } from "./types";

export class RazorpayProvider implements PaymentProvider {
  readonly name = "razorpay" as const;
  private client: Razorpay;

  constructor(
    readonly publicKey: string,
    private keySecret: string,
    private webhookSecret: string,
  ) {
    this.client = new Razorpay({ key_id: publicKey, key_secret: keySecret });
  }

  async createOrder({ amountPaise, receipt }: { amountPaise: number; receipt: string }) {
    const o = await this.client.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: receipt.slice(0, 40),
    });
    return { providerOrderId: o.id };
  }
  verifyPayment(orderId: string, paymentId: string, signature: string) {
    return verifyPaymentSignature(orderId, paymentId, signature, this.keySecret);
  }
  verifyWebhook(rawBody: string, signature: string | null) {
    return verifyWebhookSignature(rawBody, signature, this.webhookSecret);
  }
}
