"use client";

import {
  useTracks,
  VideoTrack,
  useParticipants,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Mic, MicOff, User } from "lucide-react";

function roleOf(metadata?: string): "HR" | "CANDIDATE" | "UNKNOWN" {
  try {
    const m = metadata ? JSON.parse(metadata) : null;
    return m?.role ?? "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

export function VideoGrid() {
  const cameraTracks = useTracks([Track.Source.Camera], {
    onlySubscribed: false,
  });
  const participants = useParticipants();

  return (
    <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-2">
      {participants.map((p) => {
        const role = roleOf(p.metadata);
        const camPub = cameraTracks.find(
          (t) => t.participant.identity === p.identity,
        );
        const isMuted = !p.isMicrophoneEnabled;
        return (
          <div
            key={p.identity}
            className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-slate-900"
          >
            {camPub && p.isCameraEnabled ? (
              <VideoTrack
                trackRef={camPub}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center text-slate-500">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                  <User className="h-8 w-8" />
                </div>
              </div>
            )}

            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
              {isMuted ? (
                <MicOff className="h-3.5 w-3.5 text-red-400" />
              ) : (
                <Mic className="h-3.5 w-3.5 text-emerald-400" />
              )}
              <span>
                {p.name || p.identity}
                {p.isLocal ? " (you)" : ""}
              </span>
              <span
                className={`ml-1 rounded px-1 text-[10px] ${
                  role === "HR"
                    ? "bg-brand-500/30 text-brand-200"
                    : "bg-emerald-500/30 text-emerald-200"
                }`}
              >
                {role}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
