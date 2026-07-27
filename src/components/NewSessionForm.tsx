"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Sparkles } from "lucide-react";

export function NewSessionForm() {
  const router = useRouter();
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [duration, setDuration] = useState<string>("");
  const [questions, setQuestions] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateQuestions() {
    setError(null);
    if (!jobTitle.trim() || !jobDescription.trim()) {
      setError("Add a job title and description first, then generate questions.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not generate questions");
      }
      const { questions: generated } = await res.json();
      // Merge: keep any manually-typed questions, append generated ones.
      setQuestions((prev) => {
        const manual = prev.map((q) => q.trim()).filter(Boolean);
        return [...manual, ...generated];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate questions");
    } finally {
      setGenerating(false);
    }
  }

  function updateQuestion(i: number, value: string) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? value : q)));
  }
  function addQuestion() {
    setQuestions((qs) => [...qs, ""]);
  }
  function removeQuestion(i: number) {
    setQuestions((qs) => (qs.length === 1 ? qs : qs.filter((_, idx) => idx !== i)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleaned = questions.map((q) => q.trim()).filter(Boolean);
    if (!jobTitle.trim() || !jobDescription.trim() || cleaned.length === 0) {
      setError("Job title, description, and at least one question are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim(),
          durationMinutes: duration ? Number(duration) : null,
          questions: cleaned,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create session");
      }
      const { session } = await res.json();
      router.push(`/interview/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-4 sm:p-6">
      <div>
        <label className="label" htmlFor="jobTitle">
          Job title
        </label>
        <input
          id="jobTitle"
          className="input"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Senior Backend Engineer"
        />
      </div>

      <div>
        <label className="label" htmlFor="jd">
          Job description
        </label>
        <textarea
          id="jd"
          rows={5}
          className="input resize-y"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Responsibilities, required skills, team context…"
        />
      </div>

      <div>
        <label className="label" htmlFor="duration">
          Interview length (minutes, optional)
        </label>
        <input
          id="duration"
          type="number"
          min={1}
          className="input w-full sm:max-w-[180px]"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="e.g. 45"
        />
        <p className="mt-1 text-xs text-slate-400">
          Leave blank for an elapsed-time timer.
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <label className="label mb-0">Interview questions</label>
          <button
            type="button"
            onClick={generateQuestions}
            disabled={generating}
            className="btn px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {generating ? " Generating…" : " Generate from JD with AI"}
          </button>
        </div>
        <p className="mb-2 text-xs text-slate-400">
          Generate a tailored set from the description, then edit or add your own.
        </p>
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 text-right text-sm font-medium text-slate-400 select-none">
                {i + 1}.
              </span>
              <input
                type="text"
                className="input"
                value={q}
                onChange={(e) => updateQuestion(i, e.target.value)}
                placeholder="Type a question…"
              />
              <button
                type="button"
                onClick={() => removeQuestion(i)}
                className="btn-ghost p-2 flex-shrink-0"
                aria-label="Remove question"
              >
                <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500 transition-colors" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addQuestion} className="btn-ghost mt-2 text-brand-600">
          <Plus className="h-4 w-4" /> Add question
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="btn-secondary w-full sm:w-auto"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary w-full sm:w-auto"
          disabled={submitting}
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Create & open room
        </button>
      </div>
    </form>
  );
}
