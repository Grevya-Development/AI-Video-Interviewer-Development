"use client";

import { useEffect, useState } from "react";
import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";
import { ConnectionQuality, ParticipantEvent, Participant } from "livekit-client";
import { Wifi, Activity } from "lucide-react";

function getQualityMeta(quality: ConnectionQuality | undefined) {
  switch (quality) {
    case ConnectionQuality.Excellent:
      return {
        label: "Excellent",
        badgeColor: "bg-emerald-50 border-emerald-200 text-emerald-700",
        dotColor: "bg-emerald-500",
        bars: 3,
      };
    case ConnectionQuality.Good:
      return {
        label: "Good",
        badgeColor: "bg-emerald-50 border-emerald-200 text-emerald-700",
        dotColor: "bg-emerald-500",
        bars: 2,
      };
    case ConnectionQuality.Poor:
      return {
        label: "Unstable",
        badgeColor: "bg-amber-50 border-amber-200 text-amber-700",
        dotColor: "bg-amber-500 animate-pulse",
        bars: 1,
      };
    case ConnectionQuality.Lost:
      return {
        label: "Disconnected",
        badgeColor: "bg-red-50 border-red-200 text-red-700",
        dotColor: "bg-red-500",
        bars: 0,
      };
    case ConnectionQuality.Unknown:
    default:
      return {
        label: "Checking",
        badgeColor: "bg-slate-100 border-slate-200 text-slate-600",
        dotColor: "bg-slate-400",
        bars: 1,
      };
  }
}

function SignalBars({ count }: { count: number }) {
  return (
    <div className="flex items-end gap-0.5 h-3">
      <span className={`w-0.5 rounded-xs transition-colors ${count >= 1 ? "h-1.5 bg-current" : "h-1.5 opacity-25 bg-current"}`} />
      <span className={`w-0.5 rounded-xs transition-colors ${count >= 2 ? "h-2.5 bg-current" : "h-2.5 opacity-25 bg-current"}`} />
      <span className={`w-0.5 rounded-xs transition-colors ${count >= 3 ? "h-3.5 bg-current" : "h-3.5 opacity-25 bg-current"}`} />
    </div>
  );
}

export function NetworkQualityBadge() {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const candidate = remoteParticipants[0];

  const [localQuality, setLocalQuality] = useState<ConnectionQuality>(
    localParticipant?.connectionQuality ?? ConnectionQuality.Unknown
  );
  const [candidateQuality, setCandidateQuality] = useState<ConnectionQuality>(
    candidate?.connectionQuality ?? ConnectionQuality.Unknown
  );

  // Subscribe to local participant connection quality changes
  useEffect(() => {
    if (!localParticipant) return;
    setLocalQuality(localParticipant.connectionQuality);

    const onQualityChanged = (quality: ConnectionQuality) => {
      setLocalQuality(quality);
    };

    localParticipant.on(ParticipantEvent.ConnectionQualityChanged, onQualityChanged);
    return () => {
      localParticipant.off(ParticipantEvent.ConnectionQualityChanged, onQualityChanged);
    };
  }, [localParticipant]);

  // Subscribe to candidate connection quality changes
  useEffect(() => {
    if (!candidate) {
      setCandidateQuality(ConnectionQuality.Unknown);
      return;
    }
    setCandidateQuality(candidate.connectionQuality);

    const onQualityChanged = (quality: ConnectionQuality) => {
      setCandidateQuality(quality);
    };

    candidate.on(ParticipantEvent.ConnectionQualityChanged, onQualityChanged);
    return () => {
      candidate.off(ParticipantEvent.ConnectionQualityChanged, onQualityChanged);
    };
  }, [candidate]);

  const hrMeta = getQualityMeta(localQuality);
  const candidateMeta = getQualityMeta(candidate ? candidateQuality : ConnectionQuality.Unknown);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 select-none">
      {/* HR Network Pill */}
      <div
        className={`flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border text-[10px] sm:text-xs font-semibold shadow-2xs transition-all backdrop-blur-md ${hrMeta.badgeColor}`}
        title={`Your Network Quality: ${hrMeta.label}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${hrMeta.dotColor}`} />
        <SignalBars count={hrMeta.bars} />
        <span className="text-[10px] sm:text-[11px]">
          <span className="hidden sm:inline font-bold">You (HR): </span>
          <span className="sm:hidden font-bold">You: </span>
          {hrMeta.label}
        </span>
      </div>

      {/* Candidate Network Pill */}
      <div
        className={`flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border text-[10px] sm:text-xs font-semibold shadow-2xs transition-all backdrop-blur-md ${
          candidate ? candidateMeta.badgeColor : "bg-slate-50/90 border-slate-200 text-slate-500"
        }`}
        title={
          candidate
            ? `Candidate Network Quality: ${candidateMeta.label}`
            : "Waiting for candidate to join"
        }
      >
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
            candidate ? candidateMeta.dotColor : "bg-slate-300"
          }`}
        />
        {candidate ? (
          <SignalBars count={candidateMeta.bars} />
        ) : (
          <Activity className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-slate-400" />
        )}
        <span className="text-[10px] sm:text-[11px]">
          <span className="hidden sm:inline font-bold">Candidate: </span>
          <span className="sm:hidden font-bold">Cand: </span>
          {candidate ? candidateMeta.label : "Waiting…"}
        </span>
      </div>
    </div>
  );
}
