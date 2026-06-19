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
    target_count: number | null;
    content_url: string | null;
    content_state: string;
  };
};

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Awaiting review",
  verified: "Done",
  rejected: "Needs redo",
};

export default function TaskItem({
  item,
  locked,
  agentId,
}: {
  item: Task;
  locked: boolean;
  agentId: string;
}) {
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [score, setScore] = useState("");
  const [l1, setL1] = useState("");
  const [l2, setL2] = useState("");
  const t = item.task;
  const done = item.status === "verified";
  const isQuestionnaire = t.key === "questionnaire";
  const isSelf = t.verifier === "self" && t.evidence === "checkbox" && !isQuestionnaire;
  const isCounter = t.evidence === "counter";
  const isW9 = t.key === "w9";
  const isICA = t.key === "ica";
  const isPerformance = t.key === "performance";
  const isLenders = t.key === "two_zhl_lenders";
  const isUpload = (t.evidence === "upload" || t.evidence === "esign") && !isW9 && !isICA && !isPerformance;
  const isRoleplay = t.type === "roleplay";
  const adminWaits =
    (t.verifier === "admin" || t.verifier === "auto") && !isUpload && !isRoleplay && !isCounter && !isLenders;

  async function uploadFile(file: File): Promise<string | null> {
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "dat";
    const path = `${agentId}/${t.key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("agent-files").upload(path, file, { upsert: true });
    return error ? null : path;
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 ${
        done ? "border-gold/40 bg-gold/10" : "border-slate-200 bg-white"
      } ${locked ? "opacity-50" : ""}`}
    >
      {isSelf ? (
        <input
          type="checkbox"
          checked={done}
          disabled={locked || pending}
          onChange={(e) => start(() => toggleSelfTask(item.id, e.target.checked))}
          className="mt-1 h-4 w-4 rounded"
        />
      ) : (
        <span className={`mt-1 inline-block h-4 w-4 rounded-full ${done ? "bg-gold/100" : "bg-slate-300"}`} />
      )}

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${done ? "text-slate-500 line-through" : "text-navy"}`}>
            {t.title}
          </span>
          {t.content_state === "create" && !t.content_url && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">content TBD</span>
          )}
        </div>
        {t.description && <p className="mt-0.5 text-xs text-slate-500">{t.description}</p>}
        {t.content_url && (
          <a href={t.content_url} target="_blank" className="mt-1 inline-block text-xs text-navy underline">
            Open training →
          </a>
        )}

        {/* Rep / recurring counter */}
        {isCounter && !done && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {item.progress_count}/{t.target_count}
            </span>
            <button
              disabled={locked || pending}
              onClick={() => start(() => bumpCounter(item.id, t.target_count))}
              className="rounded bg-navy px-2 py-1 text-xs text-white hover:bg-navy-light"
            >
              + Log one
            </button>
          </div>
        )}

        {/* Team Member Questionnaire */}
        {isQuestionnaire && item.status !== "verified" && (
          <Link
            href={`/agent/questionnaire?at=${item.id}`}
            className="mt-2 inline-block rounded bg-navy px-2 py-1 text-xs font-medium text-white hover:bg-navy-light"
          >
            Fill out questionnaire →
          </Link>
        )}

        {/* W-9 e-sign */}
        {isW9 && item.status !== "verified" && (
          <Link
            href={`/agent/sign/w9?at=${item.id}`}
            className="mt-2 inline-block rounded bg-navy px-2 py-1 text-xs font-medium text-white hover:bg-navy-light"
          >
            Fill & sign W-9 →
          </Link>
        )}

        {/* ICA e-sign */}
        {isICA && item.status !== "verified" && (
          <Link
            href={`/agent/sign/ica?at=${item.id}`}
            className="mt-2 inline-block rounded bg-navy px-2 py-1 text-xs font-medium text-white hover:bg-navy-light"
          >
            Read & sign ICA →
          </Link>
        )}

        {/* Performance Standards e-sign */}
        {isPerformance && item.status !== "verified" && (
          <Link
            href={`/agent/sign/performance?at=${item.id}`}
            className="mt-2 inline-block rounded bg-navy px-2 py-1 text-xs font-medium text-white hover:bg-navy-light"
          >
            Read & sign policy →
          </Link>
        )}

        {/* ZHL lenders — view list + submit the two you built a relationship with */}
        {isLenders && item.status !== "verified" && (
          <div className="mt-2 space-y-2">
            <a href="/agent/lenders" target="_blank" className="inline-block text-xs text-navy underline">
              View ZHL lender list →
            </a>
            {item.status === "submitted" ? (
              <p className="text-xs text-slate-400">Submitted — a manager will confirm with the lenders.</p>
            ) : (
              <div className="flex flex-col gap-1">
                <input
                  value={l1}
                  onChange={(e) => setL1(e.target.value)}
                  placeholder="Lender 1 name"
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                />
                <input
                  value={l2}
                  onChange={(e) => setL2(e.target.value)}
                  placeholder="Lender 2 name"
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                />
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
                  className="self-start rounded bg-navy px-2 py-1 text-xs text-white hover:bg-navy-light disabled:opacity-50"
                >
                  Submit lenders
                </button>
              </div>
            )}
          </div>
        )}

        {/* File upload */}
        {isUpload && item.status !== "verified" && (
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs">
            <span className="rounded bg-navy px-2 py-1 font-medium text-white hover:bg-navy-light">
              {uploading ? "Uploading…" : item.status === "submitted" ? "Replace file" : "Upload file"}
            </span>
            <input
              type="file"
              className="hidden"
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

        {/* Roleplay logging */}
        {isRoleplay && item.status !== "verified" && (
          <div className="mt-2">
            <p className="text-xs text-slate-500">
              {item.progress_count}/{t.target_count ?? 10} calls · last 3 must be ≥ 7/10
            </p>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Score"
                className="w-20 rounded border border-slate-300 px-2 py-1 text-xs"
              />
              <label className="cursor-pointer rounded bg-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-300">
                {uploading ? "…" : "Attach result"}
                <input
                  type="file"
                  className="hidden"
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
                className="rounded bg-navy px-2 py-1 text-xs text-white hover:bg-navy-light"
              >
                Log call
              </button>
            </div>
          </div>
        )}

        {adminWaits && (
          <p className="mt-1 text-xs text-slate-400">{done ? "Verified by team" : "A manager verifies this"}</p>
        )}
      </div>

      <span className="text-xs text-slate-400">{STATUS_LABEL[item.status] ?? item.status}</span>
    </div>
  );
}
