import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CLUSTER_REPORT_PRICE_KES = 350;

const InitiateSchema = z.object({
  quizResultId: z.string().uuid(),
  phoneNumber: z.string().min(9),
});

export const initiateClusterReportUnlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InitiateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: quizResult, error: quizError } = await context.supabase
      .from("quiz_results")
      .select("id")
      .eq("id", data.quizResultId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (quizError) throw new Error(quizError.message);
    if (!quizResult) throw new Error("Quiz result not found");

    const { data: existing, error: existingError } = await context.supabase
      .from("payments")
      .select("id")
      .eq("quiz_result_id", data.quizResultId)
      .eq("user_id", context.userId)
      .eq("purpose", "cluster_report")
      .eq("status", "success")
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) throw new Error("This report is already unlocked.");

    const { normalizePhoneNumber, initiateStkPush } = await import("@/lib/mpesa.server");
    const phoneNumber = normalizePhoneNumber(data.phoneNumber);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment, error: insertError } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: context.userId,
        quiz_result_id: data.quizResultId,
        purpose: "cluster_report",
        amount_kes: CLUSTER_REPORT_PRICE_KES,
        phone_number: phoneNumber,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);

    try {
      const stk = await initiateStkPush({
        phoneNumber,
        amount: CLUSTER_REPORT_PRICE_KES,
        accountReference: "KaziFuture",
        transactionDesc: "Cluster Report",
      });

      const { error: updateError } = await supabaseAdmin
        .from("payments")
        .update({
          merchant_request_id: stk.merchantRequestId,
          checkout_request_id: stk.checkoutRequestId,
        })
        .eq("id", payment.id);
      if (updateError) throw new Error(updateError.message);

      return { paymentId: payment.id as string };
    } catch (err) {
      await supabaseAdmin
        .from("payments")
        .update({
          status: "failed",
          result_desc: err instanceof Error ? err.message : "STK push failed",
        })
        .eq("id", payment.id);
      throw err;
    }
  });

const StatusSchema = z.object({ paymentId: z.string().uuid() });

export const getPaymentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: payment, error } = await context.supabase
      .from("payments")
      .select("id, status, mpesa_receipt, result_desc")
      .eq("id", data.paymentId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!payment) throw new Error("Payment not found");
    return payment;
  });

const EntitlementSchema = z.object({ quizResultId: z.string().uuid() });

export const getReportEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EntitlementSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: payment, error: paymentError } = await context.supabase
      .from("payments")
      .select("id")
      .eq("quiz_result_id", data.quizResultId)
      .eq("user_id", context.userId)
      .eq("purpose", "cluster_report")
      .eq("status", "success")
      .maybeSingle();
    if (paymentError) throw new Error(paymentError.message);
    if (payment) return { unlocked: true as const, reason: "payment" as const };

    const { data: subscription, error: subError } = await context.supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .maybeSingle();
    if (subError) throw new Error(subError.message);
    if (subscription) return { unlocked: true as const, reason: "subscription" as const };

    return { unlocked: false as const, reason: null };
  });
