// Server-only M-Pesa Daraja (STK Push) helpers.
// Never import this from client-reachable module scope.

export interface StkPushResult {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

function baseUrl(): string {
  const env = process.env["MPESA_ENV"] ?? "sandbox";
  return env === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

export function normalizeKenyanPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
  return digits;
}

export function isValidKenyanPhone(input: string): boolean {
  return /^254(7|1)\d{8}$/.test(normalizeKenyanPhone(input));
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(
    d.getUTCHours(),
  )}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `M-Pesa is not configured yet (missing ${name}). Add your Daraja credentials to enable payments.`,
    );
  }
  return value;
}

async function getAccessToken(): Promise<string> {
  const key = requireEnv("MPESA_CONSUMER_KEY");
  const secret = requireEnv("MPESA_CONSUMER_SECRET");
  const auth = btoa(`${key}:${secret}`);
  const res = await fetch(
    `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } },
  );
  if (!res.ok) {
    throw new Error(`M-Pesa auth failed [${res.status}]: ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("M-Pesa auth returned no token");
  return json.access_token;
}

export async function stkPush(opts: {
  phone: string;
  amount: number;
  accountReference: string;
  description: string;
}): Promise<StkPushResult> {
  const shortcode = requireEnv("MPESA_SHORTCODE");
  const passkey = requireEnv("MPESA_PASSKEY");
  const callbackUrl = requireEnv("MPESA_CALLBACK_URL");
  const ts = timestamp();
  const password = btoa(`${shortcode}${passkey}${ts}`);
  const token = await getAccessToken();
  const phone = normalizeKenyanPhone(opts.phone);

  const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: opts.amount,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: opts.accountReference.slice(0, 12),
      TransactionDesc: opts.description.slice(0, 13),
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`STK Push failed [${res.status}]: ${text}`);
  }
  const json = JSON.parse(text) as StkPushResult & { errorMessage?: string };
  if (json.errorMessage) throw new Error(`STK Push error: ${json.errorMessage}`);
  return json;
}

export interface MpesaCallbackPayload {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: { Item?: Array<{ Name: string; Value?: string | number }> };
    };
  };
}

export function parseCallback(payload: MpesaCallbackPayload) {
  const cb = payload.Body?.stkCallback;
  const items = cb?.CallbackMetadata?.Item ?? [];
  const find = (name: string) => items.find((i) => i.Name === name)?.Value;
  return {
    checkoutRequestId: cb?.CheckoutRequestID ?? null,
    merchantRequestId: cb?.MerchantRequestID ?? null,
    resultCode: typeof cb?.ResultCode === "number" ? cb.ResultCode : null,
    resultDesc: cb?.ResultDesc ?? null,
    receipt: (find("MpesaReceiptNumber") as string | undefined) ?? null,
    amount: (find("Amount") as number | undefined) ?? null,
  };
}

export const REPORT_PRICE_KES = 350;
