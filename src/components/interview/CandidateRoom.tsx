"use client";

import { useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  useLocalParticipant,
  useDataChannel,
} from "@livekit/components-react";
import { LocalVideoTrack, Track, RoomEvent } from "livekit-client";
import {
  Loader2,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  PhoneOff,
  Clock,
  Maximize,
  ShieldAlert,
  Lock,
  CheckCircle2,
  Monitor,
  Camera,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { VideoGrid } from "./VideoGrid";
import { useChunkedTranscription } from "./useChunkedTranscription";
import { Brand } from "@/components/Brand";
import type { TokenResponse } from "./types";

function fmt(ms: number) {
  const neg = ms < 0;
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${neg ? "-" : ""}${h > 0 ? pad(h) + ":" : ""}${pad(m)}:${pad(s)}`;
}

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
  const [joining, setJoining] = useState(false);
  const startEpochRef = useRef<number>(0);

  // 3-Step Setup Checklist State (Order: 1. Screen Share -> 2. Camera & Mic -> 3. Full Screen)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [mediaGranted, setMediaGranted] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  // Camera preview ref in lobby
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Check fullscreen state in lobby
  useEffect(() => {
    function handleFsChange() {
      setFullscreenActive(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Step 1: Capture Screen Share in the lobby BEFORE joining
  async function handleRequestScreenShare() {
    setStepError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as any,
        audio: false,
      });

      if (stream.getVideoTracks().length > 0) {
        setScreenStream(stream);
        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
        };
      }
    } catch (err: any) {
      console.warn("Screen share error:", err);
      setStepError(
        err.name === "NotAllowedError"
          ? "Screen share permission was declined. Please share your entire screen."
          : "Could not start screen share. Please choose your entire screen."
      );
    }
  }

  // Step 2: Request Camera & Microphone in the lobby
  async function handleRequestMedia() {
    setStepError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      cameraStreamRef.current = stream;
      setMediaGranted(true);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Media permission error:", err);
      setStepError(
        "Camera or Microphone permission was denied. Please allow access in your browser."
      );
    }
  }

  // Step 3: Request Full Screen
  async function handleRequestFullscreen() {
    setStepError(null);
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setFullscreenActive(true);
      }
    } catch (err) {
      console.warn("Fullscreen request error:", err);
      setStepError("Please allow full screen mode to continue.");
    }
  }

  // Final Action: Join the Meeting (Screen is already captured, so no secondary prompt!)
  async function handleJoinRoom() {
    if (!screenStream || !mediaGranted || !fullscreenActive) {
      setStepError("Please complete all 3 security requirements before joining.");
      return;
    }

    setJoining(true);
    setStepError(null);

    // Stop local preview camera tracks so LiveKit can take over smoothly
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
    }

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
    } finally {
      setJoining(false);
    }
  }

  if (error)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 px-6 text-center text-red-600">
        {error}
      </div>
    );

  const screenShared = Boolean(screenStream && screenStream.getVideoTracks().length > 0 && screenStream.getVideoTracks()[0].readyState === "live");
  const allCompleted = screenShared && mediaGranted && fullscreenActive;

  // Pre-join Lobby with 3-Step Setup Checklist
  if (!joined || !conn)
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 select-none">
        <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <Brand size="lg" />
            <h1 className="mt-4 text-2xl font-bold text-slate-900">{jobTitle}</h1>
            <p className="mt-1.5 text-xs md:text-sm text-slate-600">
              Welcome to your interview. Complete the **3-step setup** below to join.
            </p>
          </div>

          {/* Error Banner if any */}
          {stepError && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{stepError}</span>
            </div>
          )}

          {/* Setup Steps Checklist in exact order: 1. Screen Share -> 2. Camera & Mic -> 3. Full Screen */}
          <div className="mt-6 flex flex-col gap-3">
            {/* Step 1: Screen Share */}
            <div
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                screenShared
                  ? "bg-emerald-50/80 border-emerald-300"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                    screenShared
                      ? "bg-emerald-600 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {screenShared ? <CheckCircle2 className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>1. Share Entire Screen</span>
                    {screenShared && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        Screen Captured
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Share your desktop screen before entering.
                  </p>
                </div>
              </div>

              {!screenShared ? (
                <button
                  type="button"
                  onClick={handleRequestScreenShare}
                  className="btn-primary py-2 px-3.5 text-xs font-semibold shrink-0"
                >
                  Share Screen
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Ready
                </span>
              )}
            </div>

            {/* Step 2: Camera & Microphone */}
            <div
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                mediaGranted
                  ? "bg-emerald-50/80 border-emerald-300"
                  : !screenShared
                  ? "bg-slate-50/60 border-slate-200 opacity-60"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                    mediaGranted
                      ? "bg-emerald-600 text-white"
                      : "bg-indigo-600 text-white"
                  }`}
                >
                  {mediaGranted ? <CheckCircle2 className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>2. Turn On Camera & Mic</span>
                    {mediaGranted && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        Active
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enable webcam and microphone for video calling.
                  </p>
                </div>
              </div>

              {!mediaGranted ? (
                <button
                  type="button"
                  onClick={handleRequestMedia}
                  disabled={!screenShared}
                  className="btn-secondary py-2 px-3.5 text-xs font-semibold shrink-0 disabled:opacity-50"
                >
                  Enable Devices
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Ready
                </span>
              )}
            </div>

            {/* Camera Preview Box when media is granted */}
            {mediaGranted && (
              <div className="relative w-full h-36 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] text-white font-medium">
                  <Camera className="h-3 w-3 text-emerald-400" />
                  <span>Webcam Preview Active</span>
                </div>
              </div>
            )}

            {/* Step 3: Full Screen Mode */}
            <div
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                fullscreenActive
                  ? "bg-emerald-50/80 border-emerald-300"
                  : !mediaGranted
                  ? "bg-slate-50/60 border-slate-200 opacity-60"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                    fullscreenActive
                      ? "bg-emerald-600 text-white"
                      : "bg-purple-600 text-white"
                  }`}
                >
                  {fullscreenActive ? <CheckCircle2 className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>3. Enter Full Screen</span>
                    {fullscreenActive && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        Full Screen
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Full screen prevents unauthorized app switching.
                  </p>
                </div>
              </div>

              {!fullscreenActive ? (
                <button
                  type="button"
                  onClick={handleRequestFullscreen}
                  disabled={!mediaGranted}
                  className="btn-secondary py-2 px-3.5 text-xs font-semibold shrink-0 disabled:opacity-50"
                >
                  Enter Fullscreen
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Ready
                </span>
              )}
            </div>
          </div>

          {/* Final Join Interview Button */}
          <button
            type="button"
            onClick={handleJoinRoom}
            disabled={!allCompleted || joining}
            className={`mt-6 w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all ${
              allCompleted
                ? "bg-brand-600 hover:bg-brand-700 text-white hover:scale-[1.01] active:scale-[0.99] shadow-brand-600/30 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {joining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Connecting to Interview Room…</span>
              </>
            ) : allCompleted ? (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Join Interview Room</span>
              </>
            ) : (
              <span>Complete the 3 steps above to join</span>
            )}
          </button>
        </div>
      </div>
    );

  return (
    <LiveKitRoom
      serverUrl={conn.url}
      token={conn.token}
      connect
      audio
      video
      className="h-screen w-full flex flex-col bg-slate-50 overflow-hidden select-none"
    >
      <RoomAudioRenderer />
      <CandidateInner
        sessionId={sessionId}
        candidateToken={candidateToken}
        jobTitle={jobTitle}
        startEpoch={startEpochRef.current}
        screenStream={screenStream}
      />
    </LiveKitRoom>
  );
}

function CandidateInner({
  sessionId,
  candidateToken,
  jobTitle,
  startEpoch,
  screenStream,
}: {
  sessionId: string;
  candidateToken: string;
  jobTitle: string;
  startEpoch: number;
  screenStream: MediaStream | null;
}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const { send: sendProctoring } = useDataChannel("proctoring");
  const [disconnected, setDisconnected] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [screenLoading, setScreenLoading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Full Screen & Screen Share Live Proctoring Monitoring
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [isScreenShared, setIsScreenShared] = useState(true);
  const sessionReadyRef = useRef(false);
  const screenTrackPublishedRef = useRef(false);

  // Allow a 5-second startup grace period before displaying blockers inside the room
  useEffect(() => {
    const t = setTimeout(() => {
      sessionReadyRef.current = true;
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  // Publish the ALREADY-CAPTURED screen stream from the lobby directly into LiveKit!
  useEffect(() => {
    if (!localParticipant) return;
    localParticipant.setCameraEnabled(true).catch(() => {});
    localParticipant.setMicrophoneEnabled(true).catch(() => {});

    if (screenStream && !screenTrackPublishedRef.current) {
      const track = screenStream.getVideoTracks()[0];
      if (track && track.readyState === "live") {
        screenTrackPublishedRef.current = true;
        const localTrack = new LocalVideoTrack(track);
        localParticipant
          .publishTrack(localTrack, {
            source: Track.Source.ScreenShare,
            name: "screen_share",
          })
          .catch((err) => {
            console.warn("Error publishing pre-captured screen track:", err);
          });
      }
    }
  }, [localParticipant, screenStream]);

  // Monitor Full Screen state continuously and broadcast to HR immediately
  useEffect(() => {
    function handleFullscreenChange() {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);

      // Publish real-time proctoring message to HR via LiveKit data channel
      try {
        const encoder = new TextEncoder();
        const payload = encoder.encode(
          JSON.stringify({
            type: active ? "FULLSCREEN_ENTER" : "FULLSCREEN_EXIT",
            candidateName: localParticipant?.name || "Candidate",
            timestamp: Date.now(),
          })
        );
        sendProctoring(payload, { reliable: true });
      } catch (err) {
        console.warn("Failed to publish proctoring data:", err);
      }

      // Automatically log infraction timestamp flag to HR session notes
      if (!active) {
        const elapsedMs = Math.max(0, Date.now() - startEpoch);
        fetch(`/api/sessions/${sessionId}/flags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timestampMs: Math.floor(elapsedMs),
            label: "Candidate exited full screen mode",
            candidateToken,
          }),
        }).catch(() => {});
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, [localParticipant, sendProctoring, sessionId, startEpoch, candidateToken]);

  // Monitor Screen Share state (only trigger alert after grace period)
  useEffect(() => {
    if (!localParticipant) return;
    const isSharing = localParticipant.isScreenShareEnabled;
    setIsScreenShared(isSharing);

    if (!isSharing && sessionReadyRef.current) {
      try {
        const encoder = new TextEncoder();
        const payload = encoder.encode(
          JSON.stringify({
            type: "SCREENSHARE_STOPPED",
            candidateName: localParticipant?.name || "Candidate",
            timestamp: Date.now(),
          })
        );
        sendProctoring(payload, { reliable: true });
      } catch {
        /* ignore */
      }
    }
  }, [localParticipant?.isScreenShareEnabled, localParticipant, sendProctoring]);

  async function reenterFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.error("Reenter fullscreen error:", err);
    }
  }

  async function reenableScreenShare() {
    if (!localParticipant) return;
    try {
      await localParticipant.setScreenShareEnabled(true);
      setIsScreenShared(true);
      const encoder = new TextEncoder();
      const payload = encoder.encode(
        JSON.stringify({
          type: "SCREENSHARE_RESTORED",
          candidateName: localParticipant.name || "Candidate",
          timestamp: Date.now(),
        })
      );
      sendProctoring(payload, { reliable: true });
    } catch (err) {
      console.error("Reenable screenshare error:", err);
    }
  }

  useEffect(() => {
    if (!room) return;
    const onDisconnect = () => {
      setDisconnected(true);
    };
    room.on(RoomEvent.Disconnected, onDisconnect);
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnect);
    };
  }, [room]);

  // Candidate records own mic for transcription
  useChunkedTranscription({
    sessionId,
    startEpoch,
    candidateToken,
    enabled: !disconnected,
  });

  const [blink, setBlink] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setBlink((b) => !b);
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = now - startEpoch;

  if (disconnected) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center text-slate-800">
        <h1 className="text-2xl font-bold text-slate-900">This interview has ended</h1>
        <p className="mt-2 text-slate-600">
          Thank you for your time. You may close this window.
        </p>
      </div>
    );
  }

  const micOn = localParticipant?.isMicrophoneEnabled ?? false;
  const camOn = localParticipant?.isCameraEnabled ?? false;
  const screenOn = localParticipant?.isScreenShareEnabled ?? false;

  const toggleScreenShare = async () => {
    if (screenLoading || !localParticipant) return;
    setScreenLoading(true);
    try {
      await localParticipant.setScreenShareEnabled(!screenOn);
    } catch (err) {
      console.error("Screen share error:", err);
    } finally {
      setScreenLoading(false);
    }
  };

  const handleLeave = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    room?.disconnect();
    setDisconnected(true);
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50 overflow-hidden relative select-none">
      {/* ================= 1. PROCTORING WARNING OVERLAYS ================= */}
      {/* A. Full Screen Exited Blocker */}
      {!isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md px-6 text-center text-white animate-in fade-in duration-200">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10 mb-5">
            <ShieldAlert className="h-8 w-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white">Full Screen Mode Required</h2>
          <p className="mt-2.5 max-w-md text-sm text-slate-300 leading-relaxed">
            You have exited full screen. To maintain interview integrity and continue your session, please return to full screen mode.
          </p>
          <button
            type="button"
            onClick={reenterFullscreen}
            className="mt-6 flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Maximize className="h-4 w-4" />
            <span>Re-enter Full Screen</span>
          </button>
        </div>
      )}

      {/* B. Screen Share Stopped Blocker (only active after startup grace period) */}
      {isFullscreen && !isScreenShared && sessionReadyRef.current && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md px-6 text-center text-white animate-in fade-in duration-200">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/10 mb-5">
            <Monitor className="h-8 w-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white">Screen Sharing Required</h2>
          <p className="mt-2.5 max-w-md text-sm text-slate-300 leading-relaxed">
            Screen sharing was paused or stopped. You must keep your entire screen shared during the interview.
          </p>
          <button
            type="button"
            onClick={reenableScreenShare}
            className="mt-6 flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Monitor className="h-4 w-4" />
            <span>Share Entire Screen Now</span>
          </button>
        </div>
      )}

      {/* ================= 2. MAIN GOOGLE MEET VIDEO STAGE ================= */}
      <div className="flex-1 min-h-0 flex flex-col relative p-3 overflow-hidden">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col relative rounded-2xl overflow-hidden shadow-xs border border-slate-200/90 bg-white">
          <VideoGrid />
        </div>
      </div>

      {/* ================= 3. THE ICONIC GOOGLE MEET BOTTOM CONTROL BAR ================= */}
      <footer className="h-16 sm:h-20 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-xs gap-1 sm:gap-3">
        {/* Left Side: Meeting details & Live Timer */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <span className="hidden lg:inline-block text-xs font-bold text-slate-800 max-w-[160px] truncate bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
            {jobTitle}
          </span>

          <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 sm:px-2.5 rounded-md shadow-2xs">
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-500" />
            <span className="font-mono text-[11px] sm:text-xs font-bold tabular-nums text-slate-700">
              {fmt(elapsed)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-slate-700">
            <span
              className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-red-500 transition-opacity ${
                blink ? "opacity-100" : "opacity-30"
              }`}
            />
            <span className="hidden sm:inline">Recording active</span>
          </div>
        </div>

        {/* Center: Google Meet Iconic Round Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Microphone */}
          <button
            onClick={() => localParticipant?.setMicrophoneEnabled(!micOn)}
            className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-all duration-200 shadow-sm ${
              micOn
                ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/80"
                : "bg-red-500 hover:bg-red-600 text-white ring-2 ring-red-300/60"
            }`}
            title={micOn ? "Turn off microphone" : "Turn on microphone"}
          >
            {micOn ? <Mic className="h-4.5 w-4.5 sm:h-5 sm:w-5" /> : <MicOff className="h-4.5 w-4.5 sm:h-5 sm:w-5" />}
          </button>

          {/* Camera */}
          <button
            onClick={() => localParticipant?.setCameraEnabled(!camOn)}
            className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-all duration-200 shadow-sm ${
              camOn
                ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/80"
                : "bg-red-500 hover:bg-red-600 text-white ring-2 ring-red-300/60"
            }`}
            title={camOn ? "Turn off camera" : "Turn on camera"}
          >
            {camOn ? <VideoIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5" /> : <VideoOff className="h-4.5 w-4.5 sm:h-5 sm:w-5" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            disabled={screenLoading}
            className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-all duration-200 shadow-sm ${
              screenOn
                ? "bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-400"
                : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/80"
            }`}
            title={screenOn ? "Stop presenting screen" : "Present now (Screen Share)"}
          >
            {screenOn ? <ScreenShareOff className="h-4.5 w-4.5 sm:h-5 sm:w-5" /> : <ScreenShare className="h-4.5 w-4.5 sm:h-5 sm:w-5" />}
          </button>

          {/* Leave Call */}
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="flex items-center gap-1.5 h-10 px-3 sm:h-12 sm:px-5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all shadow-md active:scale-95 ml-1 sm:ml-2"
            title="Leave Meeting"
          >
            <PhoneOff className="h-4 w-4" />
            <span className="hidden sm:inline">Leave call</span>
          </button>
        </div>

        {/* Right Side: Proctoring Status Badge */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 sm:gap-1.5 bg-emerald-50 border border-emerald-200 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-emerald-700 shadow-2xs">
            <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Full Screen & Screen Shared</span>
            <span className="sm:hidden">Proctored</span>
          </div>
        </div>
      </footer>

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowLeaveConfirm(false);
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <PhoneOff className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Leave the interview?
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Are you sure you want to leave this interview call?
                </p>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="btn-ghost text-xs font-semibold"
                  >
                    Stay in meeting
                  </button>
                  <button
                    onClick={handleLeave}
                    className="btn bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2"
                  >
                    Yes, Leave Call
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
