// Raw HTTP handler for Twilio's inbound WhatsApp webhook — the text version
// of the AI Navigator quiz ("Choose Your Own Adventure" flow). Wired into
// src/server.ts, which intercepts POST /api/whatsapp/webhook/:secret before
// delegating to TanStack Start's normal SSR/router handling (same pattern as
// the M-Pesa callback — this app has no file-based API-route mechanism).
//
// This module is itself .server.ts and only ever imported from src/server.ts,
// so top-level imports of supabaseAdmin/Twilio helpers here are safe — they
// never reach the client bundle.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { verifyTwilioSignature, buildTwimlReply } from "@/lib/twilio.server";
import { normalizePhoneNumber } from "@/lib/phone";
import { QUIZ_QUESTIONS } from "@/lib/quiz-questions";
import type { QuizAnswerInput } from "@/lib/ai-report.server";

interface SessionState {
  step: number;
  answers: QuizAnswerInput[];
  quizResultId?: string;
}

const WELCOME =
  "Karibu KaziFuture AI Navigator! Discover your CBC pathway in 6 quick questions.\n\nText START to begin.";

function formatQuestion(index: number): string {
  const q = QUIZ_QUESTIONS[index];
  const options = q.options.map((opt, i) => `${i + 1}. ${opt}`).join("\n");
  return `Question ${index + 1} of ${QUIZ_QUESTIONS.length}\n${q.question}\n\n${options}\n\nReply with a number.`;
}

async function getOrCreateIdentity(phoneNumber: string): Promise<{ id: string }> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("whatsapp_identities")
    .select("id")
    .eq("phone_number", phoneNumber)
    .maybeSingle();
  if (selectError) throw new Error(selectError.message);
  if (existing) return existing;

  const { data: created, error: insertError } = await supabaseAdmin
    .from("whatsapp_identities")
    .insert({ phone_number: phoneNumber })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);
  return created;
}

async function saveSessionState(identityId: string, state: SessionState): Promise<void> {
  const { error } = await supabaseAdmin
    .from("whatsapp_sessions")
    .upsert(
      { whatsapp_identity_id: identityId, state: state as unknown as Json },
      { onConflict: "whatsapp_identity_id" },
    );
  if (error) throw new Error(error.message);
}

// Generates the report and stores it, called both right after the last
// question is answered and on retry if generation previously failed —
// answers stay in session state either way, so nothing is lost on failure.
async function finishQuiz(
  identityId: string,
  phoneNumber: string,
  answers: QuizAnswerInput[],
): Promise<{ replyText: string; quizResultId: string | null }> {
  try {
    const { generateQuizReport } = await import("@/lib/ai-report.server");
    const report = await generateQuizReport(answers);

    const { data: row, error } = await supabaseAdmin
      .from("quiz_results")
      .insert({
        whatsapp_identity_id: identityId,
        answers,
        top_cluster: report.top_cluster,
        summary: report.summary,
        strengths: report.strengths,
        pathways: report.pathways,
        next_steps: report.next_steps,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const replyText =
      `Your top cluster: ${report.top_cluster}\n\n${report.summary}\n\n` +
      `Sign up or log in on the KaziFuture web app and link ${phoneNumber} to see your full report and download a PDF.`;
    return { replyText, quizResultId: row.id };
  } catch (err) {
    console.error("[whatsapp-webhook] Report generation failed", err);
    return {
      replyText:
        "Sorry, something went wrong generating your report. Reply with anything to try again.",
      quizResultId: null,
    };
  }
}

export async function handleWhatsappWebhook(request: Request, secret: string): Promise<Response> {
  const expectedSecret = process.env.WHATSAPP_CALLBACK_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    console.error("[whatsapp-webhook] Rejected callback: invalid secret");
    return new Response("Not found", { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (err) {
    console.error("[whatsapp-webhook] Failed to parse form body", err);
    return buildTwimlReply("Sorry, something went wrong. Please try again.");
  }

  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    params[key] = String(value);
  });

  // Twilio provides real cryptographic signature verification (unlike Daraja),
  // so enforce it whenever TWILIO_AUTH_TOKEN is configured; the secret path
  // segment alone still gates access before that's set up.
  if (process.env.TWILIO_AUTH_TOKEN) {
    const signature = request.headers.get("x-twilio-signature");
    if (!verifyTwilioSignature(request.url, params, signature)) {
      console.error("[whatsapp-webhook] Invalid Twilio signature");
      return new Response("Forbidden", { status: 403 });
    }
  }

  const rawFrom = params.From ?? "";
  const body = (params.Body ?? "").trim();

  let phoneNumber: string;
  try {
    phoneNumber = normalizePhoneNumber(rawFrom.replace(/^whatsapp:/i, ""));
  } catch (err) {
    console.error("[whatsapp-webhook] Could not parse From number", rawFrom, err);
    return buildTwimlReply("Sorry, we couldn't read your number. Please try again.");
  }

  try {
    const identity = await getOrCreateIdentity(phoneNumber);

    const { data: sessionRow, error: sessionError } = await supabaseAdmin
      .from("whatsapp_sessions")
      .select("state")
      .eq("whatsapp_identity_id", identity.id)
      .maybeSingle();
    if (sessionError) throw new Error(sessionError.message);

    const isStart = body.toUpperCase() === "START";

    if (isStart) {
      const state: SessionState = { step: 0, answers: [] };
      await saveSessionState(identity.id, state);
      return buildTwimlReply(`${WELCOME}\n\n${formatQuestion(0)}`);
    }

    if (!sessionRow) {
      return buildTwimlReply(WELCOME);
    }

    const state = sessionRow.state as unknown as SessionState;

    if (state.quizResultId) {
      return buildTwimlReply(
        "You already have a report on file. Text START to retake, or log in on the KaziFuture web app to view it.",
      );
    }

    if (state.step >= QUIZ_QUESTIONS.length) {
      const { replyText, quizResultId } = await finishQuiz(identity.id, phoneNumber, state.answers);
      if (quizResultId) {
        await saveSessionState(identity.id, { ...state, quizResultId });
      }
      return buildTwimlReply(replyText);
    }

    const question = QUIZ_QUESTIONS[state.step];
    const choice = Number.parseInt(body, 10);
    if (!Number.isInteger(choice) || choice < 1 || choice > question.options.length) {
      return buildTwimlReply(`Please reply with a number.\n\n${formatQuestion(state.step)}`);
    }

    const answers = [
      ...state.answers,
      {
        questionId: question.id,
        question: question.question,
        answer: question.options[choice - 1],
      },
    ];
    const nextStep = state.step + 1;

    if (nextStep < QUIZ_QUESTIONS.length) {
      await saveSessionState(identity.id, { step: nextStep, answers });
      return buildTwimlReply(formatQuestion(nextStep));
    }

    const { replyText, quizResultId } = await finishQuiz(identity.id, phoneNumber, answers);
    await saveSessionState(identity.id, {
      step: nextStep,
      answers,
      ...(quizResultId ? { quizResultId } : {}),
    });
    return buildTwimlReply(replyText);
  } catch (err) {
    console.error("[whatsapp-webhook] Unexpected error", err);
    return buildTwimlReply("Sorry, something went wrong. Please try again in a moment.");
  }
}
