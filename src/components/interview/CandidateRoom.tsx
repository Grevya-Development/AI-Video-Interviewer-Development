"use client";

import { useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from "@livekit/components-react";
import { Loader2 } from "lucide-react";
import { VideoGrid } from "./VideoGrid";
import { MediaControls } from "./MediaControls";
import { useChunkedTranscription } from "./useChunkedTranscription";
import { Brand } from "@/components/Brand";
import type { TokenResponse } from "./types";

export function CandidateRoom({
  candidateToken,
  jobTitle,
  sessionId,
}: {
  candidateToken: string;
  jobTitle: string;
  sessionId: string;
}) {
  const [conn, setConn] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const startEpochRef = useRef<number>(0);

  async function join() {
    startEpochRef.current = Date.now();
    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateToken }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Join failed");
      setConn(await res.json());
      setJoined(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Join failed");
    }
  }

  if (error)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 px-6 text-center text-red-300">
        {error}
      </div>
    );

  // Pre-join lobby.
  if (!joined || !conn)
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-900 px-6 text-center text-white">
        <Brand variant="dark" size="lg" />
        <h1 className="mt-6 text-2xl font-semibold">{jobTitle}</h1>
        <p className="mt-2 max-w-md text-slate-300">
          You&apos;re about to join a live video interview. Please allow camera
          and microphone access.
        </p>
        <p className="mt-4 max-w-md text-sm text-slate-400">
          This session will be recorded and transcribed for evaluation purposes.
        </p>
        <button onClick={join} className="btn-primary mt-8 px-8 py-3 text-base">
          Join interview
        </button>
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
      <CandidateInner
        sessionId={sessionId}
        candidateToken={candidateToken}
        jobTitle={jobTitle}
        startEpoch={startEpochRef.current}
      />
    </LiveKitRoom>
  );
}

function CandidateInner({
  sessionId,
  candidateToken,
  jobTitle,
  startEpoch,
}: {
  sessionId: string;
  candidateToken: string;
  jobTitle: string;
  startEpoch: number;
}) {
  // Candidate records own mic for transcription. No AI UI is ever shown.
  useChunkedTranscription({
    sessionId,
    startEpoch,
    candidateToken,
    enabled: true,
  });

  const [blink, setBlink] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-slate-900">
      <div className="flex items-center justify-between px-5 py-3">
        <span className="text-sm font-medium text-slate-300">{jobTitle}</span>
        <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-slate-200">
          <span
            className={`h-2.5 w-2.5 rounded-full bg-red-500 transition-opacity ${
              blink ? "opacity-100" : "opacity-30"
            }`}
          />
          Recording in progress
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-5">
        <VideoGrid />
      </div>

      <div className="flex items-center justify-center py-4">
        <MediaControls />
      </div>
    </div>
  );
}
