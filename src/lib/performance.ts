import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type PerformanceData = {
  agentName: string;
  date: string; // signing date (YYYY-MM-DD)
  signaturePng?: Buffer;
};

// The McBride Team — Team Performance Standards & Accountability Policy.
// Rendered from text (no template PDF) so it stays in sync with the seed copy.
const NAVY = rgb(0.02, 0.02, 0.27);
const GREY = rgb(0.25, 0.25, 0.3);

const SECTIONS: { h: string; body: string[] }[] = [
  {
    h: "1. Purpose",
    body: [
      "This policy defines the production, service, and accountability standards for all agents on the team operating Zillow Preferred leads. It exists to protect lead quality, deliver a consistent client experience, and ensure each agent is set up to hit personal and team production goals. Standards are the floor, not the ceiling.",
    ],
  },
  {
    h: "2. Zillow Preferred Performance Standards",
    body: [
      "Every agent receiving Zillow Preferred referrals is expected to meet or exceed the following metrics on a rolling basis, reviewed monthly inside Zillow Reporting and Follow Up Boss:",
      "• Call Answer Rate — 80% (inbound Zillow Preferred calls answered live within the SLA window).",
      "• Appointment Set Rate — 70% (connected leads converted into a scheduled appointment).",
      "• Met With — 45% (clients that result in a meeting).",
      "• Show Rate — 30% (set appointments that result in an in-person or virtual meeting).",
      "• Offer Rate — 15% (clients that submit an offer).",
      "• Conversion Rate — 10%+ (leads that move through the funnel to a closing).",
      "• ZHL Pre-Approval Rate — 10% (of clients met-with or better who obtain a Zillow Home Loans pre-approval).",
    ],
  },
  {
    h: "3. CRM & Accountability",
    body: [
      "Follow Up Boss is the system of record. If it is not in FUB, it did not happen. The following are non-negotiable:",
      "• Manage Follow Up Boss daily — every business day, with no rolling 24-hour blackouts.",
      "• Clear all assigned Smart Lists by the end of day, every day.",
      "• Document every client communication: calls, texts, emails, showings, and offers.",
      "• Update lead stage immediately after status changes (Appointment Set, Met, Under Contract).",
      "• Tag every Zillow Preferred lead with the correct source and assigned ISA, if applicable.",
    ],
  },
  {
    h: "4. Attendance",
    body: [
      "Each agent is expected to attend their scheduled one-on-one (1:1) and the weekly team meeting.",
      "• Attend all scheduled 1:1s; reschedule in advance when a genuine conflict arises.",
      "• The weekly team meeting is mandatory — up to four (4) absences per rolling 12-month period with prior notice.",
      "• Five (5) unexcused weekly-meeting absences in a rolling 12 months, or repeated 1:1 no-shows, triggers a formal performance review.",
    ],
  },
  {
    h: "5. Minimum Production",
    body: [
      "Each agent is expected to close a minimum of twelve (12) transactions per calendar year on team-provided business. This is the floor required to remain in good standing and continue receiving Zillow Preferred distribution at current levels.",
      "• A transaction is a closed buyer-side or seller-side side of a residential sale.",
      "• Production is reviewed monthly against a rolling 12-month total.",
      "• Failure to meet the standard for two (2) consecutive months triggers a formal performance review.",
    ],
  },
  {
    h: "6. Performance Review Process",
    body: [
      "• First offense — one-week probation: lead distribution cut off for 7 days, restored only after a skills-assessment 1:1.",
      "• Second offense — one-month probation: lead distribution cut off for 30 days, restored only after a skills-assessment 1:1 plus shadowing 2 tours with an agent in good standing.",
      "• Third & final offense — termination from the Zillow Preferred team.",
    ],
  },
  {
    h: "7. Agent Acknowledgement",
    body: [
      "By signing below, I acknowledge that I have read, understood, and agree to uphold the standards outlined in this policy. I understand these standards are conditions of receiving team-provided leads and remaining a member of the team in good standing.",
    ],
  },
];

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function fillPerformance(d: PerformanceData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 612;
  const H = 792;
  const M = 56;
  const maxW = W - M * 2;
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;

  const ensure = (need: number) => {
    if (y - need < M) {
      page = pdf.addPage([W, H]);
      y = H - M;
    }
  };
  const text = (s: string, size: number, f: PDFFont, color = GREY, gap = 4) => {
    for (const ln of wrap(s, f, size, maxW)) {
      ensure(size + gap);
      page.drawText(ln, { x: M, y, size, font: f, color });
      y -= size + gap;
    }
  };

  // Title
  text("THE McBRIDE TEAM", 10, bold, NAVY, 2);
  y -= 6;
  text("Team Performance Standards & Accountability Policy", 16, bold, NAVY, 6);
  y -= 12;

  for (const sec of SECTIONS) {
    ensure(28);
    y -= 8;
    text(sec.h, 12, bold, NAVY, 5);
    y -= 2;
    for (const para of sec.body) text(para, 10.5, font, GREY, 4);
  }

  // Signature block
  y -= 24;
  ensure(120);
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: NAVY });
  y -= 20;
  if (d.signaturePng) {
    const img = await pdf.embedPng(d.signaturePng);
    page.drawImage(img, { x: M, y: y - 8, width: 160, height: 36 });
  }
  y -= 40;
  page.drawText("Agent Signature", { x: M, y, size: 9, font, color: GREY });
  page.drawText(`Date: ${d.date}`, { x: W - M - 140, y, size: 10, font, color: NAVY });
  y -= 18;
  page.drawText(`Printed Name: ${d.agentName}`, { x: M, y, size: 10, font: bold, color: NAVY });

  return pdf.save();
}
