"use client";

import { useState } from "react";
import { Check, SkipForward, StickyNote, Sparkles, X, Loader2 } from "lucide-react";
import type { QuestionDTO } from "./types";

const statusStyle: Record<QuestionDTO["status"], string> = {
  PENDING: "border-slate-200 bg-white",
  ASKED: "border-emerald-200 bg-emerald-50",
  SKIPPED: "border-slate-200 bg-slate-50 opacity-60",
};

export function QuestionSidebar({
  initial,
  followup,
  followupLoading,
  onDismissFollowup,
}: {
  initial: QuestionDTO[];
  followup: string | null;
  followupLoading: boolean;
  onDismissFollowup: () => void;
}) {
  const [questions, setQuestions] = useState<QuestionDTO[]>(initial);
  const [noteEditing, setNoteEditing] = useState<string | null>(null);

  async function patch(id: string, body: Partial<QuestionDTO>) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...body } : q)));
    await fetch(`/api/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }

  return (
    <div className="flex h-full flex-col">
      {/* AI follow-up suggestion chip */}
      <div className="border-b border-slate-200 p-3">
        {followupLoading ? (
          <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking of a follow-up…
          </div>
        ) : followup ? (
          <div className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
            <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" />
            <p className="flex-1 text-sm text-brand-900">{followup}</p>
            <button
              onClick={onDismissFollowup}
              className="text-brand-400 hover:text-brand-700"
              aria-label="Dismiss suggestion"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="px-1 text-xs text-slate-400">
            AI follow-up suggestions appear here after the candidate answers.
          </p>
        )}
      </div>

      <div className="border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-slate-700">Questions</h2>
      </div>

      <ol className="flex-1 space-y-2 overflow-y-auto p-3">
        {questions.map((q, i) => (
          <li
            key={q.id}
            className={`rounded-lg border p-2.5 transition ${statusStyle[q.status]}`}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-xs font-semibold text-slate-400">
                {i + 1}
              </span>
              <p
                className={`flex-1 text-sm ${
                  q.status === "SKIPPED"
                    ? "text-slate-400 line-through"
                    : "text-slate-800"
                }`}
              >
                {q.text}
              </p>
            </div>

            <div className="mt-2 flex items-center gap-1">
              <button
                onClick={() =>
                  patch(q.id, {
                    status: q.status === "ASKED" ? "PENDING" : "ASKED",
                  })
                }
                className={`btn px-2 py-1 text-xs ${
                  q.status === "ASKED"
                    ? "bg-emerald-600 text-white"
                    : "text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                <Check className="h-3.5 w-3.5" /> Asked
              </button>
              <button
                onClick={() =>
                  patch(q.id, {
                    status: q.status === "SKIPPED" ? "PENDING" : "SKIPPED",
                  })
                }
                className="btn px-2 py-1 text-xs text-slate-500 hover:bg-slate-200"
              >
                <SkipForward className="h-3.5 w-3.5" /> Skip
              </button>
              <button
                onClick={() => setNoteEditing(noteEditing === q.id ? null : q.id)}
                className="btn px-2 py-1 text-xs text-slate-500 hover:bg-slate-200"
              >
                <StickyNote className="h-3.5 w-3.5" />
                {q.note ? "Note•" : "Note"}
              </button>
            </div>

            {noteEditing === q.id && (
              <textarea
                autoFocus
                defaultValue={q.note ?? ""}
                onBlur={(e) => {
                  patch(q.id, { note: e.target.value || null });
                  setNoteEditing(null);
                }}
                rows={2}
                placeholder="Add a note…"
                className="input mt-2 text-xs"
              />
            )}
            {q.note && noteEditing !== q.id && (
              <p className="mt-1.5 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                {q.note}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
