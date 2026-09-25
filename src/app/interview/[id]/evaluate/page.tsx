import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EvaluationReviewForm } from "@/components/interview/EvaluationReviewForm";

export const dynamic = "force-dynamic";

export default async function EvaluationPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/interview/${params.id}/evaluate`);

  const session = await prisma.session.findFirst({
    where: { id: params.id, ownerId: user.id },
    include: {
      questions: { orderBy: { order: "asc" } },
      transcript: { orderBy: { startMs: "asc" } },
      flags: { orderBy: { timestampMs: "asc" } },
      evaluation: true,
    },
  });

  if (!session) notFound();

  // Coerce evaluation payload
  const initialEvaluation = session.evaluation
    ? {
        decision: session.evaluation.decision,
        overallScore: session.evaluation.overallScore,
        hireRationale: session.evaluation.hireRationale,
        strengths: session.evaluation.strengths,
        gaps: session.evaluation.gaps,
        candidateFeedback: session.evaluation.candidateFeedback,
        dimensionScores: session.evaluation.dimensionScores,
      }
    : null;

  return (
    <EvaluationReviewForm
      sessionId={session.id}
      jobTitle={session.jobTitle}
      reportToken={session.reportToken}
      questions={session.questions.map((q) => ({
        id: q.id,
        text: q.text,
        order: q.order,
        status: q.status,
        note: q.note,
      }))}
      transcript={session.transcript.map((t) => ({
        id: t.id,
        speakerRole: t.speakerRole,
        speakerName: t.speakerName,
        text: t.text,
        startMs: t.startMs,
        endMs: t.endMs,
      }))}
      flags={session.flags.map((f) => ({
        id: f.id,
        timestampMs: f.timestampMs,
        label: f.label,
      }))}
      initialEvaluation={initialEvaluation}
    />
  );
}
