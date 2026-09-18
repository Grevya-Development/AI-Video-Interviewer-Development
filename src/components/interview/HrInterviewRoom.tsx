"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveKitRoom, useTracks, useLocalParticipant, useRoomContext, useDataChannel, RoomAudioRenderer } from "@livekit/components-react";
import { Track, RoomEvent } from "livekit-client";
import {
  Loader2,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  PhoneOff,
  Flag,
  Clock,
  Copy,
  Check,
  HelpCircle,
  FileText,
  X,
  Sparkles,
  MessageSquare,
  Square,
  Subtitles,
  ShieldAlert,
} from "lucide-react";
import { VideoGrid } from "./VideoGrid";
import { QuestionSidebar } from "./QuestionSidebar";
import { TranscriptFeed } from "./TranscriptFeed";
import { useChunkedTranscription } from "./useChunkedTranscription";
import { useSilenceDetector } from "./useSilenceDetector";
import { NetworkQualityBadge } from "./NetworkQualityBadge";
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

function fmt(ms: number) {
  const neg = ms < 0;
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${neg ? "-" : ""}${h > 0 ? pad(h) + ":" : ""}${pad(m)}:${pad(s)}`;
}

export function HrInterviewRoom(props: Props) {
  const [conn, setConn] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
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
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-brand-600" /> Connecting to Google Meet room…
      </div>
    );

  return (
    <LiveKitRoom
      serverUrl={conn.url}
      token={conn.token}
      connect
      audio
      video
      className="h-[calc(100vh-57px)] w-full flex flex-col overflow-hidden bg-slate-50 select-none"
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
  const router = useRouter();
  const { localParticipant } = useLocalParticipant();

  const room = useRoomContext();

  // Active side panel: null | "questions" | "transcript"
  const [activeSidePanel, setActiveSidePanel] = useState<"questions" | "transcript" | null>("questions");
  const [followup, setFollowup] = useState<string | null>(null);
  const [followupLoading, setFollowupLoading] = useState(false);

  // Proctoring Alert State (Fullscreen & Screenshare monitoring)
  const [proctoringAlert, setProctoringAlert] = useState<{
    candidateName: string;
    type: "FULLSCREEN" | "SCREENSHARE";
    timestamp: number;
    active: boolean;
  } | null>(null);

  // 1. Real-time LiveKit Data Channel Listener for instant proctoring alerts
  useDataChannel("proctoring", (msg) => {
    try {
      const decoder = new TextDecoder();
      const str = decoder.decode(msg.payload);
      const data = JSON.parse(str);
      const name = data.candidateName || "Candidate";

      if (data.type === "FULLSCREEN_EXIT") {
        setProctoringAlert({
          candidateName: name,
          type: "FULLSCREEN",
          timestamp: data.timestamp || Date.now(),
          active: true,
        });
      } else if (data.type === "FULLSCREEN_ENTER") {
        setProctoringAlert((prev) =>
          prev?.type === "FULLSCREEN" ? { ...prev, active: false } : prev
        );
        setTimeout(() => setProctoringAlert(null), 5000);
      } else if (data.type === "SCREENSHARE_STOPPED") {
        setProctoringAlert({
          candidateName: name,
          type: "SCREENSHARE",
          timestamp: data.timestamp || Date.now(),
          active: true,
        });
      } else if (data.type === "SCREENSHARE_RESTORED") {
        setProctoringAlert((prev) =>
          prev?.type === "SCREENSHARE" ? { ...prev, active: false } : prev
        );
        setTimeout(() => setProctoringAlert(null), 5000);
      }
    } catch (err) {
      console.error("Error handling proctoring event:", err);
    }
  });

  // 2. Periodic flag polling as fail-safe redundancy (only trigger for NEW flags after room loaded)
  const initialFlagCountLoaded = useRef(false);
  const lastFlagCountRef = useRef(0);
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/flags`);
        if (!res.ok) return;
        const data = await res.json();
        const flags: Array<{ label?: string; timestampMs: number }> = data.flags || [];

        // On first run, record current baseline count so past flags from previous sessions do not trigger false alerts
        if (!initialFlagCountLoaded.current) {
          lastFlagCountRef.current = flags.length;
          initialFlagCountLoaded.current = true;
          return;
        }

        if (flags.length > lastFlagCountRef.current) {
          const newFlags = flags.slice(lastFlagCountRef.current);
          const fsFlag = newFlags.find((f) => f.label?.includes("exited full screen"));
          if (fsFlag) {
            setProctoringAlert({
              candidateName: "Candidate",
              type: "FULLSCREEN",
              timestamp: Date.now(),
              active: true,
            });
          }
          lastFlagCountRef.current = flags.length;
        }
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Live timer & modals
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagNote, setFlagNote] = useState("");
  const [showCaptions, setShowCaptions] = useState(true);

  // Screen share loading
  const [screenLoading, setScreenLoading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = now - startEpoch;
  const display = durationMinutes
    ? fmt(durationMinutes * 60_000 - elapsed)
    : fmt(elapsed);
  const overtime = durationMinutes ? elapsed > durationMinutes * 60_000 : false;

  // Candidate link
  const [candidateLink, setCandidateLink] = useState(`/join/${candidateToken}`);
  useEffect(() => {
    setCandidateLink(`${window.location.origin}/join/${candidateToken}`);
  }, [candidateToken]);

  async function copyLink() {
    await navigator.clipboard.writeText(candidateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveFlag() {
    if (flagging) return;
    setFlagging(true);
    const label = flagNote.trim() || null;
    try {
      await fetch(`/api/sessions/${sessionId}/flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestampMs: Math.max(0, elapsed), label }),
      });
    } catch {
      /* ignore */
    } finally {
      setFlagging(false);
      setShowFlagModal(false);
      setFlagNote("");
    }
  }

  async function endAndEvaluate() {
    setEnding(true);
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ENDED" }),
      });
    } catch {
      /* ignore */
    }
    router.push(`/interview/${sessionId}/evaluate`);
  }

  // HR records its own mic for transcription
  useChunkedTranscription({ sessionId, startEpoch, enabled: true });

  // Silence detection on candidate
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

  // Media state
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

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-slate-50 overflow-hidden relative select-none">
      {/* ================= 1. MAIN GOOGLE MEET CANVAS & SIDE PANEL ================= */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative p-3 gap-3">
        {/* Left/Center: Video Canvas (Fills 100% when side panel is closed) */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col relative rounded-2xl overflow-hidden shadow-xs border border-slate-200/90 bg-white">
          {/* Network Health Status Indicator (HR Only) */}
          <div className="absolute top-3.5 left-3.5 z-30 pointer-events-auto">
            <NetworkQualityBadge />
          </div>

          <VideoGrid />

          {/* Proctoring Alert Popup for HR when candidate exits fullscreen or stops screenshare */}
          {proctoringAlert && (
            <div className="absolute top-4 right-4 z-40 max-w-sm w-full animate-in slide-in-from-top-3 fade-in duration-200">
              <div
                className={`p-4 rounded-2xl shadow-xl border backdrop-blur-md flex items-start gap-3 transition-all ${
                  proctoringAlert.active
                    ? "bg-amber-500/95 text-white border-amber-400/80 shadow-amber-500/20"
                    : "bg-emerald-600/95 text-white border-emerald-500/80 shadow-emerald-500/20"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    proctoringAlert.active
                      ? "bg-white/20 text-white animate-bounce"
                      : "bg-white/20 text-white"
                  }`}
                >
                  {proctoringAlert.active ? (
                    <ShieldAlert className="h-5 w-5" />
                  ) : (
                    <Check className="h-5 w-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      {proctoringAlert.active
                        ? proctoringAlert.type === "FULLSCREEN"
                          ? "Full Screen Exited"
                          : "Screen Share Stopped"
                        : proctoringAlert.type === "FULLSCREEN"
                        ? "Full Screen Restored"
                        : "Screen Share Restored"}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setProctoringAlert(null)}
                      className="text-white/80 hover:text-white p-0.5 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs leading-snug font-medium text-white/95">
                    {proctoringAlert.active ? (
                      proctoringAlert.type === "FULLSCREEN" ? (
                        <>
                          <span className="font-bold">{proctoringAlert.candidateName}</span>{" "}
                          exited full screen mode or switched windows. The candidate&apos;s view is currently paused.
                        </>
                      ) : (
                        <>
                          <span className="font-bold">{proctoringAlert.candidateName}</span>{" "}
                          stopped sharing their desktop screen.
                        </>
                      )
                    ) : (
                      <>
                        <span className="font-bold">{proctoringAlert.candidateName}</span>{" "}
                        has restored{" "}
                        {proctoringAlert.type === "FULLSCREEN" ? "full screen mode" : "screen sharing"}.
                      </>
                    )}
                  </p>
                  {proctoringAlert.active && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-white/90 font-semibold">
                      <Flag className="h-3 w-3" />
                      <span>Timestamp automatically recorded for evaluation</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Floating Google Meet Captions (CC) Overlay if enabled */}
          {showCaptions && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-xl px-4 pointer-events-none">
              <TranscriptFeed
                sessionId={sessionId}
                initial={initialTranscript}
                jobTitle={jobTitle}
              />
            </div>
          )}
        </div>

        {/* Right: Google Meet Slide-in Side Drawer (Questions & AI Follow-ups / Live Transcript) */}
        {activeSidePanel && (
          <>
            {/* Mobile Backdrop Overlay */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
              onClick={() => setActiveSidePanel(null)}
            />

            <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 md:static md:w-80 lg:w-96 md:shrink-0 h-full bg-white md:rounded-2xl border-l md:border border-slate-200/90 shadow-xl md:shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
              {/* Drawer Header Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-3 py-2.5 sm:py-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveSidePanel("questions")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      activeSidePanel === "questions"
                        ? "bg-white text-brand-700 shadow-xs border border-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <HelpCircle className="h-3.5 w-3.5 text-brand-600" />
                    <span>Questions ({questions.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSidePanel("transcript")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      activeSidePanel === "transcript"
                        ? "bg-white text-brand-700 shadow-xs border border-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 text-brand-600" />
                    <span>Transcript</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSidePanel(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                  title="Close side panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-hidden min-h-0">
                {activeSidePanel === "questions" ? (
                  <QuestionSidebar
                    initial={questions}
                    followup={followup}
                    followupLoading={followupLoading}
                    onDismissFollowup={() => setFollowup(null)}
                  />
                ) : (
                  <div className="p-3 h-full overflow-hidden flex flex-col">
                    <TranscriptFeed
                      sessionId={sessionId}
                      initial={initialTranscript}
                      jobTitle={jobTitle}
                    />
                  </div>
                )}
              </div>
            </aside>
          </>
        )}
      </div>

      {/* ================= 2. THE ICONIC GOOGLE MEET BOTTOM CONTROL BAR ================= */}
      <footer className="h-16 sm:h-20 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-xs gap-1 sm:gap-3">
        {/* Left Side: Meeting details & Live Timer */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <span className="hidden lg:inline-block text-xs font-bold text-slate-800 max-w-[160px] truncate bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
            {jobTitle}
          </span>

          <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 sm:px-2.5 rounded-md shadow-2xs">
            <Clock className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${overtime ? "text-red-500" : "text-slate-500"}`} />
            <span
              className={`font-mono text-[11px] sm:text-xs font-bold tabular-nums ${
                overtime ? "text-red-600" : "text-slate-700"
              }`}
            >
              {display}
            </span>
          </div>

          <button
            onClick={copyLink}
            className="hidden sm:flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-brand-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md transition-colors"
            title="Copy candidate invite link"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copied ? "Copied!" : "Invite link"}</span>
          </button>
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

          {/* Captions CC Toggle */}
          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-all duration-200 shadow-sm ${
              showCaptions
                ? "bg-blue-50 text-blue-600 border border-blue-300 ring-2 ring-blue-500/20"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80"
            }`}
            title={showCaptions ? "Turn off live captions" : "Turn on live captions"}
          >
            <Subtitles className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
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

          {/* Flag Moment */}
          <button
            onClick={() => setShowFlagModal(true)}
            className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-slate-100 hover:bg-amber-50 hover:text-amber-600 text-slate-700 border border-slate-300/80 shadow-sm transition-all duration-200"
            title="Flag important moment for evaluation"
          >
            <Flag className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-amber-500" />
          </button>

          {/* End Call / Leave */}
          <button
            onClick={() => setShowConfirmModal(true)}
            className="flex items-center gap-1.5 h-10 px-3 sm:h-12 sm:px-5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all shadow-md active:scale-95 ml-1 sm:ml-2"
            title="End Interview & Evaluate"
          >
            <PhoneOff className="h-4 w-4" />
            <span className="hidden sm:inline">End & evaluate</span>
          </button>
        </div>

        {/* Right Side: Google Meet Drawer Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Questions & AI followups */}
          <button
            type="button"
            onClick={() =>
              setActiveSidePanel(activeSidePanel === "questions" ? null : "questions")
            }
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
              activeSidePanel === "questions"
                ? "bg-brand-50 text-brand-700 border border-brand-300 ring-2 ring-brand-500/20 shadow-sm"
                : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200"
            }`}
            title="Open interview questions & AI follow-up suggestions"
          >
            <HelpCircle className="h-4 w-4 text-brand-600" />
            <span className="hidden lg:inline">Questions</span>
            <span className="rounded-full bg-brand-600 text-white px-1.5 py-0.2 text-[10px] font-bold">
              {questions.length}
            </span>
          </button>

          {/* Full Live Transcript */}
          <button
            type="button"
            onClick={() =>
              setActiveSidePanel(activeSidePanel === "transcript" ? null : "transcript")
            }
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
              activeSidePanel === "transcript"
                ? "bg-brand-50 text-brand-700 border border-brand-300 ring-2 ring-brand-500/20 shadow-sm"
                : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200"
            }`}
            title="Open live interview transcript drawer"
          >
            <FileText className="h-4 w-4 text-slate-600" />
            <span className="hidden lg:inline">Transcript</span>
          </button>
        </div>
      </footer>

      {/* Flag Modal */}
      {showFlagModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !flagging) {
              setShowFlagModal(false);
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Flag className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Flag Moment at {fmt(elapsed)}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Bookmark this timestamp to review during candidate scoring.
                </p>
                <input
                  type="text"
                  placeholder="Optional note (e.g., 'Strong answer on caching', 'Hedging on testing')"
                  value={flagNote}
                  onChange={(e) => setFlagNote(e.target.value)}
                  className="input mt-3 text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveFlag();
                  }}
                />
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowFlagModal(false)}
                    className="btn-ghost text-xs"
                    disabled={flagging}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveFlag}
                    className="btn-primary text-xs"
                    disabled={flagging}
                  >
                    {flagging ? "Saving…" : "Save Flag"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !ending) {
              setShowConfirmModal(false);
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
                  End Interview & Evaluate?
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Are you sure you want to end this interview session?
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  The call will end, and you will proceed to the evaluation page to review transcripts, notes, and AI analysis.
                </p>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="btn-ghost text-xs font-semibold"
                    disabled={ending}
                  >
                    Stay in meeting
                  </button>
                  <button
                    onClick={endAndEvaluate}
                    className="btn bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2"
                    disabled={ending}
                  >
                    {ending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Evaluating…
                      </>
                    ) : (
                      "Yes, End & Evaluate"
                    )}
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
