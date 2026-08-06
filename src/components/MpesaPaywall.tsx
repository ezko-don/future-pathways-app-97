import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getBillingState,
  initiateMpesaPayment,
  getPaymentStatus,
  REPORT_PRICE_KES,
  type BillingState,
} from "@/lib/payments.functions";

export function useBilling() {
  const fetchState = useServerFn(getBillingState);
  const [state, setState] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchState();
      setState(next);
    } catch {
      setState({ hasAccess: false, latestPayment: null, subscription: null });
    } finally {
      setLoading(false);
    }
  }, [fetchState]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { billing: state, loading, refresh };
}

export function MpesaPaywall({
  quizResultId,
  onUnlocked,
}: {
  quizResultId?: string;
  onUnlocked: () => void;
}) {
  const initiate = useServerFn(initiateMpesaPayment);
  const checkStatus = useServerFn(getPaymentStatus);
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<"idle" | "pushing" | "waiting" | "failed">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function pay() {
    setMessage(null);
    setStage("pushing");
    try {
      const res = await initiate({ data: { phone, quizResultId } });
      setStage("waiting");
      setMessage(res.customerMessage || "Check your phone and enter your M-Pesa PIN.");

      let attempts = 0;
      timer.current = setInterval(async () => {
        attempts += 1;
        try {
          const status = await checkStatus({
            data: { checkoutRequestId: res.checkoutRequestId },
          });
          if (status.status === "success") {
            if (timer.current) clearInterval(timer.current);
            setMessage(`Payment received${status.mpesa_receipt ? ` (${status.mpesa_receipt})` : ""}. Unlocking…`);
            onUnlocked();
          } else if (status.status === "failed") {
            if (timer.current) clearInterval(timer.current);
            setStage("failed");
            setMessage(status.result_desc || "Payment was not completed.");
          }
        } catch {
          /* keep polling */
        }
        if (attempts >= 40) {
          if (timer.current) clearInterval(timer.current);
          setStage("failed");
          setMessage("Timed out waiting for M-Pesa. If you were charged, refresh in a minute.");
        }
      }, 3000);
    } catch (err) {
      setStage("failed");
      setMessage(err instanceof Error ? err.message : "Could not start the payment.");
    }
  }

  const busy = stage === "pushing" || stage === "waiting";

  return (
    <div className="rounded-2xl border border-clay/30 bg-clay/5 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-clay">
        Unlock the full Cluster Report
      </p>
      <h3 className="mt-1 font-display text-2xl font-bold">
        KES {REPORT_PRICE_KES} · one-time M-Pesa payment
      </h3>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        The free view shows your top cluster and summary. Paying unlocks the full
        pathway breakdown, Kenyan career matches, next steps and the downloadable
        branded PDF — for this and every future attempt.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          disabled={busy}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0712 345 678"
          className="w-56 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={pay}
          disabled={busy || phone.trim().length < 9}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lift transition hover:opacity-95 disabled:opacity-60"
        >
          {stage === "pushing"
            ? "Sending STK push…"
            : stage === "waiting"
              ? "Waiting for your PIN…"
              : `Pay KES ${REPORT_PRICE_KES}`}
        </button>
      </div>

      {message && (
        <p
          className={`mt-3 text-sm ${stage === "failed" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
