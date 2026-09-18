"use client";

import { useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff } from "lucide-react";

export function MediaControls() {
  const { localParticipant } = useLocalParticipant();
  const [sharingLoading, setSharingLoading] = useState(false);
  const micOn = localParticipant.isMicrophoneEnabled;
  const camOn = localParticipant.isCameraEnabled;
  const screenOn = localParticipant.isScreenShareEnabled;

  const toggleScreenShare = async () => {
    if (sharingLoading) return;
    setSharingLoading(true);
    try {
      await localParticipant.setScreenShareEnabled(!screenOn);
    } catch (err) {
      console.error("Screen share error:", err);
    } finally {
      setSharingLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => localParticipant.setMicrophoneEnabled(!micOn)}
        className={`btn ${micOn ? "btn-secondary" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
        title={micOn ? "Mute microphone" : "Unmute microphone"}
        aria-label="Toggle microphone"
      >
        {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </button>

      <button
        onClick={() => localParticipant.setCameraEnabled(!camOn)}
        className={`btn ${camOn ? "btn-secondary" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
        title={camOn ? "Turn camera off" : "Turn camera on"}
        aria-label="Toggle camera"
      >
        {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
      </button>

      <button
        onClick={toggleScreenShare}
        disabled={sharingLoading}
        className={`btn ${
          screenOn
            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
            : "btn-secondary hover:bg-slate-100"
        }`}
        title={screenOn ? "Stop sharing screen" : "Share screen"}
        aria-label="Toggle screen share"
      >
        {screenOn ? (
          <ScreenShareOff className="h-4 w-4 text-white" />
        ) : (
          <ScreenShare className="h-4 w-4 text-slate-700" />
        )}
        <span className="text-xs font-semibold hidden sm:inline">
          {screenOn ? "Stop Share" : "Share Screen"}
        </span>
      </button>
    </div>
  );
}

export { Track };

