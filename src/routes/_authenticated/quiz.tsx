import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitQuiz } from "@/lib/quiz.functions";
import { QUIZ_QUESTIONS } from "@/lib/quiz-questions";

export const Route = createFileRoute("/_authenticated/quiz")({
  head: () => ({
    meta: [
      { title: "AI Career Navigator Quiz · KaziFuture" },
      {
        name: "description",
        content: "Discover your CBC pathway with the KaziFuture AI Navigator quiz.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuizPage,
});

function QuizPage() {
  const navigate = useNavigate();
  const submit = useServerFn(submitQuiz);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = QUIZ_QUESTIONS.length;
  const isLast = step === total - 1;
  const current = QUIZ_QUESTIONS[step];
  const currentAnswer = answers[current.id];

  function pick(option: string) {
    setAnswers((prev) => ({ ...prev, [current.id]: option }));
  }

  async function next() {
    setError(null);
    if (!currentAnswer) return;
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    setSubmitting(true);
    try {
      const payload = QUIZ_QUESTIONS.map((q) => ({
        questionId: q.id,
        question: q.question,
        answer: answers[q.id],
      }));
      await submit({ data: { answers: payload } });
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
      setSubmitting(false);
    }
  }

  const progress = Math.round(((step + (currentAnswer ? 1 : 0)) / total) * 100);

  return (
    <div className="min-h-screen bg-background bg-grain">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-clay">
            AI Career Navigator · Step {step + 1} of {total}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full gradient-earth transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-lift">
          <h1 className="font-display text-3xl font-bold tracking-tight text-balance">
            {current.question}
          </h1>

          <div className="mt-6 space-y-3">
            {current.options.map((opt) => {
              const selected = currentAnswer === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => pick(opt)}
                  className={`w-full rounded-xl border px-5 py-4 text-left text-sm font-medium transition ${
                    selected
                      ? "border-primary bg-primary/10 text-foreground shadow-sm"
                      : "border-border bg-background hover:border-primary/40 hover:bg-secondary"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              disabled={step === 0 || submitting}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-secondary"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!currentAnswer || submitting}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition hover:opacity-95 disabled:opacity-60"
            >
              {submitting ? "Generating your report…" : isLast ? "Get my AI report" : "Next"}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your answers stay private and are only used to generate your personal report.
        </p>
      </div>
    </div>
  );
}
