import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { mergeWhatsappIdentity } from "@/lib/whatsapp.functions";

export function LinkWhatsapp({ onLinked }: { onLinked: () => void }) {
  const merge = useServerFn(mergeWhatsappIdentity);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const result = await merge({ data: { phoneNumber: phone } });
      setNotice(
        result.mergedReportCount > 0
          ? `Linked! ${result.mergedReportCount} report${result.mergedReportCount === 1 ? "" : "s"} from WhatsApp now show up below.`
          : "Linked! Future WhatsApp reports on this number will show up here.",
      );
      setPhone("");
      onLinked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link that number");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-clay">
        Started on WhatsApp?
      </p>
      <h3 className="mt-1 font-display text-lg font-bold">Link your number</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Texted "START" to the KaziFuture WhatsApp Navigator? Link that number to see the report here
        and download it as a PDF.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap gap-2">
        <input
          type="tel"
          required
          placeholder="07XX XXX XXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
        >
          {submitting ? "Linking…" : "Link"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {notice && <p className="mt-3 text-sm text-primary">{notice}</p>}
    </div>
  );
}
