import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

export type ICAData = {
  agentName: string;
  date: string; // effective date + signing date
  agentSigPng?: Buffer;
  teamSigPng?: Buffer; // Noah's signature — applied to Team Lead AND Broker blocks
};

// Coordinates are best-estimates for the flat 612x792 ICA; tune after first review.
const POS = {
  p1: { effDate: { x: 82, y: 516 }, agentName: { x: 82, y: 478 } },
  p11: {
    agentSig: { x: 135, y: 556, w: 150, h: 22 },
    agentName: { x: 150, y: 531 },
    agentDate: { x: 110, y: 504 },
    teamSig: { x: 135, y: 425, w: 150, h: 22 },
    teamDate: { x: 110, y: 348 },
    brokerSig: { x: 135, y: 291, w: 150, h: 22 },
    brokerDate: { x: 110, y: 212 },
  },
};

export async function fillICA(d: ICAData): Promise<Uint8Array> {
  const bytes = await fs.readFile(path.join(process.cwd(), "forms", "ica.pdf"));
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const p1 = pages[0];
  const p11 = pages[10];
  const ink = rgb(0.02, 0.02, 0.27);
  const write = (pg: (typeof pages)[number], s: string, x: number, y: number, size = 11) =>
    pg.drawText(s, { x, y, size, font, color: ink });

  // Page 1 — effective date + agent name
  write(p1, d.date, POS.p1.effDate.x, POS.p1.effDate.y);
  write(p1, d.agentName, POS.p1.agentName.x, POS.p1.agentName.y);

  // Page 11 — Agent block
  if (d.agentSigPng) {
    const img = await pdf.embedPng(d.agentSigPng);
    p11.drawImage(img, { ...POS.p11.agentSig, width: POS.p11.agentSig.w, height: POS.p11.agentSig.h });
  }
  write(p11, d.agentName, POS.p11.agentName.x, POS.p11.agentName.y);
  write(p11, d.date, POS.p11.agentDate.x, POS.p11.agentDate.y);

  // Page 11 — Team Lead + Broker (Noah's signature applied to both)
  if (d.teamSigPng) {
    const t = await pdf.embedPng(d.teamSigPng);
    p11.drawImage(t, { ...POS.p11.teamSig, width: POS.p11.teamSig.w, height: POS.p11.teamSig.h });
    p11.drawImage(t, { ...POS.p11.brokerSig, width: POS.p11.brokerSig.w, height: POS.p11.brokerSig.h });
    write(p11, d.date, POS.p11.teamDate.x, POS.p11.teamDate.y);
    write(p11, d.date, POS.p11.brokerDate.x, POS.p11.brokerDate.y);
  }

  return pdf.save();
}
