import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HrInterviewRoom } from "@/components/interview/HrInterviewRoom";

export const dynamic = "force-dynamic";

export default async function InterviewPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/interview/${params.id}`);

  const session = await prisma.session.findFirst({
    where: { id: params.id, ownerId: user.id },
    include: {
      questions: { orderBy: { order: "asc" } },
      transcript: { orderBy: { startMs: "asc" } },
    },
  });
  if (!session) notFound();

  // Mark LIVE on first open.
  if (session.status === "DRAFT") {
    await prisma.session.update({
      where: { id: session.id },
      data: { status: "LIVE", startedAt: new Date() },
    });
  }

  return (
    <HrInterviewRoom
      sessionId={session.id}
      jobTitle={session.jobTitle}
      durationMinutes={session.durationMinutes}
      candidateToken={session.candidateToken}
      questions={session.questions.map((q) => ({
        id: q.id,
        text: q.text,
        order: q.order,
        status: q.status,
        note: q.note,
      }))}
      initialTranscript={session.transcript.map((t) => ({
        id: t.id,
        speakerRole: t.speakerRole,
        speakerName: t.speakerName,
        text: t.text,
        startMs: t.startMs,
        endMs: t.endMs,
      }))}
    />
  );
}
