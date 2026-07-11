// Shared ASCENT UI — server components (no client JS needed).
import { AgentCtx, Flag, GATES, critMet, dayOf, gateCleared, gateReady, Gate } from "@/lib/journey";

export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none" aria-hidden
      style={{ filter: "drop-shadow(0 0 8px rgba(178,153,90,.5))", alignSelf: "center" }}>
      <path d="M20 2 L24 16 L38 20 L24 24 L20 38 L16 24 L2 20 L16 16 Z" fill="#B2995A" />
      <circle cx="20" cy="20" r="3.2" fill="#060644" />
    </svg>
  );
}

export function Topbar({ sub, right }: { sub: string; right?: React.ReactNode }) {
  return (
    <div className="topbar">
      <a className="wordmark" href="/">
        <Mark />
        <b>ASCENT</b>
        <span>{sub}</span>
      </a>
      <div style={{ flex: 1 }} />
      {right}
      <form action="/auth/signout" method="post">
        <button className="a-btn ghost small">Sign out</button>
      </form>
    </div>
  );
}

export function Ring({ pct, size = 116, label, subLabel }: { pct: number; size?: number; label: string; subLabel?: string }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(160,164,255,.14)" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#agld)" strokeWidth={4} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
        <defs>
          <linearGradient id="agld" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#B2995A" /><stop offset="1" stopColor="#E2CD96" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <b style={{ fontFamily: "var(--font-heading)", fontSize: size > 60 ? 24 : 11, fontWeight: 700 }}>{label}</b>
          {subLabel && (
            <><br /><span style={{ fontSize: 9.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--a-muted)" }}>{subLabel}</span></>
          )}
        </div>
      </div>
    </div>
  );
}

export function Trajectory({ ctx }: { ctx: AgentCtx }) {
  const W = 760, H = 120, dMin = -10, dMax = 66;
  const X = (d: number) => 20 + (W - 40) * (d - dMin) / (dMax - dMin);
  const Y = (d: number) => { const t = (d - dMin) / (dMax - dMin); return H - 16 - (H - 42) * Math.pow(t, 1.35); };
  const day = Math.min(dMax, Math.max(dMin, dayOf(ctx.startDate)));
  const seg = (from: number, to: number) => {
    const pts: string[] = [];
    for (let d = from; d <= to; d += 2) pts.push(`${d === from ? "M" : "L"}${X(d).toFixed(1)},${Y(d).toFixed(1)}`);
    return pts.join(" ");
  };
  const gates: [string, number, string][] = [["g0", 0, "GATE 0"], ["g8", 8, "LAUNCH"], ["g30", 30, "DAY 30"], ["g60", 60, "DAY 60"]];
  return (
    <div style={{ marginTop: 22, width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Ascent trajectory">
        <path d={seg(dMin, dMax)} fill="none" stroke="rgba(160,164,255,.18)" strokeWidth={1.5} strokeDasharray="1 5" />
        <path d={seg(dMin, day)} fill="none" stroke="url(#agld2)" strokeWidth={2.5} strokeLinecap="round" />
        <defs>
          <linearGradient id="agld2" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#7d6c40" /><stop offset="1" stopColor="#E2CD96" />
          </linearGradient>
        </defs>
        {gates.map(([g, d, label]) => {
          const cleared = gateCleared(ctx, g) || (g !== "g0" && g !== "g8" && gateReady(ctx, g));
          const col = cleared ? "#43C08F" : day >= d ? "#E5924E" : "#63659B";
          return (
            <g key={g} transform={`translate(${X(d)},${Y(d)})`}>
              <rect x={-5} y={-5} width={10} height={10} transform="rotate(45)" fill={day >= d && cleared ? col : "#0A0A3A"} stroke={col} strokeWidth={1.5} />
              <text y={-13} textAnchor="middle" fontSize={8.5} letterSpacing={1.5} fill="#9294C6" fontFamily="var(--font-heading)">{label}</text>
            </g>
          );
        })}
        <circle cx={X(day)} cy={Y(day)} r={5.5} fill="#E2CD96" />
      </svg>
      <div className="traj-labels"><span>Pre-Flight</span><span>Launch</span><span>Reinforcement</span><span>Orbit</span></div>
    </div>
  );
}

export function FlagList({ flags, max = 6, withRole = false }: { flags: Flag[]; max?: number; withRole?: boolean }) {
  const SIG: Record<string, string> = { crit: "Action", warn: "Watch", info: "Note", good: "Win" };
  if (!flags.length) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      {flags.slice(0, max).map((f, i) => (
        <div key={i} className={`flag ${f.sev}`}>
          <span className="sig">{SIG[f.sev]}</span>
          <span>{withRole && <b style={{ marginRight: 6 }}>{f.role}</b>}{f.text}</span>
        </div>
      ))}
    </div>
  );
}

export function GateBanner({ ctx, gate, action }: { ctx: AgentCtx; gate: Gate; action?: React.ReactNode }) {
  const ready = gateReady(ctx, gate.key);
  const cleared = gateCleared(ctx, gate.key);
  const status = cleared ? ["cleared", "Cleared"] : ready ? ["ready", "Ready to clear"] : ["locked", gate.checkpoint ? "Open checkpoint" : "Locked"];
  const open = gate.criteria.filter((c) => !critMet(ctx, c).met).length;
  return (
    <div className={`gate ${cleared ? "cleared" : ""}`}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
        <h3>{gate.name}</h3>
        <span className={`gate-status ${status[0]}`}>{status[1]}</span>
        <span className="a-dimtxt a-num" style={{ fontSize: 11 }}>DAY {gate.day}</span>
      </div>
      <p className="a-muted" style={{ fontSize: 13.5, marginBottom: 4, maxWidth: "80ch" }}>{gate.sub}</p>
      <div className="criteria">
        {gate.criteria.map((c, i) => {
          const r = critMet(ctx, c);
          return (
            <div key={i} className={`crit-row ${r.met ? "met" : "unmet"}`}>
              <span className="st">{r.met ? "✓" : ""}</span>
              <span>{c.label}{r.detail && <span className="a-dimtxt a-num" style={{ marginLeft: 6, fontSize: 12 }}>({r.detail})</span>}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {!cleared && ready && action}
        {!cleared && !ready && (
          <span className="a-muted" style={{ fontSize: 12.5 }}>{open} of {gate.criteria.length} criteria open</span>
        )}
        {cleared && <span className="a-muted" style={{ fontSize: 12.5 }}>Signed off ✓</span>}
      </div>
    </div>
  );
}

export { GATES };
