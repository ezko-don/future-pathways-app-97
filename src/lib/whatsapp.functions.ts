import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizePhoneNumber } from "@/lib/phone";

const MergeSchema = z.object({ phoneNumber: z.string().min(9) });

// Links a WhatsApp-originated identity (and any quiz_results it produced) to
// the signed-in web account. User-initiated rather than automatic on login,
// since this app never collects a phone number at signup.
export const mergeWhatsappIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MergeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const phoneNumber = normalizePhoneNumber(data.phoneNumber);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: identity, error: identityError } = await supabaseAdmin
      .from("whatsapp_identities")
      .select("id, user_id")
      .eq("phone_number", phoneNumber)
      .maybeSingle();
    if (identityError) throw new Error(identityError.message);
    if (!identity) {
      throw new Error(
        "No WhatsApp activity found for that number. Text START to it on WhatsApp first.",
      );
    }
    if (identity.user_id && identity.user_id !== context.userId) {
      throw new Error("That WhatsApp number is already linked to a different account.");
    }

    if (identity.user_id !== context.userId) {
      const { error: linkError } = await supabaseAdmin
        .from("whatsapp_identities")
        .update({ user_id: context.userId })
        .eq("id", identity.id);
      if (linkError) throw new Error(linkError.message);
    }

    const { data: mergedReports, error: mergeError } = await supabaseAdmin
      .from("quiz_results")
      .update({ user_id: context.userId })
      .eq("whatsapp_identity_id", identity.id)
      .is("user_id", null)
      .select("id");
    if (mergeError) throw new Error(mergeError.message);

    return { linked: true, mergedReportCount: mergedReports?.length ?? 0 };
  });
