import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type { QuizReport } from "@/lib/ai-report.server";

const AnswerSchema = z.object({
  questionId: z.string(),
  question: z.string(),
  answer: z.string(),
});

const InputSchema = z.object({
  answers: z.array(AnswerSchema).min(1),
});

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { generateQuizReport } = await import("@/lib/ai-report.server");
    const report = await generateQuizReport(data.answers);

    const { data: row, error } = await context.supabase
      .from("quiz_results")
      .insert({
        user_id: context.userId,
        answers: data.answers,
        top_cluster: report.top_cluster,
        summary: report.summary,
        strengths: report.strengths,
        pathways: report.pathways,
        next_steps: report.next_steps,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: row.id, report };
  });

export const getLatestQuizResult = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("quiz_results")
      .select("id, top_cluster, summary, strengths, pathways, next_steps, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const listQuizResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("quiz_results")
      .select("id, top_cluster, summary, strengths, pathways, next_steps, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
