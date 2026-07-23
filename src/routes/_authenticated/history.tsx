import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile } from "@/hooks/useAuth";
import { useReportEntitlement } from "@/hooks/useReportEntitlement";
import { downloadReportPdf, type QuizReportData } from "@/lib/report-pdf";
import { ClusterReportPaywall } from "@/components/ClusterReportPaywall";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Quiz History · KaziFuture" },
      { name: "description", content: "Revisit past AI Navigator attempts and download reports." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryPage,
});

interface Attempt extends QuizReportData {
  id: string;
  created_at: string;
}

function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const profile = useProfile(user?.id);
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("quiz_results")
      .select("id, top_cluster, summary, strengths, pathways, next_steps, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setAttempts(
          (data ?? []).map((d) => ({
            id: d.id,
            top_cluster: d.top_cluster,
            summary: d.summary,
            strengths: d.strengths as string[],
            pathways: d.pathways as QuizReportData["pathways"],
            next_steps: d.next_steps as string[],
            created_at: d.created_at,
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function handleRetake() {
    const ok = window.confirm(
      "Start a new quiz attempt? Your previous results will be saved as a separate version in your history.",
    );
    if (ok) navigate({ to: "/quiz" });
  }

  function handleDownload(a: Attempt, version: number) {
    downloadReportPdf(
      { ...a, learner_name: profile?.full_name ?? undefined },
      `kazifuture-v${version}-${a.top_cluster.toLowerCase().replace(/\s+/g, "-")}.pdf`,
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grain">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="text-sm font-semibold hover:underline">
            ← Back to dashboard
          </Link>
          <button
            type="button"
            onClick={handleRetake}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lift hover:opacity-95"
          >
            Retake quiz
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-clay">
          Your quiz history
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-balance">
          Every attempt, every version.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Each retake is saved as a new version so you can compare how your interests
          evolve. Download any past report as a PDF.
        </p>

        <div className="mt-10 space-y-4">
          {attempts === null && (
            <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
          )}

          {attempts && attempts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">
                You haven't taken the quiz yet.
              </p>
              <Link
                to="/quiz"
                className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lift hover:opacity-95"
              >
                Take the quiz →
              </Link>
            </div>
          )}

          {attempts?.map((a, idx) => (
            <AttemptCard
              key={a.id}
              attempt={a}
              version={attempts.length - idx}
              isLatest={idx === 0}
              isOpen={expanded === a.id}
              onToggle={() => setExpanded(expanded === a.id ? null : a.id)}
              onDownload={(version) => handleDownload(a, version)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function AttemptCard({
  attempt: a,
  version,
  isLatest,
  isOpen,
  onToggle,
  onDownload,
}: {
  attempt: Attempt;
  version: number;
  isLatest: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onDownload: (version: number) => void;
}) {
  const { unlocked, loading: loadingEntitlement, refetch } = useReportEntitlement(a.id);
  const date = new Date(a.created_at).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">
              v{version}
            </span>
            {isLatest && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Latest
              </span>
            )}
            <span className="text-xs text-muted-foreground">{date}</span>
          </div>
          <h2 className="mt-2 font-display text-xl font-bold">{a.top_cluster}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground line-clamp-2">
            {a.summary}
          </p>
        </div>
        {!loadingEntitlement && unlocked && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onToggle}
              className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-secondary"
            >
              {isOpen ? "Hide details" : "View details"}
            </button>
            <button
              type="button"
              onClick={() => onDownload(version)}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lift hover:opacity-95"
            >
              ⬇ Download PDF
            </button>
          </div>
        )}
      </div>

      {!loadingEntitlement && !unlocked && (
        <div className="border-t border-border bg-background/40 p-6">
          <ClusterReportPaywall quizResultId={a.id} onUnlocked={refetch} />
        </div>
      )}

      {isOpen && unlocked && (
        <div className="border-t border-border bg-background/40 p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Strengths
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {a.strengths.map((s) => (
                  <li key={s}>• {s}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Next steps
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {a.next_steps.map((s) => (
                  <li key={s}>• {s}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Pathways
            </p>
            <ul className="mt-2 space-y-3 text-sm">
              {a.pathways.map((p) => (
                <li key={p.title} className="rounded-xl border border-border bg-card p-4">
                  <p className="font-semibold">
                    {p.title}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      — {p.cbc_track}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-foreground/80">{p.why_fit}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Kenyan careers: {p.kenyan_careers.join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </article>
  );
}
