import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AnswerSchema = z.object({
  questionId: z.string(),
  question: z.string(),
  answer: z.string(),
});

const InputSchema = z.object({
  answers: z.array(AnswerSchema).min(1),
});

const ReportSchema = z.object({
  top_cluster: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()).min(3).max(6),
  pathways: z
    .array(
      z.object({
        title: z.string(),
        cbc_track: z.string(),
        why_fit: z.string(),
        kenyan_careers: z.array(z.string()).min(2).max(5),
      }),
    )
    .length(3),
  next_steps: z.array(z.string()).min(3).max(6),
});

export type QuizReport = z.infer<typeof ReportSchema>;

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const prompt = `You are an AI Career Navigator for Kenya's CBC (Competency-Based Curriculum) students.
Given a learner's quiz answers, produce a JSON career-readiness report.
Match to CBC senior-school pathways: STEM, Social Sciences, or Arts & Sports Science.
Kenyan careers must be realistic and locally relevant (mention companies/sectors like Safaricom, KEMRI, KWS, agri-tech co-ops, fintech, creative industries, etc. when appropriate).

Quiz answers:
${data.answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")}

Return ONLY valid JSON matching this schema:
{
  "top_cluster": "short cluster name",
  "summary": "2-3 sentence personalized summary",
  "strengths": ["3-5 short strengths"],
  "pathways": [
    { "title": "...", "cbc_track": "STEM|Social Sciences|Arts & Sports Science", "why_fit": "...", "kenyan_careers": ["..."] }
  ],
  "next_steps": ["3-5 concrete actions"]
}
Exactly 3 pathways, ranked best-fit first.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You output only valid JSON. No prose, no markdown fences." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("AI rate limit reached. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits.");
      throw new Error(`AI request failed: ${text}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned invalid JSON");
    }
    const report = ReportSchema.parse(parsed);

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
