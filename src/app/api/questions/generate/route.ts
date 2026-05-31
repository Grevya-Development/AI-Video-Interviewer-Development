import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { chatCompletion } from "@/lib/llm";

export const maxDuration = 30;

const schema = z.object({
  jobTitle: z.string().min(1).max(200),
  jobDescription: z.string().min(1),
  count: z.number().int().min(3).max(15).optional(),
});

// POST /api/questions/generate — generate interview questions from a JD.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { jobTitle, jobDescription, count = 8 } = parsed.data;

  const raw = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You are an expert interviewer. Generate a focused, role-specific interview question set from a job description. Mix behavioral, technical, and situational questions, ordered from warm-up to deep-dive. Respond with ONLY a JSON object of the form {\"questions\": [\"...\", \"...\"]} and nothing else.",
      },
      {
        role: "user",
        content: `Job title: ${jobTitle}\n\nJob description:\n${jobDescription}\n\nGenerate exactly ${count} interview questions tailored to this role. Each question should be a complete, standalone question.`,
      },
    ],
    { temperature: 0.5, maxTokens: 900, json: true },
  );

  let questions: string[] = [];
  try {
    const obj = JSON.parse(raw);
    if (Array.isArray(obj)) questions = obj;
    else if (Array.isArray(obj.questions)) questions = obj.questions;
  } catch {
    return NextResponse.json(
      { error: "Could not parse generated questions", raw },
      { status: 502 },
    );
  }

  questions = questions
    .map((q) => (typeof q === "string" ? q.trim() : ""))
    .filter(Boolean)
    .slice(0, count);

  if (questions.length === 0)
    return NextResponse.json({ error: "No questions generated" }, { status: 502 });

  return NextResponse.json({ questions });
}
