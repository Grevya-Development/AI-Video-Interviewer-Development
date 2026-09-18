"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Clock, Copy, Check, Square, Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react";

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
  jobTitle,
  startEpoch,
  durationMinutes,
  candidateToken,
  sidebarCollapsed,
  onToggleSidebar,
}: {
  sessionId: string;
  jobTitle?: string;
  startEpoch: number;
  durationMinutes: number | null;
  candidateToken: string;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}) {
  const router = useRouter();
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [ending, setEnding] = useState(false);

  // Build candidate link
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

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagNote, setFlagNote] = useState("");

  async function handleSaveFlag() {
    if (flagging) return;
    setFlagging(true);
    const label = flagNote.trim() || null;
    try {
      await fetch(`/api/sessions/${sessionId}/flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestampMs: Math.max(0, elapsed), label }),
      });
    } catch {
      /* ignore */
    } finally {
      setFlagging(false);
      setShowFlagModal(false);
      setFlagNote("");
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(candidateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function endAndEvaluate() {
    setEnding(true);
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ENDED" }),
      });
    } catch {
      /* ignore endpoint network issues */
    }
    router.push(`/interview/${sessionId}/evaluate`);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-white px-4 py-2 gap-2 shadow-xs z-10 shrink-0">
        {/* Left: Job Title & Clock */}
        <div className="flex items-center gap-3">
          {jobTitle && (
            <span className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-md">
              {jobTitle} <span className="text-brand-600 font-semibold ml-1">· HR view</span>
            </span>
          )}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-md">
            <Clock className={`h-3.5 w-3.5 ${overtime ? "text-red-500" : "text-slate-400"}`} />
            <span
              className={`font-mono text-xs font-bold tabular-nums ${
                overtime ? "text-red-600" : "text-slate-700"
              }`}
            >
              {display}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button onClick={copyLink} className="btn-secondary py-1 px-3 text-xs">
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Candidate link"}
          </button>
          <button onClick={() => setShowFlagModal(true)} className="btn-secondary py-1 px-3 text-xs" disabled={flagging}>
            <Flag className="h-3.5 w-3.5 text-amber-500" /> Flag moment
          </button>
          <button
            onClick={() => setShowConfirmModal(true)}
            className="btn-primary py-1 px-3 text-xs font-semibold"
            disabled={ending}
          >
            {ending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            {ending ? "Evaluating…" : "End & evaluate"}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !ending) {
              setShowConfirmModal(false);
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Square className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-slate-900">
                  End Interview & Evaluate?
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Are you sure you want to end this interview session?
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  The candidate call will be ended, and you will be taken to the
                  evaluation page to review transcripts, notes, and set final scores.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={ending}
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={ending}
                onClick={() => {
                  setShowConfirmModal(false);
                  endAndEvaluate();
                }}
                className="btn-primary text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white"
              >
                {ending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Ending...
                  </>
                ) : (
                  "End & Proceed to Evaluation"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flag Moment Modal */}
      {showFlagModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !flagging) {
              setShowFlagModal(false);
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Flag className="h-5 w-5 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Flag Interview Moment
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Bookmark this timestamp in the transcript with an optional label for review.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveFlag();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Label / Note (Optional)
                </label>
                <input
                  type="text"
                  autoFocus
                  value={flagNote}
                  onChange={(e) => setFlagNote(e.target.value)}
                  placeholder="e.g., Great system design response, technical depth, follow-up needed..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={flagging}
                  onClick={() => setShowFlagModal(false)}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={flagging}
                  className="btn-primary text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2"
                >
                  {flagging ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Flag"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
