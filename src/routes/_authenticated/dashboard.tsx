import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useRole, useProfile } from "@/hooks/useAuth";
import { useReportEntitlement } from "@/hooks/useReportEntitlement";
import { downloadReportPdf, type QuizReportData } from "@/lib/report-pdf";
import { ClusterReportPaywall } from "@/components/ClusterReportPaywall";

function confirmRetake(): boolean {
  return window.confirm(
    "Start a new quiz attempt? Your current report stays in your history as a separate version.",
  );
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · KaziFuture" },
      { name: "description", content: "Your KaziFuture career-readiness dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

interface StoredReport extends QuizReportData {
  id: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { role, loading: roleLoading } = useRole(user?.id);
  const profile = useProfile(user?.id);
  const [report, setReport] = useState<StoredReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const { unlocked, loading: loadingEntitlement, refetch: refetchEntitlement } = useReportEntitlement(report?.id);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoadingReport(true);
    supabase
      .from("quiz_results")
      .select("id, top_cluster, summary, strengths, pathways, next_steps, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setReport({
            id: data.id,
            top_cluster: data.top_cluster,
            summary: data.summary,
            strengths: data.strengths as string[],
            pathways: data.pathways as QuizReportData["pathways"],
            next_steps: data.next_steps as string[],
            created_at: data.created_at,
          });
        } else {
          setReport(null);
        }
        setLoadingReport(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function handleDownload() {
    if (!report) return;
    downloadReportPdf(
      { ...report, learner_name: profile?.full_name ?? undefined },
      `kazifuture-${report.top_cluster.toLowerCase().replace(/\s+/g, "-")}.pdf`,
    );
  }

  const displayName = profile?.full_name || user?.email || "there";

  return (
    <div className="min-h-screen bg-background bg-grain">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl gradient-earth text-cream shadow-lift">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 20L12 4L20 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 14H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>
            <span className="font-display text-xl font-bold">KaziFuture</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground md:inline">{user?.email}</span>
            <Link
              to="/history"
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              History
            </Link>
            <button
              onClick={signOut}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-clay/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-clay">
            {roleLoading ? "Loading role…" : role ?? "No role"}
          </span>
          <span className="text-xs text-muted-foreground">Karibu, {displayName}</span>
        </div>

        <h1 className="mt-4 font-display text-5xl font-bold tracking-tight text-balance">
          {role === "parent"
            ? "Guide your learner's next step."
            : role === "admin"
              ? "Admin control room."
              : "Your CBC career journey starts here."}
        </h1>

        <ReportPanel
          loading={loadingReport}
          report={report}
          onDownload={handleDownload}
          unlocked={unlocked}
          loadingEntitlement={loadingEntitlement}
          onUnlocked={refetchEntitlement}
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {role === "parent" && <ParentCards />}
          {role === "student" && <StudentCards hasReport={!!report} />}
          {role === "admin" && <AdminCards />}
          {!role && !roleLoading && (
            <div className="col-span-full rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
              No role assigned to your account yet. Contact support.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ReportPanel({
  loading,
  report,
  onDownload,
  unlocked,
  loadingEntitlement,
  onUnlocked,
}: {
  loading: boolean;
  report: StoredReport | null;
  onDownload: () => void;
  unlocked: boolean;
  loadingEntitlement: boolean;
  onUnlocked: () => void;
}) {
  if (loading) {
    return (
      <div className="mt-8 h-40 animate-pulse rounded-3xl border border-border bg-card" />
    );
  }

  if (!report) {
    return (
      <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card shadow-lift">
        <div className="grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-clay">
              Start here
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold">
              Take the AI Navigator quiz
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              6 quick questions. Get a personalised CBC pathway report with
              Kenyan career matches — ready to download as a PDF.
            </p>
          </div>
          <Link
            to="/quiz"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition hover:opacity-95"
          >
            Start the quiz →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card shadow-lift">
      <div className="gradient-earth px-8 py-6 text-cream">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
          Your top cluster
        </p>
        <h2 className="mt-1 font-display text-3xl font-bold">{report.top_cluster}</h2>
      </div>
      <div className="grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-start">
        <div className="space-y-4">
          <p className="text-sm text-foreground/80">{report.summary}</p>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Recommended pathways
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {report.pathways.map((p) => (
                <li key={p.title}>
                  <span className="font-semibold">{p.title}</span>{" "}
                  <span className="text-muted-foreground">— {p.cbc_track}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-2 md:w-52">
          {!loadingEntitlement && unlocked && (
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition hover:opacity-95"
            >
              ⬇ Download PDF
            </button>
          )}
          <Link
            to="/quiz"
            onClick={(e) => {
              if (!confirmRetake()) e.preventDefault();
            }}
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2 text-xs font-semibold hover:bg-secondary"
          >
            Retake the quiz
          </Link>
          <Link
            to="/history"
            className="inline-flex items-center justify-center rounded-full border border-transparent px-5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            View all attempts →
          </Link>
        </div>
      </div>

      {!loadingEntitlement && !unlocked && (
        <div className="border-t border-border p-8">
          <ClusterReportPaywall quizResultId={report.id} onUnlocked={onUnlocked} />
        </div>
      )}
    </div>
  );
}

function Card({ title, body, tag }: { title: string; body: string; tag: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lift">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">{tag}</p>
      <h3 className="mt-2 font-display text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function ParentCards() {
  return (
    <>
      <Card tag="AI Report" title="Buy the Cluster Report" body="KES 350 via M-Pesa. Full 30-page CBC alignment PDF for your learner." />
      <Card tag="Progress" title="See your child's activity" body="Track simulations played, badges earned and portfolio submissions." />
      <Card tag="Kits" title="Order a project box" body="Physical IoT, Fashion and Agri-tech kits shipped to your door." />
    </>
  );
}

function StudentCards({ hasReport }: { hasReport: boolean }) {
  return (
    <>
      <Card
        tag="Start here"
        title={hasReport ? "Retake the AI Navigator quiz" : "Take the AI Navigator quiz"}
        body="6 quick questions. Map your strengths to three CBC pathways."
      />
      <Card tag="Play" title="Enter the Career Arena" body="Day-in-the-life simulations. Earn badges. Level up your future." />
      <Card tag="Shadow" title="Watch a masterclass" body="Meet real Kenyan professionals. Complete their challenge to earn a portfolio entry." />
    </>
  );
}

function AdminCards() {
  return (
    <>
      <Card tag="Users" title="Manage learners & parents" body="Search, view and moderate accounts." />
      <Card tag="Content" title="Publish simulations" body="Add, edit and version Career Arena tracks." />
      <Card tag="Schools" title="School licenses" body="Onboard institutions and track portfolios." />
    </>
  );
}
