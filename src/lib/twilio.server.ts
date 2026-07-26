// Twilio WhatsApp webhook helpers: signature verification + TwiML replies.
// Server-only module; only ever imported from whatsapp-webhook.server.ts
// (itself only imported from src/server.ts), so top-level imports here never
// reach the client bundle.
import { createHmac } from "node:crypto";

// Twilio signs each webhook request: base64(HMAC-SHA1(authToken, url + sorted "key"+"value" pairs)).
// https://www.twilio.com/docs/usage/webhooks/webhooks-security
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !signature) return false;

  const sortedKeys = Object.keys(params).sort();
  const data = sortedKeys.reduce((acc, key) => acc + key + params[key], url);
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64");

  return expected === signature;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildTwimlReply(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  return new Response(xml, { status: 200, headers: { "content-type": "text/xml" } });
}
