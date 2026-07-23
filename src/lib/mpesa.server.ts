// Safaricom M-Pesa Daraja API client (STK Push / Lipa Na M-Pesa Online).
// Server-only module: safe to import at the top level from other .server.ts
// files, but must be dynamically imported inside handler bodies from any
// *.functions.ts or route file, since those ship to the client bundle.
//
// Required environment variables (configure out-of-band, never commit to .env):
//   MPESA_ENV                 "sandbox" (default) | "production"
//   MPESA_CONSUMER_KEY        Daraja app consumer key
//   MPESA_CONSUMER_SECRET     Daraja app consumer secret
//   MPESA_SHORTCODE           Paybill/till business shortcode (sandbox default: 174379)
//   MPESA_PASSKEY             Lipa Na M-Pesa Online passkey
//   MPESA_CALLBACK_BASE_URL   Public base URL Safaricom can reach, e.g. https://your-app.example.com
//   MPESA_CALLBACK_SECRET     Random path segment guarding the callback endpoint

const SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke";
const PRODUCTION_BASE_URL = "https://api.safaricom.co.ke";

function getBaseUrl(): string {
  return process.env.MPESA_ENV === "production" ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable. Configure M-Pesa Daraja credentials.`);
  }
  return value;
}

export function normalizePhoneNumber(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9)
    return `254${digits}`;
  throw new Error("Enter a valid Kenyan phone number, e.g. 0712345678.");
}

async function getAccessToken(): Promise<string> {
  const consumerKey = requireEnv("MPESA_CONSUMER_KEY");
  const consumerSecret = requireEnv("MPESA_CONSUMER_SECRET");
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const res = await fetch(`${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) throw new Error(`M-Pesa auth failed: ${await res.text()}`);

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("M-Pesa auth did not return an access token");
  return json.access_token;
}

function buildTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
}

export async function initiateStkPush(params: {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}): Promise<StkPushResult> {
  const shortcode = requireEnv("MPESA_SHORTCODE");
  const passkey = requireEnv("MPESA_PASSKEY");
  const callbackSecret = requireEnv("MPESA_CALLBACK_SECRET");
  const callbackBaseUrl = requireEnv("MPESA_CALLBACK_BASE_URL");

  const timestamp = buildTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  const accessToken = await getAccessToken();

  const res = await fetch(`${getBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: params.amount,
      PartyA: params.phoneNumber,
      PartyB: shortcode,
      PhoneNumber: params.phoneNumber,
      CallBackURL: `${callbackBaseUrl}/api/mpesa/callback/${callbackSecret}`,
      AccountReference: params.accountReference,
      TransactionDesc: params.transactionDesc,
    }),
  });

  const json = (await res.json()) as {
    ResponseCode?: string;
    ResponseDescription?: string;
    errorMessage?: string;
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
  };

  if (!res.ok || json.ResponseCode !== "0") {
    throw new Error(json.errorMessage || json.ResponseDescription || "M-Pesa STK push failed");
  }
  if (!json.MerchantRequestID || !json.CheckoutRequestID) {
    throw new Error("M-Pesa STK push response missing request IDs");
  }

  return {
    merchantRequestId: json.MerchantRequestID,
    checkoutRequestId: json.CheckoutRequestID,
  };
}

export interface StkCallbackResult {
  checkoutRequestId: string;
  merchantRequestId: string;
  resultCode: number;
  resultDesc: string;
  mpesaReceipt: string | null;
}

export function parseStkCallback(body: unknown): StkCallbackResult {
  const stkCallback = (body as { Body?: { stkCallback?: Record<string, unknown> } })?.Body
    ?.stkCallback;
  if (!stkCallback) throw new Error("Invalid M-Pesa callback payload");

  const items =
    (
      stkCallback.CallbackMetadata as
        { Item?: Array<{ Name: string; Value?: string | number }> } | undefined
    )?.Item ?? [];
  const receiptItem = items.find((i) => i.Name === "MpesaReceiptNumber");

  const checkoutRequestId = stkCallback.CheckoutRequestID;
  const merchantRequestId = stkCallback.MerchantRequestID;
  const resultCode = stkCallback.ResultCode;
  const resultDesc = stkCallback.ResultDesc;

  if (typeof checkoutRequestId !== "string" || typeof resultCode !== "number") {
    throw new Error("Invalid M-Pesa callback payload");
  }

  return {
    checkoutRequestId,
    merchantRequestId: typeof merchantRequestId === "string" ? merchantRequestId : "",
    resultCode,
    resultDesc: typeof resultDesc === "string" ? resultDesc : "",
    mpesaReceipt: receiptItem ? String(receiptItem.Value) : null,
  };
}
