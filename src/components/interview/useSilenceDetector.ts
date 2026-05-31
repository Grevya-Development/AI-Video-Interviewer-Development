"use client";

import { useEffect, useRef } from "react";

const SILENCE_THRESHOLD = 0.012; // RMS below this == "silence"
const SILENCE_MS = 3000; // >3s of silence after speech

/**
 * Watches a remote audio MediaStreamTrack (the candidate). When the candidate
 * speaks and then goes silent for >3s, fires `onSilence` exactly once per
 * speak→silence transition. Used to trigger AI follow-up suggestions.
 */
export function useSilenceDetector(
  track: MediaStreamTrack | null | undefined,
  onSilence: () => void,
  enabled: boolean,
) {
  const cbRef = useRef(onSilence);
  cbRef.current = onSilence;

  useEffect(() => {
    if (!enabled || !track) return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);

    let raf = 0;
    let hasSpoken = false;
    let silenceStart: number | null = null;
    let fired = false;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      // Compute RMS around the 128 midpoint.
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const now = performance.now();

      if (rms > SILENCE_THRESHOLD) {
        hasSpoken = true;
        silenceStart = null;
        fired = false;
      } else if (hasSpoken) {
        if (silenceStart === null) silenceStart = now;
        else if (!fired && now - silenceStart > SILENCE_MS) {
          fired = true;
          hasSpoken = false;
          cbRef.current();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      ctx.close().catch(() => {});
    };
  }, [track, enabled]);
}
