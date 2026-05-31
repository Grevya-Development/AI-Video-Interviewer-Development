import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  timestampMs: z.number().int().nonnegative(),
  label: z.string().max(200).nullable().optional(),
});

// POST /api/sessions/:id/flags — bookmark the current transcript timestamp.
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await prisma.session.findFirst({
    where: { id: params.id, ownerId: user.id },
  });
  if (!session)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const flag = await prisma.flag.create({
    data: {
      sessionId: session.id,
      timestampMs: parsed.data.timestampMs,
      label: parsed.data.label ?? null,
    },
  });

  return NextResponse.json({ flag }, { status: 201 });
}
