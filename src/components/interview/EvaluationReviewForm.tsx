"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  MinusCircle,
  XCircle,
  Sparkles,
  ArrowLeft,
  Loader2,
  Flag,
  ListChecks,
  MessageSquare,
  FileText,
  Save,
  Clock,
} from "lucide-react";

import { RUBRIC_DIMENSIONS } from "@/lib/rubric";

interface Question {
  id: string;
  text: string;
  order: number;
  status: "PENDING" | "ASKED" | "SKIPPED";
  note: string | null;
}

interface TranscriptSegment {
  id: string;
  speakerRole: "HR" | "CANDIDATE";
  speakerName: string;
  text: string;
  startMs: number;
  endMs: number;
}

interface FlagItem {
  id: string;
  timestampMs: number;
  label: string | null;
}

interface InitialEvaluation {
  decision: "HIRE" | "HOLD" | "REJECT";
  overallScore: number;
  hireRationale: string;
  strengths: string[];
  gaps: string[];
  candidateFeedback: string;
  dimensionScores?: any;
}

interface Props {
  sessionId: string;
  jobTitle: string;
  reportToken: string;
  questions: Question[];
  transcript: TranscriptSegment[];
  flags: FlagItem[];
  initialEvaluation: InitialEvaluation | null;
}

export function EvaluationReviewForm({
  sessionId,
  jobTitle,
  reportToken,
  questions,
  transcript,
  flags,
  initialEvaluation,
}: Props) {
  const router = useRouter();

  // HR Evaluation State
  const [decision, setDecision] = useState<"HIRE" | "HOLD" | "REJECT">(
    initialEvaluation?.decision || "HOLD"
  );
  const [overallScore, setOverallScore] = useState<number>(
    initialEvaluation?.overallScore ?? 0
  );
  const [hireRationale, setHireRationale] = useState<string>(
    initialEvaluation?.hireRationale || ""
  );
  const [candidateFeedback, setCandidateFeedback] = useState<string>(
    initialEvaluation?.candidateFeedback || ""
  );
  const [strengthsText, setStrengthsText] = useState<string>(
    initialEvaluation?.strengths?.join("\n") || ""
  );
  const [gapsText, setGapsText] = useState<string>(
    initialEvaluation?.gaps?.join("\n") || ""
  );

  // Individual Dimension Scores (Communication, Technical Fit, Culture Fit, Confidence, Clarity)
  const [dimensionScores, setDimensionScores] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    RUBRIC_DIMENSIONS.forEach((d) => {
      init[d.key] = initialEvaluation?.dimensionScores?.[d.key]?.score ?? 0;
    });
    return init;
  });

  function handleDimChange(key: string, val: number) {
    const next = { ...dimensionScores, [key]: val };
    setDimensionScores(next);
    const values = Object.values(next);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    setOverallScore(avg);
  }

  // AI & Action States
  const [aiRunning, setAiRunning] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Active View Tab on Left Panel
  const [evidenceTab, setEvidenceTab] = useState<"questions" | "flags" | "transcript">(
    "questions"
  );

  const askedCount = questions.filter((q) => q.status === "ASKED").length;

  async function handleRunAI() {
    setAiRunning(true);
    setAiNotice(null);
    setAiError(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/evaluate`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "AI evaluation failed");
      }

      if (data.evaluation) {
        const ev = data.evaluation;
        if (ev.decision) setDecision(ev.decision);
        if (typeof ev.overallScore === "number") setOverallScore(ev.overallScore);
        if (ev.hireRationale) setHireRationale(ev.hireRationale);
        if (ev.candidateFeedback) setCandidateFeedback(ev.candidateFeedback);
        if (Array.isArray(ev.strengths)) setStrengthsText(ev.strengths.join("\n"));
        if (Array.isArray(ev.gaps)) setGapsText(ev.gaps.join("\n"));
        if (ev.dimensionScores) {
          const nextDims: Record<string, number> = {};
          RUBRIC_DIMENSIONS.forEach((d) => {
            if (typeof ev.dimensionScores?.[d.key]?.score === "number") {
              nextDims[d.key] = ev.dimensionScores[d.key].score;
            }
          });
          setDimensionScores((prev) => ({ ...prev, ...nextDims }));
        }
        setAiNotice("AI analysis completed successfully!");
      }
    } catch (err: any) {
      setAiError(err.message || "Failed to generate AI evaluation");
    } finally {
      setAiRunning(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAiError(null);

    const strengths = strengthsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const gaps = gapsText
      .split("\n")
      .map((g) => g.trim())
      .filter(Boolean);

    const formattedDimensionScores: Record<string, { score: number; reasoning: string }> = {};
    Object.entries(dimensionScores).forEach(([key, score]) => {
      formattedDimensionScores[key] = {
        score,
        reasoning: initialEvaluation?.dimensionScores?.[key]?.reasoning || "",
      };
    });

    try {
      const res = await fetch(`/api/sessions/${sessionId}/evaluate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          overallScore,
          hireRationale,
          candidateFeedback,
          strengths,
          gaps,
          dimensionScores: formattedDimensionScores,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save evaluation");
      }

      const data = await res.json();
      router.push(data.reportUrl || `/r/${reportToken}`);
    } catch (err: any) {
      setAiError(err.message || "Failed to save evaluation");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Top Header */}
      <div className="border-b border-slate-200 bg-white sticky top-[72px] z-30 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{jobTitle}</h1>
              <p className="text-xs text-slate-500">
                End-of-Interview Review & Scoring
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRunAI}
              disabled={aiRunning || saving}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/70 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50 transition-colors"
            >
              {aiRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 text-brand-600" />
              )}
              {aiRunning ? "Analyzing..." : "Run AI Analysis"}
            </button>

            <button
              onClick={handleSave}
              disabled={saving || aiRunning}
              className="btn-primary px-5 py-2 text-sm font-semibold shadow-sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save & View Report"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-6">
        {/* Notice Banners */}
        {aiNotice && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 animate-in fade-in">
            <p className="font-semibold">{aiNotice}</p>
          </div>
        )}

        {aiError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 animate-in fade-in">
            <p className="font-semibold">{aiError}</p>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Interview Evidence & Transcripts (col-span-7) */}
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
            <div className="card overflow-hidden">
              {/* Evidence Tab Nav */}
              <div className="flex border-b border-slate-200 bg-slate-50/50 p-1.5 gap-1">
                <button
                  type="button"
                  onClick={() => setEvidenceTab("questions")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
                    evidenceTab === "questions"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <ListChecks className="h-3.5 w-3.5 text-brand-600" />
                  Questions ({askedCount}/{questions.length})
                </button>

                <button
                  type="button"
                  onClick={() => setEvidenceTab("flags")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
                    evidenceTab === "flags"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Flag className="h-3.5 w-3.5 text-amber-500" />
                  Flagged ({flags.length})
                </button>

                <button
                  type="button"
                  onClick={() => setEvidenceTab("transcript")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
                    evidenceTab === "transcript"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                  Transcript ({transcript.length})
                </button>
              </div>

              {/* Evidence Tab Content */}
              <div className="p-5 max-h-[620px] overflow-y-auto">
                {/* Tab 1: Questions */}
                {evidenceTab === "questions" && (
                  <div className="space-y-4">
                    {questions.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">No questions listed.</p>
                    ) : (
                      questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-bold text-slate-400">
                              Q{idx + 1}
                            </span>
                            <p className="flex-1 text-sm font-medium text-slate-800">
                              {q.text}
                            </p>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${
                                q.status === "ASKED"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : q.status === "SKIPPED"
                                  ? "bg-slate-200 text-slate-600"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {q.status}
                            </span>
                          </div>
                          {q.note && (
                            <div className="mt-2.5 rounded-lg bg-white p-2.5 border border-slate-200 text-xs text-slate-600">
                              <span className="font-semibold text-slate-700">
                                HR Note:{" "}
                              </span>
                              {q.note}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 2: Flagged Moments */}
                {evidenceTab === "flags" && (
                  <div className="space-y-3">
                    {flags.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-400">
                        No flagged moments were recorded during the interview.
                      </div>
                    ) : (
                      flags.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-start gap-3 rounded-xl border border-amber-200/60 bg-amber-50/30 p-3.5"
                        >
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-mono font-bold text-amber-800">
                            <Clock className="h-3 w-3" />
                            {formatMs(f.timestampMs)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800">
                              {f.label || "Flagged moment"}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 3: Full Transcript */}
                {evidenceTab === "transcript" && (
                  <div className="space-y-3">
                    {transcript.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-400">
                        No transcript segments captured.
                      </div>
                    ) : (
                      transcript.map((t) => (
                        <div
                          key={t.id}
                          className={`rounded-xl p-3.5 text-sm border ${
                            t.speakerRole === "HR"
                              ? "bg-slate-50 border-slate-200 text-slate-800"
                              : "bg-brand-50/40 border-brand-100 text-slate-900"
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                            <span className="font-semibold text-slate-600">
                              {t.speakerRole === "HR" ? "Interviewer" : "Candidate"}
                            </span>
                            <span className="font-mono text-[11px]">
                              {formatMs(t.startMs)}
                            </span>
                          </div>
                          <p className="leading-relaxed">{t.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: HR Evaluation Form (col-span-5) */}
          <div className="col-span-12 lg:col-span-5">
            <form onSubmit={handleSave} className="card p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-600" /> HR Hiring Decision
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set your decision and overall candidate score.
                </p>
              </div>

              {/* 1. Decision Toggles */}
              <div>
                <label className="label text-xs uppercase tracking-wide text-slate-500">
                  Decision Outcome
                </label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {/* HIRE */}
                  <button
                    type="button"
                    onClick={() => setDecision("HIRE")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                      decision === "HIRE"
                        ? "border-green-600 bg-green-50 text-green-900 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle2
                      className={`h-5 w-5 ${
                        decision === "HIRE" ? "text-green-600" : "text-slate-400"
                      }`}
                    />
                    <span className="mt-1 text-xs font-bold">APPROVED</span>
                  </button>

                  {/* HOLD */}
                  <button
                    type="button"
                    onClick={() => setDecision("HOLD")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                      decision === "HOLD"
                        ? "border-amber-500 bg-amber-50 text-amber-900 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <MinusCircle
                      className={`h-5 w-5 ${
                        decision === "HOLD" ? "text-amber-500" : "text-slate-400"
                      }`}
                    />
                    <span className="mt-1 text-xs font-bold">HOLD</span>
                  </button>

                  {/* REJECT */}
                  <button
                    type="button"
                    onClick={() => setDecision("REJECT")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                      decision === "REJECT"
                        ? "border-red-600 bg-red-50 text-red-900 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <XCircle
                      className={`h-5 w-5 ${
                        decision === "REJECT" ? "text-red-600" : "text-slate-400"
                      }`}
                    />
                    <span className="mt-1 text-xs font-bold">REJECT</span>
                  </button>
                </div>
              </div>

              {/* 2. Overall Score */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="label text-xs uppercase tracking-wide text-slate-500">
                    Overall Score (0 - 100)
                  </label>
                  <span className="text-xl font-bold text-slate-900">
                    {overallScore}
                    <span className="text-xs font-normal text-slate-400">/100</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={overallScore}
                  onChange={(e) => setOverallScore(Number(e.target.value))}
                  className="w-full accent-brand-600 cursor-pointer mt-1"
                />
              </div>

              {/* Individual Dimension Scores */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="label text-xs uppercase tracking-wide text-slate-500">
                  Individual Dimension Scores
                </label>
                <div className="space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                  {RUBRIC_DIMENSIONS.map((d) => (
                    <div key={d.key} className="flex items-center justify-between gap-3 text-xs">
                      <span className="w-28 font-medium text-slate-700 truncate" title={d.label}>
                        {d.label}
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={dimensionScores[d.key] ?? 0}
                        onChange={(e) => handleDimChange(d.key, Number(e.target.value))}
                        className="flex-1 accent-brand-600 cursor-pointer h-1.5"
                      />
                      <span className="w-10 text-right font-bold text-slate-800">
                        {dimensionScores[d.key] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Single Interviewer Notes / Rationale Box */}
              <div>
                <label className="label text-xs uppercase tracking-wide text-slate-500">
                  Interviewer Notes & Rationale
                </label>
                <textarea
                  rows={5}
                  value={hireRationale}
                  onChange={(e) => setHireRationale(e.target.value)}
                  placeholder="Enter your interview notes, candidate evaluation, and key decision factors..."
                  className="input text-sm resize-none"
                />
              </div>

              {/* Optional Advanced Fields Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1"
                >
                  {showAdvanced ? "− Hide extra feedback fields" : "+ Show extra feedback fields (Strengths, Gaps, Candidate Feedback)"}
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-slate-100 animate-in fade-in">
                    {/* Strengths & Gaps */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label text-xs uppercase tracking-wide text-green-700">
                          Key Strengths
                        </label>
                        <textarea
                          rows={3}
                          value={strengthsText}
                          onChange={(e) => setStrengthsText(e.target.value)}
                          placeholder="One per line..."
                          className="input text-xs resize-none"
                        />
                      </div>
                      <div>
                        <label className="label text-xs uppercase tracking-wide text-red-700">
                          Key Gaps
                        </label>
                        <textarea
                          rows={3}
                          value={gapsText}
                          onChange={(e) => setGapsText(e.target.value)}
                          placeholder="One per line..."
                          className="input text-xs resize-none"
                        />
                      </div>
                    </div>

                    {/* Candidate Feedback */}
                    <div>
                      <label className="label text-xs uppercase tracking-wide text-slate-500">
                        Candidate Feedback
                      </label>
                      <textarea
                        rows={3}
                        value={candidateFeedback}
                        onChange={(e) => setCandidateFeedback(e.target.value)}
                        placeholder="Constructive feedback to share with candidate..."
                        className="input text-sm resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Save Action */}
              <button
                type="submit"
                disabled={saving || aiRunning}
                className="btn-primary w-full py-2.5 text-sm font-semibold shadow-sm"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving..." : "Save & View Final Report"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatMs(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
