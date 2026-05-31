import { notFound } from "next/navigation";
import { CheckCircle2, MinusCircle, XCircle, AlertCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { RUBRIC_DIMENSIONS, type DimensionScores } from "@/lib/rubric";
import { ScoreChart } from "@/components/report/ScoreChart";
import { PrintButton } from "@/components/report/PrintButton";
import { CopyLinkButton } from "@/components/report/CopyLinkButton";
import { DownloadTranscriptButton } from "@/components/report/DownloadTranscriptButton";
import { Brand } from "@/components/Brand";

export const dynamic = "force-dynamic";

const decisionMeta = {
  HIRE: {
    label: "Hire",
    cls: "bg-green-100 text-green-800 border-green-200",
    Icon: CheckCircle2,
    bar: "bg-green-600",
  },
  HOLD: {
    label: "Hold",
    cls: "bg-amber-100 text-amber-800 border-amber-200",
    Icon: MinusCircle,
    bar: "bg-amber-500",
  },
  REJECT: {
    label: "Reject",
    cls: "bg-red-100 text-red-800 border-red-200",
    Icon: XCircle,
    bar: "bg-red-600",
  },
} as const;

export default async function ReportPage({
  params,
}: {
  params: { token: string };
}) {
  const session = await prisma.session.findUnique({
    where: { reportToken: params.token },
    include: {
      evaluation: true,
      questions: { orderBy: { order: "asc" } },
      flags: { orderBy: { timestampMs: "asc" } },
      transcript: {
        orderBy: { startMs: "asc" },
        select: { speakerRole: true, text: true, startMs: true },
      },
    },
  });

  if (!session) notFound();

  if (!session.evaluation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <div className="card max-w-md p-8">
          <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
          <h1 className="mt-3 text-lg font-semibold text-slate-900">
            Evaluation pending
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            This interview hasn&apos;t been evaluated yet. Once the interviewer
            ends the session and runs the evaluation, the report will appear
            here.
          </p>
        </div>
      </main>
    );
  }

  const e = session.evaluation;
  const meta = decisionMeta[e.decision];
  const dims = e.dimensionScores as unknown as DimensionScores;

  const chartData = RUBRIC_DIMENSIONS.map((d) => ({
    label: d.label,
    score: dims?.[d.key]?.score ?? 0,
  }));

  const askedCount = session.questions.filter((q) => q.status === "ASKED").length;

  return (
    <main className="min-h-screen bg-slate-50 py-8 print:bg-white">
      <div className="mx-auto max-w-3xl px-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Brand size="sm" />
              <span className="text-sm font-medium text-slate-400">· Report</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              {session.jobTitle}
            </h1>
            <p className="text-sm text-slate-500">
              {askedCount} of {session.questions.length} questions asked
              {session.flags.length > 0 && ` · ${session.flags.length} flagged moments`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyLinkButton path={`/r/${session.reportToken}`} />
            <PrintButton />
            <DownloadTranscriptButton
              segments={session.transcript}
              jobTitle={session.jobTitle}
            />
          </div>
        </div>

        {/* Decision + score */}
        <div className="card print-full mb-4 flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-between">
          <div
            className={`flex items-center gap-3 rounded-xl border px-5 py-3 ${meta.cls}`}
          >
            <meta.Icon className="h-7 w-7" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">
                Decision
              </p>
              <p className="text-2xl font-bold">{meta.label}</p>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Overall score
            </p>
            <p className="text-4xl font-bold text-slate-900">
              {e.overallScore}
              <span className="text-lg text-slate-400">/100</span>
            </p>
          </div>
        </div>

        {/* Rationale */}
        <div className="card print-full mb-4 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Rationale
          </h2>
          <p className="mt-2 text-slate-700">{e.hireRationale}</p>
        </div>

        {/* Score breakdown chart */}
        <div className="card print-full mb-4 p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Score breakdown
          </h2>
          <ScoreChart data={chartData} />
          <div className="mt-4 space-y-3">
            {RUBRIC_DIMENSIONS.map((d) => (
              <div key={d.key} className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">
                    {d.label}
                  </span>
                  <span className="text-sm font-semibold text-slate-600">
                    {dims?.[d.key]?.score ?? 0}/100
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  {dims?.[d.key]?.reasoning ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths & gaps */}
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div className="card print-full p-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-green-700">
              Strengths
            </h2>
            <ul className="space-y-1.5">
              {e.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="card print-full p-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-700">
              Gaps
            </h2>
            <ul className="space-y-1.5">
              {e.gaps.map((g, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Candidate feedback */}
        <div className="card print-full mb-4 border-brand-100 bg-brand-50/40 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-700">
            Candidate feedback
          </h2>
          <p className="mt-2 text-slate-700">{e.candidateFeedback}</p>
          {e.improvementSuggestions.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-medium text-slate-700">
                Suggested improvements
              </h3>
              <ul className="mt-1.5 space-y-1.5">
                {e.improvementSuggestions.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-600">
                    <span className="text-brand-500">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <p className="pb-8 text-center text-xs text-slate-400">
          Generated by Grevya · Interview IQ{e.model ? ` · ${e.model}` : ""}. This
          report is shareable via its secret link.
        </p>
      </div>
    </main>
  );
}
