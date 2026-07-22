import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import type { QuizReportData } from "@/lib/report-pdf";

export const Route = createFileRoute("/_authenticated/compare")({
  head: () => ({
    meta: [
      { title: "Compare Attempts · KaziFuture" },
      { name: "description", content: "Compare how your AI pathway prediction changed between quiz versions." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ComparePage,
});

interface Attempt extends QuizReportData {
  id: string;
  created_at: string;
}

function ComparePage() {
  const { user } = useSession();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");

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
        const rows: Attempt[] = (data ?? []).map((d) => ({
          id: d.id,
          top_cluster: d.top_cluster,
          summary: d.summary,
          strengths: d.strengths as string[],
          pathways: d.pathways as QuizReportData["pathways"],
          next_steps: d.next_steps as string[],
          created_at: d.created_at,
        }));
        setAttempts(rows);
        if (rows[0]) setLeftId(rows[0].id);
        if (rows[1]) setRightId(rows[1].id);
        else if (rows[0]) setRightId(rows[0].id);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const left = useMemo(() => attempts?.find((a) => a.id === leftId) ?? null, [attempts, leftId]);
  const right = useMemo(() => attempts?.find((a) => a.id === rightId) ?? null, [attempts, rightId]);

  function versionLabel(id: string): string {
    if (!attempts) return "";
    const idx = attempts.findIndex((a) => a.id === id);
    if (idx < 0) return "";
    return `v${attempts.length - idx}`;
  }

  return (
    <div className="min-h-screen bg-background bg-grain">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="text-sm font-semibold hover:underline">
            ← Back to dashboard
          </Link>
          <Link to="/history" className="text-sm font-semibold hover:underline">
            View history
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-clay">
          Attempt comparison
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-balance">
          See how your pathway prediction evolved.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Pick any two attempts side-by-side. Shifts in top cluster, pathways,
          strengths and next steps are highlighted.
        </p>

        {attempts === null && (
          <div className="mt-10 h-40 animate-pulse rounded-2xl border border-border bg-card" />
        )}

        {attempts && attempts.length < 2 && (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              You need at least two attempts to compare. Retake the quiz to unlock
              this view.
            </p>
            <Link
              to="/quiz"
              className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lift hover:opacity-95"
            >
              Take the quiz →
            </Link>
          </div>
        )}

        {attempts && attempts.length >= 2 && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <AttemptPicker
                label="Version A"
                attempts={attempts}
                value={leftId}
                onChange={setLeftId}
              />
              <AttemptPicker
                label="Version B"
                attempts={attempts}
                value={rightId}
                onChange={setRightId}
              />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <AttemptColumn attempt={left} version={versionLabel(leftId)} accent="clay" />
              <AttemptColumn attempt={right} version={versionLabel(rightId)} accent="primary" />
            </div>

            {left && right && (
              <DiffPanel left={left} right={right} leftV={versionLabel(leftId)} rightV={versionLabel(rightId)} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function AttemptPicker({
  label,
  attempts,
  value,
  onChange,
}: {
  label: string;
  attempts: Attempt[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold"
      >
        {attempts.map((a, idx) => {
          const v = attempts.length - idx;
          const d = new Date(a.created_at).toLocaleDateString("en-KE", {
            dateStyle: "medium",
          });
          return (
            <option key={a.id} value={a.id}>
              v{v} — {a.top_cluster} ({d})
            </option>
          );
        })}
      </select>
    </label>
  );
}

function AttemptColumn({
  attempt,
  version,
  accent,
}: {
  attempt: Attempt | null;
  version: string;
  accent: "clay" | "primary";
}) {
  if (!attempt) return null;
  const headerCls =
    accent === "clay"
      ? "bg-clay/10 text-clay"
      : "bg-primary/10 text-primary";
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className={`px-6 py-4 ${headerCls}`}>
        <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
          {version} · {new Date(attempt.created_at).toLocaleDateString("en-KE", { dateStyle: "medium" })}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold">{attempt.top_cluster}</h2>
      </div>
      <div className="space-y-4 p-6">
        <p className="text-sm text-foreground/80">{attempt.summary}</p>
        <Block title="Pathways">
          <ul className="space-y-1 text-sm">
            {attempt.pathways.map((p) => (
              <li key={p.title}>
                <span className="font-semibold">{p.title}</span>{" "}
                <span className="text-muted-foreground">— {p.cbc_track}</span>
              </li>
            ))}
          </ul>
        </Block>
        <Block title="Strengths">
          <ul className="space-y-1 text-sm">
            {attempt.strengths.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </Block>
        <Block title="Next steps">
          <ul className="space-y-1 text-sm">
            {attempt.next_steps.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </Block>
      </div>
    </article>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function DiffPanel({
  left,
  right,
  leftV,
  rightV,
}: {
  left: Attempt;
  right: Attempt;
  leftV: string;
  rightV: string;
}) {
  const clusterChanged = left.top_cluster !== right.top_cluster;
  const leftPaths = new Set(left.pathways.map((p) => p.title));
  const rightPaths = new Set(right.pathways.map((p) => p.title));
  const added = [...rightPaths].filter((t) => !leftPaths.has(t));
  const removed = [...leftPaths].filter((t) => !rightPaths.has(t));
  const kept = [...leftPaths].filter((t) => rightPaths.has(t));

  const leftStr = new Set(left.strengths);
  const rightStr = new Set(right.strengths);
  const strengthsAdded = [...rightStr].filter((s) => !leftStr.has(s));
  const strengthsRemoved = [...leftStr].filter((s) => !rightStr.has(s));

  return (
    <section className="mt-10 rounded-3xl border border-border bg-card p-8 shadow-lift">
      <p className="text-xs font-semibold uppercase tracking-widest text-clay">
        What changed
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold">
        {leftV} → {rightV}
      </h2>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <DiffCard title="Top cluster">
          {clusterChanged ? (
            <p className="text-sm">
              Shifted from{" "}
              <span className="font-semibold text-clay">{left.top_cluster}</span> to{" "}
              <span className="font-semibold text-primary">{right.top_cluster}</span>.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Unchanged — still <span className="font-semibold text-foreground">{right.top_cluster}</span>.
            </p>
          )}
        </DiffCard>

        <DiffCard title="Pathways">
          <DiffList label="Added" tone="add" items={added} />
          <DiffList label="Dropped" tone="remove" items={removed} />
          <DiffList label="Kept" tone="keep" items={kept} />
        </DiffCard>

        <DiffCard title="Strengths">
          <DiffList label="New" tone="add" items={strengthsAdded} />
          <DiffList label="No longer flagged" tone="remove" items={strengthsRemoved} />
        </DiffCard>
      </div>
    </section>
  );
}

function DiffCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function DiffList({
  label,
  tone,
  items,
}: {
  label: string;
  tone: "add" | "remove" | "keep";
  items: string[];
}) {
  if (items.length === 0) return null;
  const dot =
    tone === "add" ? "bg-primary" : tone === "remove" ? "bg-clay" : "bg-muted-foreground/40";
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <ul className="mt-1 space-y-1 text-sm">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
