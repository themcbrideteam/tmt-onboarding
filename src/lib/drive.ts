import { google } from "googleapis";
import { Readable } from "stream";

// Auto-files signed onboarding documents into a per-agent Google Drive folder.
// Mirrors lib/email.ts: never throws — returns a status so a Drive failure can
// never break document submission. Inert until credentials are configured.
//
// Auth: OAuth refresh token (service-account keys are blocked by the Workspace
// "Secure by Default" org policy). Files are created as the authorizing user.
//
// Required env (see .env.local.example + scripts/get-drive-token.mjs):
//   GOOGLE_OAUTH_CLIENT_ID
//   GOOGLE_OAUTH_CLIENT_SECRET
//   GOOGLE_OAUTH_REFRESH_TOKEN   — from the one-time token-grabber script
//   GDRIVE_PARENT_FOLDER_ID      — folder the per-agent folders are created in

type Config = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  parent: string;
};

function getConfig(): Config | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const parent = process.env.GDRIVE_PARENT_FOLDER_ID;
  if (!clientId || !clientSecret || !refreshToken || !parent) return null;
  return { clientId, clientSecret, refreshToken, parent };
}

function driveClient(cfg: Config) {
  const auth = new google.auth.OAuth2(cfg.clientId, cfg.clientSecret);
  auth.setCredentials({ refresh_token: cfg.refreshToken });
  return google.drive({ version: "v3", auth });
}

// Find (or create) the agent's folder under the parent. Returns its folder id,
// or null if Drive isn't configured / the call failed.
export async function ensureAgentFolder(
  agentName: string,
): Promise<{ folderId?: string; skipped?: boolean; error?: string }> {
  const cfg = getConfig();
  if (!cfg) {
    console.warn("[drive] OAuth env not set — skipping folder for", agentName);
    return { skipped: true };
  }
  try {
    const drive = driveClient(cfg);
    const safeName = agentName.replace(/'/g, "\\'");
    const q = [
      `name = '${safeName}'`,
      "mimeType = 'application/vnd.google-apps.folder'",
      `'${cfg.parent}' in parents`,
      "trashed = false",
    ].join(" and ");
    const existing = await drive.files.list({
      q,
      fields: "files(id)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    const found = existing.data.files?.[0]?.id;
    if (found) return { folderId: found };

    const created = await drive.files.create({
      requestBody: {
        name: agentName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [cfg.parent],
      },
      fields: "id",
      supportsAllDrives: true,
    });
    return { folderId: created.data.id ?? undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[drive] ensureAgentFolder failed:", msg);
    return { error: msg };
  }
}

// Upload a file buffer into a folder. No-op if Drive isn't configured or no folder.
export async function uploadToFolder(
  folderId: string | null | undefined,
  filename: string,
  content: Buffer,
  mimeType = "application/pdf",
): Promise<{ fileId?: string; skipped?: boolean; error?: string }> {
  const cfg = getConfig();
  if (!cfg || !folderId) return { skipped: true };
  try {
    const drive = driveClient(cfg);
    const res = await drive.files.create({
      requestBody: { name: filename, parents: [folderId] },
      media: { mimeType, body: Readable.from(content) },
      fields: "id",
      supportsAllDrives: true,
    });
    return { fileId: res.data.id ?? undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[drive] uploadToFolder failed:", msg);
    return { error: msg };
  }
}

export function driveConfigured(): boolean {
  return getConfig() !== null;
}
