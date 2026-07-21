import jsPDF from "jspdf";

export interface QuizReportData {
  top_cluster: string;
  summary: string;
  strengths: string[];
  pathways: Array<{
    title: string;
    cbc_track: string;
    why_fit: string;
    kenyan_careers: string[];
  }>;
  next_steps: string[];
  created_at?: string;
  learner_name?: string;
}

export function generateReportPdf(report: QuizReportData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeText = (text: string, size: number, style: "normal" | "bold" = "normal", color: [number, number, number] = [30, 30, 30]) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      ensureSpace(size + 4);
      doc.text(line, margin, y);
      y += size + 4;
    }
  };

  // Header band
  doc.setFillColor(24, 78, 60);
  doc.rect(0, 0, pageWidth, 90, "F");
  doc.setTextColor(255, 245, 230);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("KaziFuture", margin, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("AI Career Navigator Report", margin, 62);
  const dateStr = new Date(report.created_at ?? Date.now()).toLocaleDateString("en-KE", {
    year: "numeric", month: "long", day: "numeric",
  });
  doc.text(dateStr, pageWidth - margin, 62, { align: "right" });

  y = 130;

  if (report.learner_name) {
    writeText(`Prepared for: ${report.learner_name}`, 11, "normal", [90, 90, 90]);
    y += 6;
  }

  writeText("Your Top Cluster", 10, "bold", [176, 84, 46]);
  writeText(report.top_cluster, 22, "bold", [24, 78, 60]);
  y += 8;

  writeText("Summary", 12, "bold", [24, 78, 60]);
  writeText(report.summary, 11);
  y += 10;

  writeText("Your Strengths", 12, "bold", [24, 78, 60]);
  report.strengths.forEach((s) => writeText(`•  ${s}`, 11));
  y += 10;

  writeText("Recommended CBC Pathways", 12, "bold", [24, 78, 60]);
  y += 4;
  report.pathways.forEach((p, i) => {
    ensureSpace(80);
    writeText(`${i + 1}. ${p.title}`, 13, "bold", [176, 84, 46]);
    writeText(`CBC track: ${p.cbc_track}`, 10, "normal", [90, 90, 90]);
    writeText(p.why_fit, 11);
    writeText(`Kenyan careers: ${p.kenyan_careers.join(", ")}`, 10, "normal", [60, 60, 60]);
    y += 8;
  });

  writeText("Your Next Steps", 12, "bold", [24, 78, 60]);
  report.next_steps.forEach((s, i) => writeText(`${i + 1}.  ${s}`, 11));

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text("KaziFuture — CBC Career Readiness for Kenya", margin, pageHeight - 20);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: "right" });
  }

  return doc;
}

export function downloadReportPdf(report: QuizReportData, filename = "kazifuture-report.pdf") {
  const doc = generateReportPdf(report);
  doc.save(filename);
}
