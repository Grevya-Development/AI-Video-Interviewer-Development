import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createLiveKitToken } from "@/lib/livekit";

const schema = z.object({
  // Provide exactly one of these.
  sessionId: z.string().optional(), // HR path (requires auth)
  candidateToken: z.string().optional(), // candidate path (public)
});

/**
 * Mint a LiveKit join token.
 * - HR: pass { sessionId }, must be the authenticated owner.
 * - Candidate: pass { candidateToken } (the secret link token), no auth.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { sessionId, candidateToken } = parsed.data;

  if (candidateToken) {
    const session = await prisma.session.findUnique({
      where: { candidateToken },
    });
    if (!session)
      return NextResponse.json({ error: "Invalid link" }, { status: 404 });

    const participant = await prisma.participant.findFirst({
      where: { sessionId: session.id, role: "CANDIDATE" },
    });
    const identity = `candidate-${session.id}`;
    await prisma.participant.update({
      where: { id: participant!.id },
      data: { identity, joinedAt: new Date() },
    });

    const token = await createLiveKitToken({
      roomName: session.roomName,
      identity,
      name: participant?.displayName ?? "Candidate",
      metadata: JSON.stringify({ role: "CANDIDATE" }),
    });

    return NextResponse.json({
      token,
      url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
      roomName: session.roomName,
      identity,
      role: "CANDIDATE",
    });
  }

  // HR path.
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sessionId)
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const session = await prisma.session.findFirst({
    where: { id: sessionId, ownerId: user.id },
  });
  if (!session)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const participant = await prisma.participant.findFirst({
    where: { sessionId: session.id, role: "HR" },
  });
  const identity = `hr-${session.id}`;
  await prisma.participant.update({
    where: { id: participant!.id },
    data: { identity, joinedAt: new Date() },
  });

  const token = await createLiveKitToken({
    roomName: session.roomName,
    identity,
    name: user.name ?? "Interviewer",
    metadata: JSON.stringify({ role: "HR" }),
  });

  return NextResponse.json({
    token,
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    roomName: session.roomName,
    identity,
    role: "HR",
  });
}
