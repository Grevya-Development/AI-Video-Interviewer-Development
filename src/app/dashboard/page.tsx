import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Video, FileBarChart, Clock, CheckCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/DashboardHeader";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  LIVE: "bg-emerald-100 text-emerald-700",
  ENDED: "bg-brand-50 text-brand-700",
};

const decisionStyles: Record<string, string> = {
  HIRE: "bg-green-100 text-green-700",
  HOLD: "bg-amber-100 text-amber-700",
  REJECT: "bg-red-100 text-red-700",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { verified?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sessions = await prisma.session.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { questions: true } },
      evaluation: { select: { decision: true, overallScore: true } },
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader email={user.email} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        {searchParams.verified === "true" && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Email verified successfully!</p>
              <p className="text-emerald-700 text-xs mt-0.5">
                Your account is now active and ready to use. Welcome to AI Interviewer!
              </p>
            </div>
          </div>
        )}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Interviews</h1>
            <p className="text-sm text-slate-500">
              Create a session, share the candidate link, and run the interview.
            </p>
          </div>
          <Link href="/dashboard/new" className="btn-primary w-full sm:w-auto">
            <Plus className="h-4 w-4" /> New interview
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
            <Video className="h-10 w-10 text-slate-300" />
            <h2 className="mt-4 font-semibold text-slate-800">No interviews yet</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Create your first interview session to generate a candidate link
              and start recording.
            </p>
            <Link href="/dashboard/new" className="btn-primary mt-5">
              <Plus className="h-4 w-4" /> Create interview
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-slate-900">
                      {s.jobTitle}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[s.status]}`}
                    >
                      {s.status}
                    </span>
                    {s.evaluation && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${decisionStyles[s.evaluation.decision]}`}
                      >
                        {s.evaluation.decision} · {s.evaluation.overallScore}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                    <span>{s._count.questions} questions</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {s.durationMinutes ? `${s.durationMinutes} min` : "elapsed"}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full sm:flex-row sm:w-auto sm:flex-shrink-0">
                  <Link href={`/interview/${s.id}`} className="btn-secondary w-full sm:w-auto">
                    <Video className="h-4 w-4" />
                    {s.status === "ENDED" ? "Re-open room" : "Open room"}
                  </Link>
                  {s.evaluation ? (
                    <Link href={`/r/${s.reportToken}`} className="btn-primary w-full sm:w-auto">
                      <FileBarChart className="h-4 w-4" /> Report
                    </Link>
                  ) : (
                    <Link
                      href={`/interview/${s.id}`}
                      className="btn-ghost text-brand-600 w-full sm:w-auto"
                    >
                      Evaluate →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
