import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  initiateClusterReportUnlock,
  getPaymentStatus,
  CLUSTER_REPORT_PRICE_KES,
} from "@/lib/payments.functions";

type FlowState = "idle" | "submitting" | "polling" | "success" | "failed";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20; // ~1 minute

export function ClusterReportPaywall({
  quizResultId,
  onUnlocked,
}: {
  quizResultId: string;
  onUnlocked: () => void;
}) {
  const initiate = useServerFn(initiateClusterReportUnlock);
  const checkStatus = useServerFn(getPaymentStatus);
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<FlowState>("idle");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPolling(id: string) {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const payment = await checkStatus({ data: { paymentId: id } });
        if (payment.status === "success") {
          if (pollRef.current) clearInterval(pollRef.current);
          setState("success");
          onUnlocked();
          return;
        }
        if (payment.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setState("failed");
          setError(payment.result_desc || "Payment was not completed.");
          return;
        }
      } catch {
        // transient poll error — keep trying until the attempt cap below
      }
      if (attempts >= MAX_POLL_ATTEMPTS && pollRef.current) {
        clearInterval(pollRef.current);
        setState("failed");
        setError("We didn't get confirmation in time. Check your phone or try again.");
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("submitting");
    try {
      const { paymentId } = await initiate({ data: { quizResultId, phoneNumber: phone } });
      setState("polling");
      startPolling(paymentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment");
      setState("idle");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-sm">
        Payment confirmed — your full report is unlocked below.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-clay">
        Unlock full report
      </p>
      <h3 className="mt-1 font-display text-lg font-bold">
        KES {CLUSTER_REPORT_PRICE_KES} via M-Pesa
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Get the full CBC pathway breakdown, all strengths, next steps and a downloadable PDF.
      </p>

      {state === "polling" ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-background p-4 text-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Check your phone and enter your M-Pesa PIN to complete the payment…
        </div>
      ) : (
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
            disabled={state === "submitting"}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lift hover:opacity-95 disabled:opacity-60"
          >
            {state === "submitting" ? "Sending prompt…" : `Pay KES ${CLUSTER_REPORT_PRICE_KES}`}
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {state === "failed" && (
        <button
          type="button"
          onClick={() => {
            setState("idle");
            setError(null);
          }}
          className="mt-2 text-xs font-semibold text-primary hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
