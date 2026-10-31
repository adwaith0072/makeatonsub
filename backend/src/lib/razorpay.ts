import "dotenv/config";
import crypto from "node:crypto";
import Razorpay from "razorpay";

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
}

export function getRazorpayConfig(): RazorpayConfig {
  const usingTestKeys = process.env.USE_TEST_RAZORPAY == "true"
  console.info(process.env.USE_TEST_RAZORPAY);
  console.info(
    `[Razorpay Configuration] Using ${usingTestKeys ? "test" : "live"} keys (${usingTestKeys ? "TEST_RAZORPAY_KEY_ID / TEST_RAZORPAY_KEY_SECRET" : "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET"}).`,
  );



  const keyId = usingTestKeys
    ? process.env.TEST_RAZORPAY_KEY_ID?.trim()
    : process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = usingTestKeys
    ? process.env.TEST_RAZORPAY_KEY_SECRET?.trim()
    : process.env.RAZORPAY_KEY_SECRET?.trim();

  const missing: string[] = [];
  if (!keyId) missing.push("RAZORPAY_KEY_ID");
  if (!keySecret) missing.push("RAZORPAY_KEY_SECRET");

  if (missing.length > 0) {
    console.error(
      `[Razorpay Configuration Error] Missing environment variable(s): ${missing.join(", ")}`,
    );
    throw new ConfigurationError(
      `Missing environment variable(s): ${missing.join(", ")}`,
    );
  }

  return { keyId: keyId!, keySecret: keySecret! };
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class ServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}

export class BadRequestError extends Error {
  description?: string;
  constructor(message: string, description?: string) {
    super(message);
    this.name = "BadRequestError";
    this.description = description;
  }
}

export class ContractMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractMismatchError";
  }
}

// Get Razorpay client instance
export function getRazorpayClient(): Razorpay {
  const { keyId, keySecret } = getRazorpayConfig();
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

// Exponential backoff retry helper for transient network timeouts or 5xx responses (max 2 retries)
async function executeWithRetry<T>(
  action: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 500,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await action();
    } catch (err: any) {
      const statusCode = Number(
        err?.statusCode ||
          err?.status ||
          err?.httpStatusCode ||
          err?.error?.code,
      );
      const is5xx = statusCode >= 500 && statusCode < 600;
      const isTimeout =
        err?.code === "ETIMEDOUT" ||
        err?.code === "ECONNRESET" ||
        err?.code === "ESOCKETTIMEDOUT" ||
        err?.name === "TimeoutError";

      // 401: Invalid credentials - do NOT retry
      if (statusCode === 401) {
        console.error(
          "[Razorpay API] 401 Unauthorized: Invalid API credentials.",
        );
        throw new ConfigurationError("Invalid Razorpay API credentials.");
      }

      // 4xx: Bad request - do NOT retry
      if (statusCode >= 400 && statusCode < 500) {
        const description =
          err?.error?.description ||
          err?.description ||
          err?.message ||
          "Bad Request";
        console.error(
          `[Razorpay API] Client error (${statusCode}):`,
          description,
        );
        throw new BadRequestError(
          err?.message || "Bad Request to Razorpay",
          description,
        );
      }

      // Retry on network timeout or 5xx server errors
      if ((is5xx || isTimeout) && attempt < maxRetries) {
        attempt++;
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(
          `[Razorpay API] Transient error (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (is5xx || isTimeout) {
        console.error(
          `[Razorpay API] Service unavailable after ${attempt} retries:`,
          err?.message || err,
        );
        throw new ServiceUnavailableError(
          "Payment provider service unavailable.",
        );
      }

      throw err;
    }
  }
}

export async function createRazorpayOrder(params: {
  amount: number; // in smallest currency subunit (paise)
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string; key_id: string }> {
  const { keyId } = getRazorpayConfig();
  const razorpay = getRazorpayClient();

  const orderPayload = {
    amount: Math.floor(params.amount),
    currency: (params.currency || "INR").toUpperCase(),
    receipt: params.receipt.slice(0, 40),
    notes: params.notes || {},
  };

  const razorpayOrder = await executeWithRetry(async () => {
    return await razorpay.orders.create(orderPayload);
  });

  if (!razorpayOrder || !razorpayOrder.id) {
    console.error(
      "[Razorpay Contract Mismatch] Order response missing 'id' field.",
    );
    throw new ContractMismatchError(
      "Razorpay order response missing order id.",
    );
  }

  return {
    id: razorpayOrder.id,
    amount: Number(razorpayOrder.amount),
    currency: razorpayOrder.currency,
    key_id: keyId,
  };
}

export function verifyRazorpaySignature(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): boolean {
  const { keySecret } = getRazorpayConfig();

  const payload = `${params.razorpay_order_id}|${params.razorpay_payment_id}`;
  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(payload)
    .digest("hex");

  const expectedBuffer = Buffer.from(generatedSignature, "utf8");
  const receivedBuffer = Buffer.from(params.razorpay_signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function fetchRazorpayOrderPayments(
  orderId: string,
): Promise<any> {
  const razorpay = getRazorpayClient();

  return await executeWithRetry(async () => {
    return await razorpay.orders.fetchPayments(orderId);
  });
}

