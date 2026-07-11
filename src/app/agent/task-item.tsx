"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toggleSelfTask, bumpCounter, recordUpload, logRoleplay, submitLenders } from "@/app/actions";

type Task = {
  id: string;
  status: string;
  progress_count: number;
  task: {
    key: string;
    title: string;
    description: string | null;
    type: string;
    evidence: string;
    verifier: string;
    owner_role: string | null;
    due_day: number | null;
    links: { l: string; u: string }[] | null;
    recurring: boolean;
    target_count: number | null;
    content_url: string | null;
    content_state: string;
  };
};

const STATUS_LABEL: Record<string, string> = {
  not_started: "",
  in_progress: "In progress",
  submitted: "Awaiting review",
  verified: "Done",
  rejected: "Needs redo",
};

const ROLE_LABEL: Record<string, string> = {
  agent: "You",
  broker: "Noah",
  sales_manager: "Tiffany",
  operations: "Taylor",
  transactions: "Riley",
  marketing: "Whitney",
};
const ROLE_COLOR: Record<string, string> = {
  agent: "#F4F3FC",
  broker: "#D9C48D",
  sales_manager: "#8FB7E8",
  operations: "#7FD8B8",
  transactions: "#C79BE8",
  marketing: "#E89BB8",
};

function fmtDue(d: number | null): string {
  if (d == null) return "";
  return d <= 0 ? `Day ${d === 0 ? "0" : "−" + Math.abs(d)}` : `Day ${d}`;
}

export default function TaskItem({
  item,
  locked,
  agentId,
  currentDay,
}: {
  item: Task;
  locked: boolean;
  agentId: string;
  currentDay: number;
}) {
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [score, setScore] = useState("");
  const [l1, setL1] = useState("");
  const [l2, setL2] = useState("");
  const t = item.task;
  const done = item.status === "verified";
  const owner = t.owner_role ?? "agent";
  const mine = owner === "agent";
  const overdue = !done && !t.recurring && t.due_day != null && t.due_day < currentDay;

  const isQuestionnaire = t.key === "questionnaire";
  const isSelf = t.verifier === "self" && t.evidence === "checkbox" && !isQuestionnaire;
  const isCounter = t.evidence === "counter";
  const isW9 = t.key === "w9";
  const isICA = t.key === "ica";
  const isPerformance = t.key === "performance";
  const isLenders = t.key === "two_zhl_lenders";
  const isUpload = (t.evidence === "upload" || t.evidence === "esign") && !isW9 && !isICA && !isPerformance;
  const isRoleplay = t.type === "roleplay";
  const teamHandles = !mine && !done;

  async function uploadFile(file: File): Promise<string | null> {
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "dat";
    const path = `${agentId}/${t.key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("agent-files").upload(path, file, { upsert: true });
    return error ? null : path;
  }

  return (
    <div className={`task ${done ? "done" : ""}`}>
      {isSelf && mine ? (
        <input
          type="checkbox"
          className="a-check"
          checked={done}
          disabled={locked || pending}
          onChange={(e) => start(() => toggleSelfTask(item.id, e.target.checked))}
          aria-label={`${done ? "Mark incomplete" : "Mark complete"}: ${t.title}`}
        />
      ) : (
        <span
          className="a-check"
          style={{
            borderStyle: "dashed",
            display: "grid",
            placeItems: "center",
            background: done ? "rgba(70,199,149,.85)" : "transparent",
            borderColor: done ? "transparent" : undefined,
            color: "#04041A",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {done ? "✓" : ""}
        </span>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="task-title">{t.title}</div>
        {t.description && <p className="task-detail">{t.description}</p>}

        <div className="task-meta">
          <span className="chip" style={{ color: ROLE_COLOR[owner] }}>
            <span className="dot" />
            {ROLE_LABEL[owner] ?? owner}
          </span>
          {t.recurring && <span className="chip">Daily / weekly</span>}
          {(t.links ?? []).map((x) => (
            <a key={x.u} className="tlink" href={x.u} target="_blank" rel="noopener">
              {x.l} ↗
            </a>
          ))}
          {!t.links?.length && t.content_url && (
            <a className="tlink" href={t.content_url} target="_blank" rel="noopener">
              Open training ↗
            </a>
          )}
          {t.content_state === "create" && !t.content_url && (
            <span className="vbadge pending">content TBD</span>
          )}
          {item.status === "submitted" && <span className="vbadge pending">Awaiting review</span>}
          {done && t.verifier === "admin" && <span className="vbadge ok">✓ Verified</span>}
          {teamHandles && (
            <span className="a-dimtxt" style={{ fontSize: 11.5 }}>
              {ROLE_LABEL[owner]} handles this
            </span>
          )}
        </div>

        {/* Rep / recurring counter */}
        {isCounter && mine && !done && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
            <span className="a-muted a-num" style={{ fontSize: 12 }}>
              {item.progress_count}/{t.target_count}
            </span>
            <button
              disabled={locked || pending}
              onClick={() => start(() => bumpCounter(item.id, t.target_count))}
              className="a-btn small"
            >
              + Log one
            </button>
          </div>
        )}

        {/* Team Member Questionnaire */}
        {isQuestionnaire && item.status !== "verified" && (
          <Link href={`/agent/questionnaire?at=${item.id}`} className="a-btn small solid" style={{ display: "inline-block", marginTop: 10, textDecoration: "none" }}>
            Fill out questionnaire →
          </Link>
        )}

        {/* E-sign flows */}
        {isW9 && item.status !== "verified" && (
          <Link href={`/agent/sign/w9?at=${item.id}`} className="a-btn small solid" style={{ display: "inline-block", marginTop: 10, textDecoration: "none" }}>
            Fill & sign W-9 →
          </Link>
        )}
        {isICA && item.status !== "verified" && (
          <Link href={`/agent/sign/ica?at=${item.id}`} className="a-btn small solid" style={{ display: "inline-block", marginTop: 10, textDecoration: "none" }}>
            Read & sign ICA →
          </Link>
        )}
        {isPerformance && item.status !== "verified" && (
          <Link href={`/agent/sign/performance?at=${item.id}`} className="a-btn small solid" style={{ display: "inline-block", marginTop: 10, textDecoration: "none" }}>
            Read & sign policy →
          </Link>
        )}

        {/* ZHL lenders */}
        {isLenders && item.status !== "verified" && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <a href="/agent/lenders" target="_blank" className="tlink" style={{ alignSelf: "flex-start" }}>
              View ZHL lender list ↗
            </a>
            {item.status === "submitted" ? (
              <p className="a-dimtxt" style={{ fontSize: 12 }}>Submitted — a manager will confirm with the lenders.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 280 }}>
                <input value={l1} onChange={(e) => setL1(e.target.value)} placeholder="Lender 1 name" className="a-input" style={{ padding: "7px 11px", fontSize: 12.5 }} />
                <input value={l2} onChange={(e) => setL2(e.target.value)} placeholder="Lender 2 name" className="a-input" style={{ padding: "7px 11px", fontSize: 12.5 }} />
                <button
                  disabled={!l1 || !l2 || locked || pending}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("agent_task_id", item.id);
                    fd.set("lender1", l1);
                    fd.set("lender2", l2);
                    start(async () => {
                      await submitLenders(fd);
                    });
                  }}
                  className="a-btn small"
                  style={{ alignSelf: "flex-start" }}
                >
                  Submit lenders
                </button>
              </div>
            )}
          </div>
        )}

        {/* File upload */}
        {isUpload && mine && item.status !== "verified" && (
          <label style={{ marginTop: 10, display: "inline-flex", cursor: "pointer" }}>
            <span className="a-btn small">
              {uploading ? "Uploading…" : item.status === "submitted" ? "Replace file" : "Upload file"}
            </span>
            <input
              type="file"
              style={{ display: "none" }}
              disabled={locked || uploading}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setUploading(true);
                const path = await uploadFile(f);
                setUploading(false);
                if (path) start(() => recordUpload(item.id, path));
              }}
            />
          </label>
        )}

        {/* Roleplay logging — checklist standard: 15 sessions at an 8/10+ average */}
        {isRoleplay && item.status !== "verified" && (
          <div style={{ marginTop: 10 }}>
            <p className="a-muted a-num" style={{ fontSize: 12 }}>
              {item.progress_count}/{t.target_count ?? 15} sessions · average must be ≥ 8/10
            </p>
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Score"
                className="a-input"
                style={{ width: 76, padding: "6px 9px", fontSize: 12.5 }}
              />
              <label className="a-btn small ghost" style={{ cursor: "pointer" }}>
                {uploading ? "…" : "Attach result"}
                <input
                  type="file"
                  style={{ display: "none" }}
                  disabled={uploading}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploading(true);
                    const path = await uploadFile(f);
                    setUploading(false);
                    if (path && score) start(() => logRoleplay(item.id, Number(score), path));
                    setScore("");
                  }}
                />
              </label>
              <button
                disabled={!score || pending}
                onClick={() => {
                  start(() => logRoleplay(item.id, Number(score), null));
                  setScore("");
                }}
                className="a-btn small solid"
              >
                Log session
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flex: "none" }}>
        <span className={`duetag ${overdue ? "over" : ""}`}>
          {overdue ? "OVERDUE · " : ""}
          {fmtDue(t.due_day)}
        </span>
        {STATUS_LABEL[item.status] && (
          <span className="a-dimtxt" style={{ fontSize: 10.5 }}>{STATUS_LABEL[item.status]}</span>
        )}
      </div>
    </div>
  );
}
