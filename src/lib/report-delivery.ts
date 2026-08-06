import { supabase } from "@/integrations/supabase/client";
import { generateReportPdf, type QuizReportData } from "@/lib/report-pdf";
import type { GuardianContact } from "@/hooks/useGuardianContacts";

/** Contact preselected for one-tap sharing. */
export function defaultContactFor(
  contacts: GuardianContact[] | null,
  mode: "whatsapp" | "email",
): GuardianContact | null {
  const usable = (contacts ?? []).filter((c) =>
    mode === "whatsapp" ? !!c.whatsapp : !!c.email,
  );
  return usable.find((c) => c.is_primary) ?? usable[0] ?? null;
}

export function contactValue(c: GuardianContact, mode: "whatsapp" | "email") {
  return (mode === "whatsapp" ? c.whatsapp : c.email) ?? "";
}

/**
 * Renders the report PDF in the browser, uploads it to the user's private
 * folder in the `reports` bucket and returns the storage path.
 */
export async function uploadReportPdf(
  userId: string,
  attemptId: string,
  report: QuizReportData,
): Promise<string> {
  const blob = generateReportPdf(report).output("blob") as Blob;
  const path = `${userId}/${attemptId}.pdf`;
  const { error } = await supabase.storage
    .from("reports")
    .upload(path, blob, { contentType: "application/pdf", upsert: true });
  if (error) throw error;
  return path;
}
