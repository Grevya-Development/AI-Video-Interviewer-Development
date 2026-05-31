import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/sessions/:id/transcript — owner-only, full ordered transcript.
// Polled by the HR panel for the live feed (no Realtime config required).
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await prisma.session.findFirst({
    where: { id: params.id, ownerId: user.id },
    select: { id: true },
  });
  if (!session)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const segments = await prisma.transcriptSegment.findMany({
    where: { sessionId: params.id },
    orderBy: { startMs: "asc" },
    select: {
      id: true,
      speakerRole: true,
      speakerName: true,
      text: true,
      startMs: true,
      endMs: true,
    },
  });

  return NextResponse.json({ segments });
}
