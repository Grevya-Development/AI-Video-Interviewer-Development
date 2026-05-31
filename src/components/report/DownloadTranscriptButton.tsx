"use client";

import { FileText } from "lucide-react";

interface Segment {
  speakerRole: "HR" | "CANDIDATE";
  text: string;
  startMs: number;
}

function clock(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function DownloadTranscriptButton({
  segments,
  jobTitle,
}: {
  segments: Segment[];
  jobTitle: string;
}) {
  function download() {
    const header = `Interview transcript — ${jobTitle}\n${"=".repeat(40)}\n\n`;
    const body = segments
      .map(
        (s) =>
          `[${clock(s.startMs)}] ${s.speakerRole === "HR" ? "Interviewer" : "Candidate"}: ${s.text}`,
      )
      .join("\n");
    const blob = new Blob([header + body + "\n"], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe = jobTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    a.download = `transcript-${safe}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      disabled={segments.length === 0}
      className="btn-secondary no-print"
      title={
        segments.length === 0
          ? "No transcript was captured for this interview"
          : "Download the full transcript (.txt)"
      }
    >
      <FileText className="h-4 w-4" /> Download transcript
    </button>
  );
}
