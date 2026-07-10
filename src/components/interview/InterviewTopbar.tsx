"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Clock, Copy, Check, Square, Loader2 } from "lucide-react";

function fmt(ms: number) {
  const neg = ms < 0;
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${neg ? "-" : ""}${h > 0 ? pad(h) + ":" : ""}${pad(m)}:${pad(s)}`;
}

export function InterviewTopbar({
  sessionId,
  startEpoch,
  durationMinutes,
  candidateToken,
}: {
  sessionId: string;
  startEpoch: number;
  durationMinutes: number | null;
  candidateToken: string;
}) {
  const router = useRouter();
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [ending, setEnding] = useState(false);

  // Build the candidate link from the actual browser origin so it always
  // matches the running host/port (avoids stale NEXT_PUBLIC_APP_URL issues).
  const [candidateLink, setCandidateLink] = useState(`/join/${candidateToken}`);
  useEffect(() => {
    setCandidateLink(`${window.location.origin}/join/${candidateToken}`);
  }, [candidateToken]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = now - startEpoch;
  const display = durationMinutes
    ? fmt(durationMinutes * 60_000 - elapsed)
    : fmt(elapsed);
  const overtime = durationMinutes ? elapsed > durationMinutes * 60_000 : false;

  async function addFlag() {
    setFlagging(true);
    const label = window.prompt("Label this moment (optional):") || null;
    await fetch(`/api/sessions/${sessionId}/flags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timestampMs: Math.max(0, elapsed), label }),
    }).catch(() => {});
    setFlagging(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(candidateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function endAndEvaluate() {
    if (!window.confirm("End the interview and run the AI evaluation?")) return;
    setEnding(true);
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ENDED" }),
      });
      const res = await fetch(`/api/sessions/${sessionId}/evaluate`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.reportUrl) router.push(data.reportUrl);
      else {
        alert(data.error ?? "Evaluation failed");
        setEnding(false);
      }
    } catch {
      alert("Evaluation failed");
      setEnding(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 bg-white px-4 py-2.5">
      <div className="flex items-center gap-2">
        <Clock className={`h-4 w-4 ${overtime ? "text-red-500" : "text-slate-400"}`} />
        <span
          className={`font-mono text-sm font-semibold tabular-nums ${
            overtime ? "text-red-600" : "text-slate-700"
          }`}
        >
          {display}
        </span>
        <span className="ml-1 text-xs text-slate-400">
          {durationMinutes ? "remaining" : "elapsed"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={copyLink} className="btn-secondary flex-1 sm:flex-none">
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied" : "Candidate link"}
        </button>
        <button onClick={addFlag} className="btn-secondary flex-1 sm:flex-none" disabled={flagging}>
          <Flag className="h-4 w-4 text-amber-500" /> Flag moment
        </button>
        <button onClick={endAndEvaluate} className="btn-primary w-full sm:w-auto" disabled={ending}>
          {ending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          {ending ? "Evaluating…" : "End & evaluate"}
        </button>
      </div>
    </div>
  );
}
