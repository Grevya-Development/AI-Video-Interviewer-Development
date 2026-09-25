"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, MessageSquare, Download } from "lucide-react";
import type { TranscriptSegmentDTO } from "./types";

function clock(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatTranscript(
  segments: TranscriptSegmentDTO[],
  jobTitle?: string,
) {
  const header = jobTitle
    ? `Interview transcript — ${jobTitle}\n${"=".repeat(40)}\n\n`
    : "";
  const body = segments
    .slice()
    .sort((a, b) => a.startMs - b.startMs)
    .map(
      (s) =>
        `[${clock(s.startMs)}] ${s.speakerRole === "HR" ? "Interviewer" : "Candidate"}: ${s.text}`,
    )
    .join("\n");
  return header + body + "\n";
}

export function downloadTranscript(
  segments: TranscriptSegmentDTO[],
  jobTitle?: string,
) {
  const text = formatTranscript(segments, jobTitle);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safe = (jobTitle ?? "interview").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  a.download = `transcript-${safe}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function TranscriptFeed({
  sessionId,
  initial,
  jobTitle,
  pollMs = 3000,
}: {
  sessionId: string;
  initial: TranscriptSegmentDTO[];
  jobTitle?: string;
  pollMs?: number;
}) {
  const [segments, setSegments] = useState<TranscriptSegmentDTO[]>(initial);
  const [viewMode, setViewMode] = useState<"auto" | "off">("auto");
  const [latestSegment, setLatestSegment] = useState<TranscriptSegmentDTO | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevCountRef = useRef<number>(initial.length);

  // Poll the transcript endpoint
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/transcript`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.segments)) {
          const newSegs: TranscriptSegmentDTO[] = data.segments;
          setSegments(newSegs);

          // If new speech segment arrived or text changed
          if (newSegs.length > 0) {
            const sorted = newSegs.slice().sort((a, b) => a.startMs - b.startMs);
            const newest = sorted[sorted.length - 1];

            if (newSegs.length > prevCountRef.current || newest.text !== latestSegment?.text) {
              setLatestSegment(newest);
              setShowPopup(true);

              if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
              hideTimerRef.current = setTimeout(() => {
                setShowPopup(false);
              }, 4000); // Hide after 4 seconds
            }
          }
          prevCountRef.current = newSegs.length;
        }
      } catch {
        /* ignore */
      }
    }
    poll();
    const t = setInterval(poll, pollMs);
    return () => {
      active = false;
      clearInterval(t);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [sessionId, pollMs, latestSegment?.text]);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden">
      {/* Header bar with controls */}
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 bg-slate-50/80">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-brand-600" />
          <span className="text-xs font-semibold text-slate-700">Live Transcript</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mode Switcher: Auto & Off only */}
          <div className="flex items-center rounded-lg bg-slate-200/70 p-0.5 text-[11px] font-medium">
            <button
              onClick={() => setViewMode("auto")}
              className={`rounded px-2.5 py-0.5 transition-colors ${
                viewMode === "auto"
                  ? "bg-white text-brand-700 font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Auto-display captions for 4 sec when speech is captured"
            >
              Auto (4s)
            </button>
            <button
              onClick={() => setViewMode("off")}
              className={`rounded px-2.5 py-0.5 transition-colors ${
                viewMode === "off"
                  ? "bg-white text-slate-900 font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Turn off live transcript captions"
            >
              Off
            </button>
          </div>

          <button
            onClick={() => downloadTranscript(segments, jobTitle)}
            disabled={segments.length === 0}
            className="btn-ghost px-1.5 py-0.5 text-xs text-slate-500 hover:text-slate-800"
            title="Download transcript (.txt)"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* AUTO POPUP MODE (Displays 4-second caption popup when speech comes in) */}
      {viewMode === "auto" && (
        <div className="p-2.5 flex items-center justify-center min-h-[50px] relative">
          {showPopup && latestSegment ? (
            <div className="w-full max-w-lg rounded-lg bg-slate-900/90 text-white px-3.5 py-2 text-xs shadow-lg backdrop-blur-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span
                className={`font-semibold mr-1.5 ${
                  latestSegment.speakerRole === "HR" ? "text-brand-300" : "text-amber-300"
                }`}
              >
                {latestSegment.speakerRole === "HR" ? "Interviewer" : "Candidate"}:
              </span>
              <span className="text-slate-100">{latestSegment.text}</span>
            </div>
          ) : (
            <p className="text-[11px] italic text-slate-400">
              Captions appear automatically when speaking...
            </p>
          )}
        </div>
      )}

    </div>
  );
}
