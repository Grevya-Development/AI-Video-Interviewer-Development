import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  timestampMs: z.number().int().nonnegative(),
  label: z.string().max(200).nullable().optional(),
  candidateToken: z.string().optional(),
});

// GET /api/sessions/:id/flags — list session flags
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const flags = await prisma.flag.findMany({
    where: { sessionId: params.id },
    orderBy: { timestampMs: "asc" },
  });

  return NextResponse.json({ flags });
}

// POST /api/sessions/:id/flags — bookmark the current transcript timestamp or proctoring incident
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  let sessionId = params.id;

  if (parsed.data.candidateToken) {
    const session = await prisma.session.findUnique({
      where: { candidateToken: parsed.data.candidateToken },
      select: { id: true },
    });
    if (!session || session.id !== params.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const session = await prisma.session.findFirst({
      where: { id: params.id, ownerId: user.id },
      select: { id: true },
    });
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const flag = await prisma.flag.create({
    data: {
      sessionId,
      timestampMs: parsed.data.timestampMs,
      label: parsed.data.label ?? null,
    },
  });

  return NextResponse.json({ flag }, { status: 201 });
}
