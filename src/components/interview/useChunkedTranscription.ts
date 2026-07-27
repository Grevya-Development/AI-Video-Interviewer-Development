"use client";

import { useEffect } from "react";
import { Track } from "livekit-client";
import { useLocalParticipant } from "@livekit/components-react";

const CHUNK_MS = 5000;

/**
 * Records the LOCAL participant's microphone in ~5s chunks and POSTs each to
 * /api/transcribe. Speaker labeling is implicit: each client only records its
 * own mic, so the server tags the chunk with this client's role.
 *
 * We use a stop/restart cycle (NOT MediaRecorder timeslice) so that EVERY
 * chunk is a complete, standalone WebM file with its own header — otherwise
 * Whisper can only decode the first chunk and the rest 400/500.
 *
 * `candidateToken` is passed on the candidate side (no auth); omitted for HR
 * (authenticated via cookies).
 */
export function useChunkedTranscription(opts: {
  sessionId: string;
  startEpoch: number; // ms epoch when the interview clock started
  candidateToken?: string;
  enabled: boolean;
}) {
  const { sessionId, startEpoch, candidateToken, enabled } = opts;
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (!enabled || !localParticipant) return;

    let stopped = false;
    let recorder: MediaRecorder | null = null;
    let stopTimer: ReturnType<typeof setTimeout> | null = null;

    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

    async function post(blob: Blob, segStartEpoch: number, extension: string) {
      if (blob.size < 2000) return; // skip near-silent / empty
      const startMs = Math.max(0, segStartEpoch - startEpoch);
      const endMs = Date.now() - startEpoch;
      const form = new FormData();
      form.append("audio", blob, `chunk.${extension}`);
      form.append("sessionId", sessionId);
      form.append("startMs", String(startMs));
      form.append("endMs", String(endMs));
      if (candidateToken) form.append("candidateToken", candidateToken);
      try {
        await fetch("/api/transcribe", { method: "POST", body: form });
      } catch {
        /* network hiccup — drop this chunk */
      }
    }

    function recordOnce() {
      if (stopped) return;
      const pub = localParticipant.getTrackPublication(Track.Source.Microphone);
      const mediaTrack = pub?.track?.mediaStreamTrack;
      if (!mediaTrack) {
        // Mic not published yet — retry shortly.
        stopTimer = setTimeout(recordOnce, 1000);
        return;
      }

      const stream = new MediaStream([mediaTrack]);
      const chunks: BlobPart[] = [];
      const segStartEpoch = Date.now();

      let actualMimeType = mime || "audio/webm";
      try {
        recorder = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream);
        actualMimeType = recorder.mimeType || actualMimeType;
      } catch {
        return;
      }

      let extension = "webm";
      const m = actualMimeType.toLowerCase();
      if (m.includes("mp4") || m.includes("aac") || m.includes("m4a")) {
        extension = "mp4";
      } else if (m.includes("ogg")) {
        extension = "ogg";
      } else if (m.includes("wav")) {
        extension = "wav";
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: actualMimeType });
        void post(blob, segStartEpoch, extension);
        if (!stopped) recordOnce(); // start the next chunk
      };

      recorder.start();
      stopTimer = setTimeout(() => {
        if (recorder && recorder.state !== "inactive") recorder.stop();
      }, CHUNK_MS);
    }

    recordOnce();

    return () => {
      stopped = true;
      if (stopTimer) clearTimeout(stopTimer);
      try {
        if (recorder && recorder.state !== "inactive") recorder.stop();
      } catch {
        /* ignore */
      }
    };
  }, [enabled, localParticipant, sessionId, startEpoch, candidateToken]);
}
