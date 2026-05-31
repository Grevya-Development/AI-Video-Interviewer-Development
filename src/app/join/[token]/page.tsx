import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CandidateRoom } from "@/components/interview/CandidateRoom";

export const dynamic = "force-dynamic";

// Public candidate entry — access is by secret token, no account required.
export default async function JoinPage({
  params,
}: {
  params: { token: string };
}) {
  const session = await prisma.session.findUnique({
    where: { candidateToken: params.token },
    select: { id: true, jobTitle: true, candidateToken: true, status: true },
  });

  if (!session) notFound();

  if (session.status === "ENDED") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-900 px-6 text-center text-white">
        <h1 className="text-2xl font-semibold">This interview has ended</h1>
        <p className="mt-2 text-slate-300">
          Thank you for your time. You may close this window.
        </p>
      </div>
    );
  }

  return (
    <CandidateRoom
      candidateToken={session.candidateToken}
      sessionId={session.id}
      jobTitle={session.jobTitle}
    />
  );
}
