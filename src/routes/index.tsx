import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero.jpg";
import { useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  component: Landing,
});

const pillars = [
  {
    tag: "01 · AI Navigator",
    title: "A 15-minute quiz that maps a learner's whole future.",
    body: "Diagnoses talents, CBC junior-school assessments and interests, then recommends three Senior School pathways. Parents unlock the 30-page CBC + University Cluster report for KES 350 via M-Pesa.",
    accent: "clay",
  },
  {
    tag: "02 · Career Arena",
    title: "Day-in-the-life simulations that feel like games.",
    body: "Build a mock M-Pesa clone from code blocks. Run a virtual ward budget. Level up, earn badges, unlock the next tier. Playable in the browser — no downloads.",
    accent: "primary",
  },
  {
    tag: "03 · Shadow Alley",
    title: "Virtual shadowing with real Kenyan professionals.",
    body: "20-minute behind-the-scenes films with engineers at Safaricom, growers, nurses, designers. Each ends with a Challenge Project that auto-generates a certified CBC Learner Portfolio entry.",
    accent: "sun",
  },
  {
    tag: "04 · Kit Marketplace",
    title: "Physical project boxes for STEM & creative tracks.",
    body: "Parents order an IoT Automation Box or Agri-tech kit; scanning the QR unlocks a premium build-along module with step-by-step Arduino tutorials.",
    accent: "clay",
  },
  {
    tag: "05 · WhatsApp Hub",
    title: "The whole platform, delivered in text.",
    body: "Rural learners text START to our WhatsApp Business number for a choose-your-own-adventure Career Arena. Progress syncs by phone number — pick up on a school computer any time.",
    accent: "primary",
  },
];

const tiers = [
  {
    name: "AI Cluster Report",
    price: "KES 350",
    unit: "one-time",
    for: "Parents",
    perks: [
      "Full 30-page CBC alignment report",
      "3 senior-school pathway matches",
      "University cluster forecast",
      "Delivered as a printable PDF",
    ],
    highlight: false,
  },
  {
    name: "Learner Pass",
    price: "KES 499",
    unit: "per month · or KES 1,200/term",
    for: "Parents & Students",
    perks: [
      "Every simulation & masterclass",
      "Unlimited portfolio entries",
      "Badges + progress tracking",
      "WhatsApp sync included",
    ],
    highlight: true,
  },
  {
    name: "School License",
    price: "KES 20k–50k",
    unit: "per year, per school",
    for: "Institutions",
    perks: [
      "Track student portfolios",
      "Teacher dashboards",
      "Bulk enrolment tools",
      "CBC-aligned reporting",
    ],
    highlight: false,
  },
  {
    name: "Kit + Airtime",
    price: "KES 2,500+",
    unit: "kits · KES 10 per story path",
    for: "Everyone",
    perks: [
      "IoT, Fashion & Agri-tech boxes",
      "Direct-to-doorstep shipping",
      "Airtime micro-billing for SMS quests",
      "Auto-unlocks premium modules",
    ],
    highlight: false,
  },
];

const sprints = [
  {
    n: "Sprint 1",
    title: "Database + AI Core",
    body: "Unified Postgres schema, Node backend around the AI Gateway, React quiz UI, M-Pesa STK Push and PDF generation.",
  },
  {
    n: "Sprint 2",
    title: "WhatsApp Extension",
    body: "Twilio/Turn.io routed into the same database — test engagement fast, no heavy frontend needed.",
  },
  {
    n: "Sprint 3",
    title: "Simulations + Video",
    body: "Two flagship tracks — Software Engineering & Agribusiness — as HTML5 games with embedded shadowing videos.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <Marquee />
      <Pillars />
      <Pricing />
      <Roadmap />
      <CTA />
      <Footer />
    </div>
  );
}

function Header() {
  const { user, loading } = useSession();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-xl font-bold tracking-tight">
            KaziFuture
          </span>
        </a>
        <nav className="hidden items-center gap-8 text-sm md:flex">
          <a href="#pillars" className="text-muted-foreground hover:text-foreground transition">Platform</a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition">Pricing</a>
          <a href="#roadmap" className="text-muted-foreground hover:text-foreground transition">Roadmap</a>
          <a href="#waitlist" className="text-muted-foreground hover:text-foreground transition">Waitlist</a>
        </nav>
        {loading ? (
          <span className="h-9 w-24 animate-pulse rounded-full bg-secondary" />
        ) : user ? (
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lift transition hover:opacity-95"
          >
            Dashboard
            <span aria-hidden>→</span>
          </Link>
        ) : (
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lift transition hover:opacity-95"
          >
            Sign in
            <span aria-hidden>→</span>
          </Link>
        )}
      </div>
    </header>
  );
}

function Logo() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl gradient-earth text-cream shadow-lift">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4 20L12 4L20 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 14H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-grain">
      <div className="mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-16 md:grid-cols-[1.1fr_1fr] md:items-center md:pt-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-clay" />
            CBC Career Super App
          </span>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.02] tracking-tight text-balance md:text-7xl">
            The future of{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-clay">kazi</span>
              <span className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded bg-sun/70" />
            </span>{" "}
            starts in Form One.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground text-balance">
            KaziFuture merges AI pathway coaching, gamified simulations, virtual shadowing,
            physical STEM kits and WhatsApp quests into one platform — built for every CBC
            learner, from Runda to Turkana.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3.5 text-sm font-semibold text-clay-foreground shadow-warm transition hover:brightness-105"
            >
              Get early access
              <span aria-hidden>→</span>
            </a>
            <a
              href="#pillars"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
            >
              See how it works
            </a>
          </div>
          <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-border pt-8 text-left">
            {[
              ["5", "integrated pillars"],
              ["47", "counties reachable"],
              ["KES 10", "entry point on SMS"],
            ].map(([k, v]) => (
              <div key={v}>
                <dt className="font-display text-3xl font-bold text-primary">{k}</dt>
                <dd className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] gradient-warm opacity-40 blur-2xl" />
          <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-warm">
            <img
              src={heroImg}
              alt="Kenyan students exploring futuristic career tools"
              width={1600}
              height={1200}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 hidden max-w-[15rem] rounded-2xl border border-border bg-card p-4 shadow-lift md:block">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">✓</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Portfolio entry</p>
                <p className="font-display text-sm font-semibold">Logo · Kibanda Bites</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 -top-4 hidden rotate-3 rounded-2xl bg-ink px-4 py-3 text-cream shadow-lift md:block">
            <p className="text-xs uppercase tracking-widest opacity-70">Badge unlocked</p>
            <p className="font-display text-base font-semibold">Junior M-Pesa Engineer</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = ["Safaricom", "KenGen", "KEMRI", "iHub", "Twiga Foods", "Ushahidi", "Andela", "M-KOPA"];
  return (
    <section aria-label="Partner ecosystem" className="border-y border-border/60 bg-cream/50 py-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        <span className="text-xs text-muted-foreground/70">Shadowing partners we're building with</span>
        {items.map((i) => (
          <span key={i} className="text-foreground/60">{i}</span>
        ))}
      </div>
    </section>
  );
}

function Pillars() {
  return (
    <section id="pillars" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-clay">The platform</p>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl text-balance">
            Five pillars. One learner journey.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-balance">
            Each module solves one piece of the CBC career puzzle. Together they
            engage, validate, guide, equip and include — no student left behind.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {pillars.map((p, i) => (
            <article
              key={p.tag}
              className={`group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lift ${
                i === 0 ? "md:col-span-2 md:p-10" : ""
              }`}
            >
              <div
                className={`absolute right-0 top-0 h-32 w-32 rounded-full opacity-20 blur-3xl ${
                  p.accent === "clay" ? "bg-clay" : p.accent === "sun" ? "bg-sun" : "bg-primary"
                }`}
              />
              <p className={`text-xs font-semibold uppercase tracking-widest ${
                p.accent === "clay" ? "text-clay" : p.accent === "sun" ? "text-sun-foreground" : "text-primary"
              }`}>
                {p.tag}
              </p>
              <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-balance md:text-3xl">
                {p.title}
              </h3>
              <p className="mt-4 max-w-xl text-muted-foreground">{p.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="relative gradient-earth py-24 text-cream">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-sun">Revenue model</p>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl text-balance">
              Priced for every Kenyan household — and every school.
            </h2>
          </div>
          <p className="max-w-sm text-sm text-cream/80">
            Bundled tiers unlock multiple, compounding revenue streams — from micro-billing
            in Turkana to enterprise licenses in Nairobi.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`flex flex-col rounded-3xl border p-6 transition ${
                t.highlight
                  ? "border-sun bg-sun text-sun-foreground shadow-warm scale-[1.02]"
                  : "border-cream/15 bg-cream/5 text-cream backdrop-blur"
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-widest ${t.highlight ? "text-sun-foreground/70" : "text-sun"}`}>
                {t.for}
              </p>
              <h3 className="mt-3 font-display text-2xl font-bold">{t.name}</h3>
              <p className="mt-4 font-display text-4xl font-bold leading-none">{t.price}</p>
              <p className={`mt-1 text-xs ${t.highlight ? "text-sun-foreground/70" : "text-cream/70"}`}>{t.unit}</p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {t.perks.map((perk) => (
                  <li key={perk} className="flex gap-2">
                    <span aria-hidden className={t.highlight ? "text-clay" : "text-sun"}>◆</span>
                    <span className={t.highlight ? "text-sun-foreground/90" : "text-cream/90"}>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Roadmap() {
  return (
    <section id="roadmap" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-clay">MVP roadmap</p>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl text-balance">
            Ship modularly. Don't build for twelve months in the dark.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Three sprints to a defensible product. Everything after is content,
            polish and partnerships.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {sprints.map((s, i) => (
            <li key={s.n} className="relative rounded-3xl border border-border bg-card p-8 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-display text-6xl font-black text-clay/20">
                  0{i + 1}
                </span>
                <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                  {s.n}
                </span>
              </div>
              <h3 className="mt-2 font-display text-2xl font-bold">{s.title}</h3>
              <p className="mt-3 text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="waitlist" className="pb-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card p-10 shadow-warm md:p-16">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full gradient-warm opacity-40 blur-3xl" />
          <div className="relative grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-clay">Join the pilot</p>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl text-balance">
                Be first in your school, county, or classroom.
              </h2>
              <p className="mt-4 max-w-lg text-muted-foreground">
                We're onboarding the first 500 families and 20 schools this term.
                Reserve your seat — no payment yet.
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget as HTMLFormElement;
                form.reset();
                alert("Karibu! We'll be in touch when the pilot opens.");
              }}
              className="rounded-2xl bg-secondary p-5"
            >
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Parent or student email
              </label>
              <input
                type="email"
                required
                placeholder="you@school.ke"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <label className="mt-4 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                I want to try
              </label>
              <select className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary">
                <option>The AI Navigator quiz</option>
                <option>Career Arena simulations</option>
                <option>WhatsApp text quests</option>
                <option>A school-wide license</option>
              </select>
              <button
                type="submit"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition hover:opacity-95"
              >
                Reserve my spot
                <span aria-hidden>→</span>
              </button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Or text <span className="font-semibold text-foreground">START</span> to our WhatsApp line at launch.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-cream/60 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-lg font-bold">KaziFuture</span>
          <span className="ml-2 text-xs text-muted-foreground">Built for CBC · Made in Kenya</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} KaziFuture. All pathways lead somewhere.
        </p>
      </div>
    </footer>
  );
}
