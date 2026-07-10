"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveKitRoom, useTracks, RoomAudioRenderer } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Loader2 } from "lucide-react";
import { VideoGrid } from "./VideoGrid";
import { QuestionSidebar } from "./QuestionSidebar";
import { TranscriptFeed } from "./TranscriptFeed";
import { InterviewTopbar } from "./InterviewTopbar";
import { MediaControls } from "./MediaControls";
import { useChunkedTranscription } from "./useChunkedTranscription";
import { useSilenceDetector } from "./useSilenceDetector";
import type {
  QuestionDTO,
  TranscriptSegmentDTO,
  TokenResponse,
} from "./types";

interface Props {
  sessionId: string;
  jobTitle: string;
  questions: QuestionDTO[];
  initialTranscript: TranscriptSegmentDTO[];
  durationMinutes: number | null;
  candidateToken: string;
}

export function HrInterviewRoom(props: Props) {
  const [conn, setConn] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Anchor the interview clock to first connect (stable across renders).
  const startEpochRef = useRef<number>(0);
  if (startEpochRef.current === 0) startEpochRef.current = Date.now();

  useEffect(() => {
    fetch("/api/livekit/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: props.sessionId }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Token error");
        return r.json();
      })
      .then(setConn)
      .catch((e) => setError(e.message));
  }, [props.sessionId]);

  if (error)
    return (
      <div className="flex h-screen items-center justify-center text-red-600">
        Could not join room: {error}
      </div>
    );

  if (!conn)
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Connecting…
      </div>
    );

  return (
    <LiveKitRoom
      serverUrl={conn.url}
      token={conn.token}
      connect
      audio
      video
      className="h-screen"
    >
      <RoomAudioRenderer />
      <HrPanelInner {...props} startEpoch={startEpochRef.current} />
    </LiveKitRoom>
  );
}

function HrPanelInner({
  sessionId,
  jobTitle,
  questions,
  initialTranscript,
  durationMinutes,
  candidateToken,
  startEpoch,
}: Props & { startEpoch: number }) {
  const [followup, setFollowup] = useState<string | null>(null);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"video" | "questions">("video");

  // HR records its own mic for transcription.
  useChunkedTranscription({ sessionId, startEpoch, enabled: true });

  // Find the candidate's remote audio track for silence detection.
  const micTracks = useTracks([Track.Source.Microphone]);
  const candidateAudio = useMemo(() => {
    const t = micTracks.find((tr) => {
      try {
        const role = tr.participant.metadata
          ? JSON.parse(tr.participant.metadata).role
          : null;
        return role === "CANDIDATE" && !tr.participant.isLocal;
      } catch {
        return false;
      }
    });
    return t?.publication?.track?.mediaStreamTrack ?? null;
  }, [micTracks]);

  const requestFollowup = useCallback(async () => {
    setFollowupLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/followup`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.followup) setFollowup(data.followup);
    } catch {
      /* ignore */
    } finally {
      setFollowupLoading(false);
    }
  }, [sessionId]);

  useSilenceDetector(candidateAudio, requestFollowup, true);

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-white px-4 py-2 gap-2">
        <span className="text-sm font-semibold text-slate-700">
          {jobTitle} · HR view
        </span>
        <MediaControls />
      </div>
      <InterviewTopbar
        sessionId={sessionId}
        startEpoch={startEpoch}
        durationMinutes={durationMinutes}
        candidateToken={candidateToken}
      />

      {/* Mobile view Tab Switcher */}
      <div className="flex border-b border-slate-200 bg-white lg:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("video")}
          className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "video"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Interview Room
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("questions")}
          className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "questions"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Questions ({questions.length})
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3 p-3">
        {/* Left: questions + AI follow-up */}
        <aside
          className={`col-span-12 min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white lg:col-span-3 lg:flex lg:flex-col ${
            activeTab === "questions" ? "flex flex-col h-full" : "hidden"
          }`}
        >
          <QuestionSidebar
            initial={questions}
            followup={followup}
            followupLoading={followupLoading}
            onDismissFollowup={() => setFollowup(null)}
          />
        </aside>

        {/* Center: video + transcript */}
        <main
          className={`col-span-12 min-h-0 flex-col gap-3 lg:col-span-6 lg:flex ${
            activeTab === "video" ? "flex h-full" : "hidden"
          }`}
        >
          <div className="h-auto lg:h-[40%] flex-shrink-0 min-h-0">
            <VideoGrid />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <TranscriptFeed
              sessionId={sessionId}
              initial={initialTranscript}
              jobTitle={jobTitle}
            />
          </div>
        </main>

        {/* Right: spacer / could hold flags later */}
        <aside className="col-span-12 hidden min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 lg:col-span-3 lg:block">
          <h2 className="text-sm font-semibold text-slate-700">Tips</h2>
          <ul className="mt-2 space-y-2 text-xs text-slate-500">
            <li>• Mark questions as Asked or Skip as you go.</li>
            <li>• AI proposes a follow-up after the candidate pauses.</li>
            <li>• Flag key moments to revisit in the report.</li>
            <li>• End & evaluate generates the scored report.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
