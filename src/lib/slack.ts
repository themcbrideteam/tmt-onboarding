// Slack notifications via incoming webhook. No-op until SLACK_WEBHOOK_URL is
// set (Netlify env). One webhook = one channel (#agent-onboarding); per-person
// DMs come later with a bot token.
export async function notifySlack(text: string) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Never let a notification failure break the user action.
  }
}
