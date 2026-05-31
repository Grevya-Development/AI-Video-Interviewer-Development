"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

export function MediaControls() {
  const { localParticipant } = useLocalParticipant();
  const micOn = localParticipant.isMicrophoneEnabled;
  const camOn = localParticipant.isCameraEnabled;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => localParticipant.setMicrophoneEnabled(!micOn)}
        className={`btn ${micOn ? "btn-secondary" : "bg-red-100 text-red-700"}`}
        aria-label="Toggle microphone"
      >
        {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </button>
      <button
        onClick={() => localParticipant.setCameraEnabled(!camOn)}
        className={`btn ${camOn ? "btn-secondary" : "bg-red-100 text-red-700"}`}
        aria-label="Toggle camera"
      >
        {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
      </button>
    </div>
  );
}

export { Track };
