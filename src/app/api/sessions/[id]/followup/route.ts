import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { chatCompletion } from "@/lib/llm";

export const maxDuration = 30;

/**
 * POST /api/sessions/:id/followup
 * Triggered after a detected silence (>3s) on the candidate's track.
 * Returns one smart follow-up question based on the candidate's recent answer.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await prisma.session.findFirst({
    where: { id: params.id, ownerId: user.id },
    include: {
      transcript: { orderBy: { startMs: "desc" }, take: 12 },
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (!session)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Reconstruct the recent exchange in chronological order.
  const recent = [...session.transcript]
    .reverse()
    .map((s) => `${s.speakerRole === "HR" ? "Interviewer" : "Candidate"}: ${s.text}`)
    .join("\n");

  if (!recent.trim()) {
    return NextResponse.json({ followup: null });
  }

  const askedQuestions = session.questions
    .filter((q) => q.status !== "PENDING")
    .map((q) => `- ${q.text}`)
    .join("\n");

  const content = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You are an expert interviewer's assistant. Given the recent exchange, propose ONE concise, probing follow-up question that digs deeper into the candidate's last answer. It must be a single question, under 25 words, specific to what they just said. Avoid repeating questions already asked. Respond with ONLY the question text, no preamble.",
      },
      {
        role: "user",
        content: `Role: ${session.jobTitle}\n\nJob description:\n${session.jobDescription}\n\nQuestions already covered:\n${askedQuestions || "(none yet)"}\n\nRecent exchange:\n${recent}\n\nFollow-up question:`,
      },
    ],
    { temperature: 0.6, maxTokens: 80 },
  );

  const followup = content.replace(/^["']|["']$/g, "").trim();
  return NextResponse.json({ followup });
}
