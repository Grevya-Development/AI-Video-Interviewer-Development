import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { transcribeAudio } from "@/lib/transcribe";

export const maxDuration = 60;

/**
 * POST /api/transcribe  (multipart/form-data)
 * Fields:
 *   audio          : Blob (~5s chunk, webm/ogg/wav)
 *   sessionId      : string
 *   startMs, endMs : ms offsets from session start
 *   candidateToken : string (candidate path) — OR be the authenticated HR owner
 *
 * The speaker is labeled from the *credential*, not ML diarization: each
 * client records only its own mic, so the chunk's owner == the speaker.
 * Writes a TranscriptSegment which Supabase Realtime broadcasts to the HR panel.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const audio = form.get("audio");
  const sessionId = String(form.get("sessionId") ?? "");
  const candidateToken = form.get("candidateToken")
    ? String(form.get("candidateToken"))
    : null;
  const startMs = Number(form.get("startMs") ?? 0);
  const endMs = Number(form.get("endMs") ?? 0);

  if (!(audio instanceof Blob) || !sessionId) {
    return NextResponse.json({ error: "Missing audio or sessionId" }, { status: 400 });
  }

  // Resolve speaker role from the credential.
  let speakerRole: "HR" | "CANDIDATE";
  let session;

  if (candidateToken) {
    session = await prisma.session.findFirst({
      where: { id: sessionId, candidateToken },
    });
    if (!session)
      return NextResponse.json({ error: "Invalid link" }, { status: 403 });
    speakerRole = "CANDIDATE";
  } else {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    session = await prisma.session.findFirst({
      where: { id: sessionId, ownerId: user.id },
    });
    if (!session)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    speakerRole = "HR";
  }

  const WHISPER_HALLUCINATIONS = new Set([
    "thank you", "thank you.", "thank you very much.",
    "thanks for watching", "thanks for watching.",
    "you", "you.", "yeah", "yeah.", "bye", "bye.",
    "subtitles by", "subscribe", "please subscribe",
    "oh", "oh.", "uh", "uh.", "um", "um."
  ]);

  function isHallucination(val: string): boolean {
    const clean = val.toLowerCase().trim().replace(/[.,!?]/g, "");
    return WHISPER_HALLUCINATIONS.has(clean) || clean.length <= 1;
  }

  let text: string;
  try {
    const filename = (audio as any).name || "chunk.webm";
    text = await transcribeAudio(audio, filename);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    console.error("[/api/transcribe]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!text || isHallucination(text)) {
    return NextResponse.json({ segment: null }); // silence or hallucinated noise
  }

  const participant = await prisma.participant.findFirst({
    where: { sessionId: session.id, role: speakerRole },
  });

  const segment = await prisma.transcriptSegment.create({
    data: {
      sessionId: session.id,
      speakerRole,
      speakerName: participant?.displayName ?? speakerRole,
      text,
      startMs,
      endMs,
    },
  });

  return NextResponse.json({ segment });
}
