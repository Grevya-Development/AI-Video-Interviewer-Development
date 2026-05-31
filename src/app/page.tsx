import Link from "next/link";
import { Video, ListChecks, Sparkles, FileBarChart } from "lucide-react";
import { Brand } from "@/components/Brand";

const features = [
  {
    icon: Video,
    title: "Live video interviews",
    body: "HR + candidate join a WebRTC room powered by LiveKit. Candidates join by link — no account.",
  },
  {
    icon: ListChecks,
    title: "Guided question flow",
    body: "Work through your question list, mark asked/skipped, and attach notes as you go.",
  },
  {
    icon: Sparkles,
    title: "AI follow-up suggestions",
    body: "After each answer, get a smart follow-up question — powered by an open LLM (Groq by default).",
  },
  {
    icon: FileBarChart,
    title: "Structured decisions",
    body: "End-of-interview evaluation with scores, rationale, and a shareable candidate report.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Brand size="md" />
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary">
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-16 text-center">
        <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          Open source · Self-hostable · MIT
        </span>
        <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          AI-assisted video interviews,
          <br />
          from first hello to hire decision.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-slate-600">
          Run live interviews with real-time transcription, AI follow-up
          prompts, and an end-of-interview scoring report — built entirely on
          open infrastructure.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/signup" className="btn-primary px-6 py-2.5 text-base">
            Start interviewing
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="card p-6">
            <f.icon className="h-6 w-6 text-brand-600" />
            <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
