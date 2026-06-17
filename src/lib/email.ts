import nodemailer from "nodemailer";

// Sends mail via Google Workspace SMTP (Gmail App Password).
// Never throws — returns a status so a mail failure can't break document submission.
export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  attachments?: { filename: string; content: Buffer }[];
}): Promise<{ sent?: boolean; skipped?: boolean; error?: string }> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn("[email] GMAIL_USER/GMAIL_APP_PASSWORD not set — skipping send to", opts.to);
    return { skipped: true };
  }
  try {
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass: pass.replace(/\s+/g, "") },
    });
    await transport.sendMail({ from: `The McBride Team <${user}>`, ...opts });
    return { sent: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email] send failed:", msg);
    return { error: msg };
  }
}

export const BOOKKEEPING_EMAIL = process.env.BOOKKEEPING_EMAIL || "bookkeeping@c21magnolia.com";
