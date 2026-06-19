// One-time helper: get a Google Drive OAuth refresh token (no service-account key).
//
// Prereqs: a Google Cloud OAuth client of type "Desktop app" (Drive API enabled,
// consent screen set to Internal). Put its client id/secret in .env.local as
// GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET, then run:
//
//   node scripts/get-drive-token.mjs
//
// It opens a consent URL, captures the redirect on http://localhost:53682,
// and prints the refresh token to paste into .env.local as GOOGLE_OAUTH_REFRESH_TOKEN.

import http from "http";
import { readFileSync } from "fs";
import { google } from "googleapis";

const PORT = 53682;
const REDIRECT = `http://localhost:${PORT}`;
const SCOPE = "https://www.googleapis.com/auth/drive";

function fromEnvLocal(key) {
  if (process.env[key]) return process.env[key];
  try {
    const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const m = txt.match(new RegExp(`^${key}=(.*)$`, "m"));
    return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : undefined;
  } catch {
    return undefined;
  }
}

const clientId = fromEnvLocal("GOOGLE_OAUTH_CLIENT_ID");
const clientSecret = fromEnvLocal("GOOGLE_OAUTH_CLIENT_SECRET");

if (!clientId || !clientSecret) {
  console.error("Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET in .env.local");
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT);
const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [SCOPE],
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("No code.");
    return;
  }
  try {
    const { tokens } = await oauth2.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h2>Done — you can close this tab and return to the terminal.</h2>");
    console.log("\n✅ Refresh token (paste into .env.local as GOOGLE_OAUTH_REFRESH_TOKEN):\n");
    console.log(tokens.refresh_token || "(none returned — re-run; consent must grant offline access)");
    console.log("");
  } catch (e) {
    res.writeHead(500).end("Token exchange failed.");
    console.error(e);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log("\n1) Open this URL in your browser and approve:\n");
  console.log(authUrl);
  console.log(`\n2) Waiting for the redirect on ${REDIRECT} ...`);
});
