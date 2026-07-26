// Shared AI report generation — used by both the web quiz (quiz.functions.ts,
// authenticated) and the WhatsApp text quiz (whatsapp-webhook.server.ts,
// anonymous, no Supabase session) so the two channels produce identical
// reports from the same prompt/schema. Server-only: dynamically import this
// from *.functions.ts / route files, safe to import at the top level from
// other .server.ts modules.
import { z } from "zod";

const AnswerSchema = z.object({
  questionId: z.string(),
  question: z.string(),
  answer: z.string(),
});

export type QuizAnswerInput = z.infer<typeof AnswerSchema>;

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

export async function generateQuizReport(answers: QuizAnswerInput[]): Promise<QuizReport> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

  const prompt = `You are an AI Career Navigator for Kenya's CBC (Competency-Based Curriculum) students.
Given a learner's quiz answers, produce a JSON career-readiness report.
Match to CBC senior-school pathways: STEM, Social Sciences, or Arts & Sports Science.
Kenyan careers must be realistic and locally relevant (mention companies/sectors like Safaricom, KEMRI, KWS, agri-tech co-ops, fintech, creative industries, etc. when appropriate).

Quiz answers:
${answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")}

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
  return ReportSchema.parse(parsed);
}
