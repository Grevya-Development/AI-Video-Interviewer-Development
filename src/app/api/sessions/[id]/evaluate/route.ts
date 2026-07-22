import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { chatCompletion, LLM_MODEL } from "@/lib/llm";
import { RUBRIC_DIMENSIONS, type EvaluationPayload } from "@/lib/rubric";

// Coerce arbitrary parsed JSON into a Prisma-acceptable JSON input value.
function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export const maxDuration = 120;

function buildPrompt(session: {
  jobTitle: string;
  jobDescription: string;
  questions: { text: string; status: string; note: string | null }[];
  transcript: { speakerRole: string; text: string; startMs: number }[];
  flags: { timestampMs: number; label: string | null }[];
}) {
  const transcriptText = session.transcript
    .map(
      (s) =>
        `[${msToClock(s.startMs)}] ${s.speakerRole === "HR" ? "Interviewer" : "Candidate"}: ${s.text}`,
    )
    .join("\n");

  const questionsText = session.questions
    .map(
      (q) =>
        `- (${q.status}) ${q.text}${q.note ? ` [HR note: ${q.note}]` : ""}`,
    )
    .join("\n");

  const flagsText = session.flags.length
    ? session.flags
        .map((f) => `- [${msToClock(f.timestampMs)}] ${f.label ?? "flagged moment"}`)
        .join("\n")
    : "(none)";

  const rubricText = RUBRIC_DIMENSIONS.map(
    (d) => `- ${d.key}: ${d.description}`,
  ).join("\n");

  return `You are an impartial senior hiring panelist. Evaluate the candidate using ONLY evidence from the transcript. Be fair, specific, and cite behavior.

JOB TITLE: ${session.jobTitle}

JOB DESCRIPTION:
${session.jobDescription}

INTERVIEW QUESTIONS (and whether they were asked):
${questionsText}

HR-FLAGGED MOMENTS:
${flagsText}

FULL TRANSCRIPT (speaker-labeled, timestamped):
${transcriptText || "(no transcript captured)"}

SCORING RUBRIC (score each 0-100):
${rubricText}

Return a STRICT JSON object with EXACTLY these keys:
{
  "decision": "HIRE" | "HOLD" | "REJECT",
  "overall_score": <integer 0-100>,
  "dimension_scores": {
    ${RUBRIC_DIMENSIONS.map((d) => `"${d.key}": { "score": <0-100>, "reasoning": "<1-2 sentences citing the transcript>" }`).join(",\n    ")}
  },
  "hire_rationale": "<2-3 sentence summary of why this decision>",
  "strengths": ["<short phrase>", ...],
  "gaps": ["<short phrase>", ...],
  "candidate_feedback": "<one constructive paragraph the candidate will read>",
  "improvement_suggestions": ["<actionable suggestion>", ...]
}
Output ONLY the JSON object.`;
}

function msToClock(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// POST /api/sessions/:id/evaluate — run the end-of-interview AI decision.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await prisma.session.findFirst({
    where: { id: params.id, ownerId: user.id },
    include: {
      questions: { orderBy: { order: "asc" } },
      transcript: { orderBy: { startMs: "asc" } },
      flags: { orderBy: { timestampMs: "asc" } },
    },
  });
  if (!session)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prompt = buildPrompt(session);

  const raw = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You are a rigorous, unbiased hiring evaluator. You always respond with valid JSON only.",
      },
      { role: "user", content: prompt },
    ],
    { temperature: 0.2, maxTokens: 2500, json: true },
  );

  let parsed: EvaluationPayload;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Model did not return valid JSON", raw },
      { status: 502 },
    );
  }

  const evaluation = await prisma.evaluationResult.upsert({
    where: { sessionId: session.id },
    create: {
      sessionId: session.id,
      decision: parsed.decision,
      overallScore: clampScore(parsed.overall_score),
      dimensionScores: asJson(parsed.dimension_scores),
      hireRationale: parsed.hire_rationale,
      strengths: parsed.strengths ?? [],
      gaps: parsed.gaps ?? [],
      candidateFeedback: parsed.candidate_feedback,
      improvementSuggestions: parsed.improvement_suggestions ?? [],
      rawModelOutput: asJson(parsed),
      model: LLM_MODEL,
    },
    update: {
      decision: parsed.decision,
      overallScore: clampScore(parsed.overall_score),
      dimensionScores: asJson(parsed.dimension_scores),
      hireRationale: parsed.hire_rationale,
      strengths: parsed.strengths ?? [],
      gaps: parsed.gaps ?? [],
      candidateFeedback: parsed.candidate_feedback,
      improvementSuggestions: parsed.improvement_suggestions ?? [],
      rawModelOutput: asJson(parsed),
      model: LLM_MODEL,
    },
  });

  // Mark the session ended if it wasn't already.
  if (session.status !== "ENDED") {
    await prisma.session.update({
      where: { id: session.id },
      data: { status: "ENDED", endedAt: session.endedAt ?? new Date() },
    });
  }

  revalidatePath("/dashboard");

  return NextResponse.json({
    evaluation,
    reportUrl: `/r/${session.reportToken}`,
  });
}

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n || 0)));
}
