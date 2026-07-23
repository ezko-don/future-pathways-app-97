// Raw HTTP handler for Safaricom's Daraja STK Push callback webhook.
// Wired into src/server.ts, which intercepts POST /api/mpesa/callback/:secret
// before delegating to TanStack Start's normal SSR/router handling — this app
// has no file-based API-route mechanism, so the custom server entry is the
// extension point for a non-RPC endpoint.
//
// This module is itself .server.ts and is only ever imported from src/server.ts
// (never a route file or *.functions.ts), so importing supabaseAdmin at the top
// level here is safe — it will not be pulled into the client bundle.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseStkCallback } from "@/lib/mpesa.server";

const ACK_BODY = JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" });

function ack(): Response {
  return new Response(ACK_BODY, { status: 200, headers: { "content-type": "application/json" } });
}

// Daraja has no signature/HMAC on callbacks, so the secret path segment is the
// only guard. checkout_request_id is never returned to the client either, so
// guessing the secret alone can't be used to forge a specific payment's success.
export async function handleMpesaCallback(request: Request, secret: string): Promise<Response> {
  const expectedSecret = process.env.MPESA_CALLBACK_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    console.error("[mpesa-callback] Rejected callback: invalid secret");
    return new Response("Not found", { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (err) {
    console.error("[mpesa-callback] Failed to parse callback body", err);
    return ack();
  }

  let result: ReturnType<typeof parseStkCallback>;
  try {
    result = parseStkCallback(body);
  } catch (err) {
    console.error("[mpesa-callback] Invalid callback payload", err);
    return ack();
  }

  const status = result.resultCode === 0 ? "success" : "failed";

  // Daraja retries on anything but a 200 acknowledgement, so this must always
  // ack — even if supabaseAdmin itself throws (e.g. missing service-role key)
  // — to avoid a retry storm masking the real underlying failure.
  try {
    const { error } = await supabaseAdmin
      .from("payments")
      .update({
        status,
        mpesa_receipt: result.mpesaReceipt,
        result_desc: result.resultDesc,
      })
      .eq("checkout_request_id", result.checkoutRequestId);

    if (error) {
      console.error("[mpesa-callback] Failed to update payment", error);
    }
  } catch (err) {
    console.error("[mpesa-callback] Unexpected error updating payment", err);
  }

  return ack();
}
