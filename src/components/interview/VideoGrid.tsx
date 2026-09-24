"use client";

import { useState } from "react";
import {
  useTracks,
  VideoTrack,
  useParticipants,
} from "@livekit/components-react";
import { Track, Participant } from "livekit-client";
import {
  Mic,
  MicOff,
  User,
  Monitor,
  Pin,
  PinOff,
  LayoutGrid,
} from "lucide-react";
import type { TrackReference } from "@livekit/components-core";

function roleOf(metadata?: string): "HR" | "CANDIDATE" | "UNKNOWN" {
  try {
    const m = metadata ? JSON.parse(metadata) : null;
    return m?.role ?? "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

function getInitials(name?: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface ParticipantTileProps {
  participant: Participant;
  cameraTrack?: TrackReference;
  isPinned?: boolean;
  onPinToggle?: () => void;
  isThumbnail?: boolean;
  onClick?: () => void;
}

function ParticipantTile({
  participant,
  cameraTrack,
  isPinned,
  onPinToggle,
  isThumbnail,
  onClick,
}: ParticipantTileProps) {
  const role = roleOf(participant.metadata);
  const isSpeaking = participant.isSpeaking;
  const name = participant.name || participant.identity;
  const initials = getInitials(name);

  // Active camera detection for both local and remote participants
  const isCamActive = Boolean(
    cameraTrack &&
    (!cameraTrack.publication || !cameraTrack.publication.isMuted)
  );

  return (
    <div
      onClick={onClick}
      className={`group relative w-full h-full min-h-0 min-w-0 flex items-center justify-center overflow-hidden rounded-2xl transition-all duration-300 select-none ${
        isThumbnail
          ? "aspect-video cursor-pointer hover:ring-2 hover:ring-brand-500 hover:scale-[1.02] shadow-sm"
          : "shadow-sm hover:shadow-md"
      } ${
        isSpeaking
          ? "ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/15"
          : "border border-slate-200/90"
      } bg-slate-900`}
    >
      {cameraTrack && isCamActive ? (
        <VideoTrack
          trackRef={cameraTrack}
          className="h-full w-full !object-cover rounded-2xl mirror-video -scale-x-100"
        />
      ) : (
        /* Camera Off: Google Meet Style Light Avatar Card */
        <div className="flex flex-col items-center justify-center h-full w-full bg-slate-100/95 text-slate-700 p-4">
          <div className="flex h-14 w-14 md:h-18 md:w-18 items-center justify-center rounded-full bg-gradient-to-tr from-brand-600 to-blue-500 text-white font-bold text-base md:text-xl shadow-md border-2 border-white ring-2 ring-slate-200/80">
            {initials}
          </div>
          <span className="mt-2 text-xs md:text-sm font-semibold text-slate-700 max-w-[150px] truncate text-center">
            {name}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">Camera off</span>
        </div>
      )}

      {/* Top-Right Quick Actions: Pin / Unpin Button */}
      {onPinToggle && (
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPinToggle();
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 shadow-md ${
              isPinned
                ? "bg-brand-600 text-white opacity-100 ring-2 ring-white"
                : "bg-white/85 text-slate-700 hover:bg-white hover:text-brand-600 opacity-0 group-hover:opacity-100"
            }`}
            title={isPinned ? "Unpin from main view" : "Pin to main view (Spotlight)"}
          >
            {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* Bottom-Left: Google Meet Minimal Badge (Non-obstructive) */}
      <div className={`absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-lg bg-black/60 text-white backdrop-blur-md px-2 py-0.5 pointer-events-none ${
        isThumbnail ? "text-[10px] scale-90 origin-bottom-left" : "text-[11px]"
      }`}>
        {!participant.isMicrophoneEnabled ? (
          <MicOff className="h-3 w-3 text-red-400" />
        ) : (
          <Mic className="h-3 w-3 text-emerald-400" />
        )}
        <span className="font-medium max-w-[90px] sm:max-w-[140px] truncate text-white">
          {name} {participant.isLocal ? "(you)" : ""}
        </span>
        <span
          className={`ml-0.5 rounded px-1 py-0.2 text-[9px] font-semibold ${
            role === "HR"
              ? "bg-blue-500/30 text-blue-200"
              : "bg-emerald-500/30 text-emerald-200"
          }`}
        >
          {role}
        </span>
      </div>
    </div>
  );
}

interface ScreenShareTileProps {
  screenTrack: TrackReference;
  isPinned?: boolean;
  onPinToggle?: () => void;
  isThumbnail?: boolean;
  onClick?: () => void;
}

function ScreenShareTile({
  screenTrack,
  isPinned,
  onPinToggle,
  isThumbnail,
  onClick,
}: ScreenShareTileProps) {
  const presenter = screenTrack.participant;
  const name = presenter.name || presenter.identity;

  return (
    <div
      onClick={onClick}
      className={`group relative w-full h-full min-h-0 min-w-0 flex items-center justify-center overflow-hidden rounded-2xl transition-all duration-300 select-none bg-slate-950 screenshare-track ${
        isThumbnail
          ? "aspect-video cursor-pointer hover:ring-2 hover:ring-blue-500 hover:scale-[1.02] shadow-sm"
          : "shadow-md"
      } border border-slate-800`}
    >
      <VideoTrack
        trackRef={screenTrack}
        className="h-full w-full !object-contain bg-slate-950"
      />

      {/* Pin / Unpin Button */}
      {onPinToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPinToggle();
          }}
          className={`absolute top-2.5 right-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 shadow-md ${
            isPinned
              ? "bg-blue-600 text-white opacity-100 ring-2 ring-white"
              : "bg-white/85 text-slate-700 hover:bg-white hover:text-blue-600 opacity-0 group-hover:opacity-100"
          }`}
          title={isPinned ? "Unpin screen share" : "Pin screen share to main view"}
        >
          {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </button>
      )}

      {/* Presenter Minimal Label */}
      <div className={`absolute bottom-2 left-2 z-10 flex items-center gap-1.5 rounded-lg bg-black/60 text-white backdrop-blur-md px-2 py-0.5 pointer-events-none ${
        isThumbnail ? "text-[10px] scale-90 origin-bottom-left" : "text-[11px]"
      }`}>
        <Monitor className="h-3 w-3 text-blue-400" />
        <span className="font-medium max-w-[120px] sm:max-w-[160px] truncate text-white">
          {name}&apos;s screen {presenter.isLocal ? "(you)" : ""}
        </span>
        <span className="ml-0.5 rounded bg-blue-500/40 text-blue-200 px-1 py-0.2 text-[9px] font-semibold uppercase">
          Sharing
        </span>
      </div>
    </div>
  );
}

interface GridItem {
  id: string;
  type: "screen" | "camera";
  participant: Participant;
  track?: TrackReference;
}

export function VideoGrid() {
  const cameraTracks = useTracks([Track.Source.Camera], {
    onlySubscribed: false,
  });
  const screenShareTracks = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: false,
  });
  const participants = useParticipants();

  // Selected pinned item ID (null = balanced equal tiled grid)
  const [pinnedItemId, setPinnedItemId] = useState<string | null>(null);

  const localParticipant = participants.find((p) => p.isLocal);
  const localRole = localParticipant ? roleOf(localParticipant.metadata) : "UNKNOWN";
  const waitingText =
    localRole === "CANDIDATE"
      ? "Waiting for interviewer to join…"
      : localRole === "HR"
      ? "Waiting for candidate to join…"
      : "Waiting for participant to join…";

  // Build unified items list: all active screen shares + all participant camera feeds
  const allItems: GridItem[] = [];

  // Add all active screen shares
  for (const sTrack of screenShareTracks) {
    allItems.push({
      id: `screen-${sTrack.participant.identity}`,
      type: "screen",
      participant: sTrack.participant,
      track: sTrack,
    });
  }

  // Add all participant camera streams
  for (const p of participants) {
    const camTrack = cameraTracks.find((t) => t.participant.identity === p.identity);
    allItems.push({
      id: `camera-${p.identity}`,
      type: "camera",
      participant: p,
      track: camTrack,
    });
  }

  // If a screen share is newly started and no manual pin was chosen, focus the screen share
  const effectivePinnedId =
    pinnedItemId && allItems.some((item) => item.id === pinnedItemId)
      ? pinnedItemId
      : screenShareTracks.length > 0
      ? `screen-${screenShareTracks[0].participant.identity}`
      : null;

  // Toggle pinning
  function togglePin(itemId: string) {
    if (effectivePinnedId === itemId) {
      setPinnedItemId(null); // Return to equal grid
    } else {
      setPinnedItemId(itemId); // Spotlight this item
    }
  }

  // Connecting state
  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-slate-500 bg-slate-50 h-full w-full rounded-2xl border border-slate-200">
        <User className="h-12 w-12 text-slate-400 animate-pulse" />
        <span className="mt-2 text-xs font-semibold text-slate-600">Connecting video…</span>
      </div>
    );
  }

  // Helper renderer for any item
  function renderItem(item: GridItem, isThumbnail = false) {
    if (item.type === "screen" && item.track) {
      return (
        <ScreenShareTile
          screenTrack={item.track}
          isPinned={effectivePinnedId === item.id}
          isThumbnail={isThumbnail}
          onClick={() => togglePin(item.id)}
          onPinToggle={() => togglePin(item.id)}
        />
      );
    }
    return (
      <ParticipantTile
        participant={item.participant}
        cameraTrack={item.track}
        isPinned={effectivePinnedId === item.id}
        isThumbnail={isThumbnail}
        onClick={() => togglePin(item.id)}
        onPinToggle={() => togglePin(item.id)}
      />
    );
  }

  // 1. SPOTLIGHT / PINNED VIEW (If screen share or user pinned an item)
  if (effectivePinnedId && allItems.length > 1) {
    const pinnedItem = allItems.find((item) => item.id === effectivePinnedId)!;
    const otherItems = allItems.filter((item) => item.id !== effectivePinnedId);

    return (
      <div className="relative h-full w-full flex flex-col md:flex-row gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-100/70 rounded-2xl overflow-hidden min-h-0 border border-slate-200">
        {/* Main Spotlight Stage (Expansive full view) */}
        <div className="relative flex-1 min-h-0 min-w-0 h-full flex items-center justify-center">
          {renderItem(pinnedItem, false)}

          {/* Unpin to Grid Button Overlay */}
          <button
            type="button"
            onClick={() => setPinnedItemId(null)}
            className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-20 flex items-center gap-1.5 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-700 shadow-md hover:bg-white hover:text-brand-600 transition-all cursor-pointer"
            title="Return to equal tiled grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Grid view</span>
          </button>
        </div>

        {/* Side/Bottom Filmstrip: Clickable aspect-video Thumbnails */}
        <div className="flex flex-row md:flex-col gap-2 md:gap-3 shrink-0 w-full md:w-56 lg:w-64 h-24 sm:h-28 md:h-full md:max-h-full overflow-x-auto md:overflow-y-auto p-1">
          {otherItems.map((item) => (
            <div key={item.id} className="w-36 sm:w-44 md:w-full shrink-0">
              {renderItem(item, true)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. SINGLE PARTICIPANT VIEW
  if (allItems.length === 1) {
    const single = allItems[0];

    return (
      <div className="relative h-full w-full p-2 sm:p-3 flex flex-col items-center justify-center min-h-0 bg-slate-100/70 rounded-2xl border border-slate-200">
        <div className="h-full w-full min-h-0 min-w-0 flex items-center justify-center">
          {renderItem(single, false)}
        </div>
        <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-10 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 px-3.5 py-1 sm:px-4 sm:py-1.5 text-xs font-semibold text-slate-700 shadow-md pointer-events-none text-center max-w-[90%] truncate">
          {waitingText}
        </div>
      </div>
    );
  }

  // 3. TILED EQUAL GRID VIEW (Default Balanced Multi-Tile Layout for all participants)
  const gridClasses =
    allItems.length === 2
      ? "grid-cols-1 grid-rows-2 md:grid-rows-1 md:grid-cols-2"
      : allItems.length <= 4
      ? "grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-2"
      : "grid-cols-2 sm:grid-cols-3";

  return (
    <div className="relative h-full w-full p-2 sm:p-3 bg-slate-100/70 rounded-2xl border border-slate-200 flex flex-col min-h-0">
      <div className={`grid h-full w-full gap-2 sm:gap-3 min-h-0 flex-1 ${gridClasses}`}>
        {allItems.map((item) => (
          <div key={item.id} className="h-full w-full min-h-0 min-w-0 flex items-center justify-center">
            {renderItem(item, false)}
          </div>
        ))}
      </div>
    </div>
  );
}
