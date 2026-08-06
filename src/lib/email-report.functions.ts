import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface ReportEmailResult {
  sent: boolean;
  reason?: "email_not_configured" | "recipient_suppressed" | "send_failed";
  pdfUrl: string;
  deliveryId: string;
  message: string;
}

/**
 * Creates a hosted (signed) link to an already-uploaded report PDF and emails
 * it to the chosen guardian address, logging the delivery attempt.
 */
export const emailReportLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        pdfPath: z.string().min(1).max(300),
        quizResultId: z.string().uuid().optional(),
        recipientEmail: z.string().email().max(254),
        recipientLabel: z.string().max(80).optional(),
        learnerName: z.string().max(120).optional(),
        topCluster: z.string().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<ReportEmailResult> => {
    const { supabase, userId } = context;

    // The path must live inside the caller's own folder.
    if (!data.pdfPath.startsWith(`${userId}/`)) {
      throw new Error("You can only send your own report.");
    }

    const { data: signed, error: signError } = await supabase.storage
      .from("reports")
      .createSignedUrl(data.pdfPath, SIGNED_URL_TTL_SECONDS);
    if (signError || !signed?.signedUrl) {
      throw new Error("Could not create a link to the report PDF.");
    }
    const pdfUrl = signed.signedUrl;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: delivery, error: logError } = await supabaseAdmin
      .from("report_deliveries")
      .insert({
        user_id: userId,
        quiz_result_id: data.quizResultId ?? null,
        recipient_email: data.recipientEmail,
        recipient_label: data.recipientLabel ?? null,
        pdf_path: data.pdfPath,
        pdf_url: pdfUrl,
        status: "pending",
      })
      .select("id")
      .single();
    if (logError || !delivery) throw new Error("Could not record the delivery.");

    async function finish(
      status: string,
      message: string,
      reason?: ReportEmailResult["reason"],
      error?: string,
    ): Promise<ReportEmailResult> {
      await supabaseAdmin
        .from("report_deliveries")
        .update({ status, error: error ?? null })
        .eq("id", delivery!.id);
      return {
        sent: status === "sent",
        ...(reason ? { reason } : {}),
        pdfUrl,
        deliveryId: delivery!.id,
        message,
      };
    }

    let sendTemplateEmail:
      | ((
          template: string,
          to: string,
          opts: { templateData?: Record<string, unknown>; idempotencyKey?: string },
        ) => Promise<{ sent: boolean; reason?: string }>)
      | null = null;
    try {
      const mod = await import("@/lib/email-templates/send-email");
      sendTemplateEmail = (mod as unknown as { sendTemplateEmail: typeof sendTemplateEmail })
        .sendTemplateEmail;
    } catch {
      sendTemplateEmail = null;
    }

    if (!sendTemplateEmail) {
      return finish(
        "email_not_configured",
        "Email sending isn't set up for this app yet, but the secure PDF link is ready to share.",
        "email_not_configured",
      );
    }

    try {
      const result = await sendTemplateEmail("report-delivery", data.recipientEmail, {
        templateData: {
          learnerName: data.learnerName ?? "your learner",
          topCluster: data.topCluster ?? "",
          pdfUrl,
        },
        idempotencyKey: `report-${delivery.id}`,
      });
      if (!result.sent) {
        return finish(
          "suppressed",
          "That address can't receive emails from us right now. Share the link instead.",
          "recipient_suppressed",
        );
      }
      return finish("sent", `Report emailed to ${data.recipientEmail}.`);
    } catch (err) {
      return finish(
        "failed",
        "We couldn't send the email. The secure PDF link is still available to share.",
        "send_failed",
        err instanceof Error ? err.message : "unknown error",
      );
    }
  });
