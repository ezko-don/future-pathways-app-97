import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const REPORT_PRICE_KES = 350;

export interface BillingState {
  hasAccess: boolean;
  latestPayment: {
    id: string;
    status: string;
    amount_kes: number;
    phone: string;
    mpesa_receipt: string | null;
    result_desc: string | null;
    checkout_request_id: string | null;
    created_at: string;
  } | null;
  subscription: {
    plan: string;
    status: string;
    current_period_end: string | null;
  } | null;
}

export const getBillingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BillingState> => {
    const { supabase, userId } = context;

    const [{ data: payment }, { data: sub }] = await Promise.all([
      supabase
        .from("payments")
        .select(
          "id, status, amount_kes, phone, mpesa_receipt, result_desc, checkout_request_id, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("plan, status, current_period_end")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const { count } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "success");

    const subActive =
      !!sub &&
      sub.status === "active" &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

    return {
      hasAccess: (count ?? 0) > 0 || subActive,
      latestPayment: payment ?? null,
      subscription: sub ?? null,
    };
  });

export const initiateMpesaPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        phone: z.string().min(9).max(15),
        quizResultId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { normalizeKenyanPhone, isValidKenyanPhone, stkPush, REPORT_PRICE_KES: PRICE } =
      await import("@/lib/mpesa.server");

    if (!isValidKenyanPhone(data.phone)) {
      throw new Error("Enter a valid Safaricom number, e.g. 0712345678.");
    }
    const phone = normalizeKenyanPhone(data.phone);

    const push = await stkPush({
      phone,
      amount: PRICE,
      accountReference: "KaziFuture",
      description: "Cluster Report",
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("payments").insert({
      user_id: context.userId,
      quiz_result_id: data.quizResultId ?? null,
      amount_kes: PRICE,
      phone,
      status: "pending",
      merchant_request_id: push.MerchantRequestID,
      checkout_request_id: push.CheckoutRequestID,
    });
    if (error) throw new Error(error.message);

    return {
      checkoutRequestId: push.CheckoutRequestID,
      customerMessage: push.CustomerMessage,
    };
  });

export const getPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ checkoutRequestId: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("payments")
      .select("status, mpesa_receipt, result_desc")
      .eq("user_id", context.userId)
      .eq("checkout_request_id", data.checkoutRequestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ?? { status: "pending", mpesa_receipt: null, result_desc: null };
  });
