import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useRole, useProfile } from "@/hooks/useAuth";

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

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { role, loading: roleLoading } = useRole(user?.id);
  const profile = useProfile(user?.id);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
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

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {role === "parent" && <ParentCards />}
          {role === "student" && <StudentCards />}
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

function StudentCards() {
  return (
    <>
      <Card tag="Start here" title="Take the AI Navigator quiz" body="15 minutes. Map your strengths to three CBC pathways." />
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
