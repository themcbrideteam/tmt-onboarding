// One-time helper: create the parent Drive folder that per-agent folders live in,
// using the OAuth refresh token already in .env.local. Prints the folder id.
//
//   node scripts/init-drive-folder.mjs ["Folder Name"]

import { readFileSync } from "fs";
import { google } from "googleapis";

function env(key) {
  if (process.env[key]) return process.env[key];
  try {
    const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const m = txt.match(new RegExp(`^${key}=(.*)$`, "m"));
    return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : undefined;
  } catch {
    return undefined;
  }
}

const name = process.argv[2] || "TMT Agent Onboarding";
const clientId = env("GOOGLE_OAUTH_CLIENT_ID");
const clientSecret = env("GOOGLE_OAUTH_CLIENT_SECRET");
const refreshToken = env("GOOGLE_OAUTH_REFRESH_TOKEN");

if (!clientId || !clientSecret || !refreshToken) {
  console.error("Missing GOOGLE_OAUTH_* values in .env.local");
  process.exit(1);
}

const auth = new google.auth.OAuth2(clientId, clientSecret);
auth.setCredentials({ refresh_token: refreshToken });
const drive = google.drive({ version: "v3", auth });

const res = await drive.files.create({
  requestBody: { name, mimeType: "application/vnd.google-apps.folder" },
  fields: "id, webViewLink",
  supportsAllDrives: true,
});

console.log(`FOLDER_ID=${res.data.id}`);
console.log(`LINK=${res.data.webViewLink}`);
