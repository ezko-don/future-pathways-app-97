import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/mpesa/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return Response.json({ ResultCode: 1, ResultDesc: "Invalid body" }, { status: 400 });
        }

        const { parseCallback } = await import("@/lib/mpesa.server");
        const parsed = parseCallback(payload as never);

        if (!parsed.checkoutRequestId) {
          return Response.json(
            { ResultCode: 1, ResultDesc: "Missing CheckoutRequestID" },
            { status: 400 },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("id, user_id, status")
          .eq("checkout_request_id", parsed.checkoutRequestId)
          .maybeSingle();

        if (!payment) {
          // Unknown reference — acknowledge so Daraja stops retrying.
          return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
        }

        // Idempotent: never downgrade an already-successful payment.
        if (payment.status === "success") {
          return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
        }

        const success = parsed.resultCode === 0;

        await supabaseAdmin
          .from("payments")
          .update({
            status: success ? "success" : "failed",
            result_code: parsed.resultCode,
            result_desc: parsed.resultDesc,
            mpesa_receipt: parsed.receipt,
            merchant_request_id: parsed.merchantRequestId,
            raw_callback: payload as never,
          })
          .eq("id", payment.id);

        if (success) {
          await supabaseAdmin.from("subscriptions").upsert(
            {
              user_id: payment.user_id,
              plan: "cluster_report",
              status: "active",
              current_period_end: null,
            },
            { onConflict: "user_id,plan" },
          );
        }

        return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
      },
    },
  },
});
