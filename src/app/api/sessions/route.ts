import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const createSchema = z.object({
  jobTitle: z.string().min(1).max(200),
  jobDescription: z.string().min(1),
  durationMinutes: z.number().int().positive().max(480).nullable().optional(),
  questions: z.array(z.string().min(1)).min(1),
});

// GET /api/sessions — list the current HR user's sessions.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await prisma.session.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { questions: true } },
      evaluation: { select: { decision: true, overallScore: true } },
    },
  });

  return NextResponse.json({ sessions });
}

// POST /api/sessions — create a new interview session.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { jobTitle, jobDescription, durationMinutes, questions } = parsed.data;

  const session = await prisma.session.create({
    data: {
      jobTitle,
      jobDescription,
      durationMinutes: durationMinutes ?? null,
      ownerId: user.id,
      questions: {
        create: questions.map((text, i) => ({ text, order: i })),
      },
      participants: {
        create: [
          { role: "HR", displayName: user.name ?? "Interviewer" },
          { role: "CANDIDATE", displayName: "Candidate" },
        ],
      },
    },
    include: { questions: true },
  });

  revalidatePath("/dashboard");

  return NextResponse.json({ session }, { status: 201 });
}
