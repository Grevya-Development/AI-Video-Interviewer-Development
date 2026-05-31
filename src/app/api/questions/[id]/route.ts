import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const patchSchema = z.object({
  status: z.enum(["PENDING", "ASKED", "SKIPPED"]).optional(),
  note: z.string().nullable().optional(),
});

// PATCH /api/questions/:id — mark asked/skipped or attach a note.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ensure the question belongs to a session this HR owns.
  const question = await prisma.question.findFirst({
    where: { id: params.id, session: { ownerId: user.id } },
  });
  if (!question)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { status, note } = parsed.data;
  const updated = await prisma.question.update({
    where: { id: params.id },
    data: {
      ...(status ? { status } : {}),
      ...(status === "ASKED" ? { askedAt: new Date() } : {}),
      ...(note !== undefined ? { note } : {}),
    },
  });

  return NextResponse.json({ question: updated });
}
