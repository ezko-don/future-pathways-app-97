import type { QuizReportData } from "./report-pdf";

export function buildWhatsAppMessage(
  report: QuizReportData,
  learnerName?: string,
): string {
  const name = learnerName ? learnerName : "Your learner";
  const pathways = report.pathways
    .map((p, i) => `${i + 1}. ${p.title} (${p.cbc_track})`)
    .join("\n");
  const nextSteps = report.next_steps.slice(0, 3).map((s) => `• ${s}`).join("\n");

  return [
    `🌍 *KaziFuture — CBC Career Report*`,
    ``,
    `${name}'s top cluster: *${report.top_cluster}*`,
    ``,
    report.summary,
    ``,
    `*Recommended CBC pathways:*`,
    pathways,
    ``,
    `*Next steps:*`,
    nextSteps,
    ``,
    `— Shared from KaziFuture`,
  ].join("\n");
}

export function openWhatsAppShare(message: string, phone?: string) {
  const encoded = encodeURIComponent(message);
  const base = phone
    ? `https://wa.me/${phone.replace(/[^\d]/g, "")}`
    : `https://wa.me/`;
  window.open(`${base}?text=${encoded}`, "_blank", "noopener,noreferrer");
}
