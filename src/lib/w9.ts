import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

const P = (n: string) => `topmostSubform[0].Page1[0].${n}`;

const CLASSIFICATION_BOX: Record<string, string> = {
  individual: "Boxes3a-b_ReadOrder[0].c1_1[0]", // Individual/sole proprietor (default for agents)
  ccorp: "Boxes3a-b_ReadOrder[0].c1_1[1]",
  scorp: "Boxes3a-b_ReadOrder[0].c1_1[2]",
  partnership: "Boxes3a-b_ReadOrder[0].c1_1[3]",
  trust: "Boxes3a-b_ReadOrder[0].c1_1[4]",
  llc: "Boxes3a-b_ReadOrder[0].c1_1[5]",
};

export type W9Data = {
  name: string;
  business?: string;
  classification?: string; // key of CLASSIFICATION_BOX
  address1: string;
  cityStateZip: string;
  ssn?: string;
  ein?: string;
  signaturePng?: Buffer; // PNG bytes from the signature pad
  date: string;
};

// Fills the official IRS W-9 and stamps the e-signature, returns flattened PDF bytes.
export async function fillW9(d: W9Data): Promise<Uint8Array> {
  const bytes = await fs.readFile(path.join(process.cwd(), "forms", "fw9.pdf"));
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();

  const setText = (name: string, val?: string) => {
    try {
      form.getTextField(name).setText(val ?? "");
    } catch {
      /* field missing — ignore */
    }
  };

  setText(P("f1_01[0]"), d.name);
  setText(P("f1_02[0]"), d.business);
  setText(P("Address_ReadOrder[0].f1_07[0]"), d.address1);
  setText(P("Address_ReadOrder[0].f1_08[0]"), d.cityStateZip);

  const box = CLASSIFICATION_BOX[d.classification ?? "individual"] ?? CLASSIFICATION_BOX.individual;
  try {
    form.getCheckBox(P(box)).check();
  } catch {
    /* ignore */
  }

  if (d.ssn) {
    const s = d.ssn.replace(/\D/g, "");
    setText(P("f1_11[0]"), s.slice(0, 3));
    setText(P("f1_12[0]"), s.slice(3, 5));
    setText(P("f1_13[0]"), s.slice(5, 9));
  } else if (d.ein) {
    const e = d.ein.replace(/\D/g, "");
    setText(P("f1_14[0]"), e.slice(0, 2));
    setText(P("f1_15[0]"), e.slice(2, 9));
  }

  const page = pdf.getPages()[0];
  if (d.signaturePng) {
    const png = await pdf.embedPng(d.signaturePng);
    // Signature line in Part II (coordinates may need a small nudge after first review).
    page.drawImage(png, { x: 120, y: 238, width: 175, height: 26 });
  }
  page.drawText(d.date, { x: 430, y: 246, size: 10 });

  form.flatten();
  return pdf.save();
}
