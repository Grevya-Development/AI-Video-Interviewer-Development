"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
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
  const bottomRef = useRef<HTMLDivElement>(null);

  // Poll the transcript endpoint — reliable, no Supabase Realtime setup needed.
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/transcript`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.segments)) setSegments(data.segments);
      } catch {
        /* ignore transient errors */
      }
    }
    poll();
    const t = setInterval(poll, pollMs);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [sessionId, pollMs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [segments.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <h2 className="text-sm font-semibold text-slate-700">Live transcript</h2>
        <button
          onClick={() => downloadTranscript(segments, jobTitle)}
          disabled={segments.length === 0}
          className="btn-ghost px-2 py-1 text-xs"
          title="Download transcript (.txt)"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {segments.length === 0 ? (
          <p className="pt-8 text-center text-sm text-slate-400">
            Transcript will appear here as the conversation is captured…
          </p>
        ) : (
          segments
            .slice()
            .sort((a, b) => a.startMs - b.startMs)
            .map((s) => (
              <div key={s.id} className="text-sm leading-relaxed">
                <span className="mr-2 select-none font-mono text-xs text-slate-400">
                  {clock(s.startMs)}
                </span>
                <span
                  className={`mr-1.5 font-semibold ${
                    s.speakerRole === "HR" ? "text-brand-600" : "text-candidate"
                  }`}
                >
                  {s.speakerRole === "HR" ? "Interviewer" : "Candidate"}:
                </span>
                <span className="text-slate-700">{s.text}</span>
              </div>
            ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
