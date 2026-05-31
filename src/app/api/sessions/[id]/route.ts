import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function ownedSession(id: string, userId: string) {
  return prisma.session.findFirst({ where: { id, ownerId: userId } });
}

// GET /api/sessions/:id — full session detail for the owner.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await prisma.session.findFirst({
    where: { id: params.id, ownerId: user.id },
    include: {
      questions: { orderBy: { order: "asc" } },
      participants: true,
      flags: { orderBy: { timestampMs: "asc" } },
      evaluation: true,
    },
  });

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ session });
}

const patchSchema = z.object({
  status: z.enum(["DRAFT", "LIVE", "ENDED"]).optional(),
});

// PATCH /api/sessions/:id — update status (start/end interview).
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await ownedSession(params.id, user.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { status } = parsed.data;
  const session = await prisma.session.update({
    where: { id: params.id },
    data: {
      ...(status ? { status } : {}),
      ...(status === "LIVE" ? { startedAt: new Date() } : {}),
      ...(status === "ENDED" ? { endedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ session });
}

// DELETE /api/sessions/:id
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await ownedSession(params.id, user.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.session.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
