-- ─────────────────────────────────────────────────────────────
-- InterviewIQ — Supabase one-shot setup
-- Paste this whole file into the Supabase SQL Editor and run it.
-- It is idempotent (safe to re-run) and creates EVERYTHING:
--   schema (enums + tables + indexes + FKs) → Realtime → Storage.
--
-- You do NOT need to run `npm run db:push` first — this file is the
-- canonical DDL generated from prisma/schema.prisma. (If you prefer Prisma,
-- run `npm run db:push` instead and then only sections 2 & 3 below.)
-- ─────────────────────────────────────────────────────────────

-- ============================================================
-- 1) SCHEMA
-- ============================================================

-- Enums (guarded so re-running doesn't error).
DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('HR', 'CANDIDATE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'LIVE', 'ENDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "QuestionStatus" AS ENUM ('PENDING', 'ASKED', 'SKIPPED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "Decision" AS ENUM ('HIRE', 'HOLD', 'REJECT'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tables.
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "roomName" TEXT NOT NULL,
    "candidateToken" TEXT NOT NULL,
    "reportToken" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Participant" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "displayName" TEXT NOT NULL,
    "identity" TEXT,
    "joinedAt" TIMESTAMP(3),
    "sessionId" TEXT NOT NULL,
    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Question" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "QuestionStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "askedAt" TIMESTAMP(3),
    "sessionId" TEXT NOT NULL,
    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TranscriptSegment" (
    "id" TEXT NOT NULL,
    "speakerRole" "Role" NOT NULL,
    "speakerName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    CONSTRAINT "TranscriptSegment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Flag" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "timestampMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    CONSTRAINT "Flag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EvaluationResult" (
    "id" TEXT NOT NULL,
    "decision" "Decision" NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "dimensionScores" JSONB NOT NULL,
    "hireRationale" TEXT NOT NULL,
    "strengths" TEXT[],
    "gaps" TEXT[],
    "candidateFeedback" TEXT NOT NULL,
    "improvementSuggestions" TEXT[],
    "rawModelOutput" JSONB,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    CONSTRAINT "EvaluationResult_pkey" PRIMARY KEY ("id")
);

-- Indexes.
CREATE UNIQUE INDEX IF NOT EXISTS "User_authUserId_key" ON "User"("authUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_roomName_key" ON "Session"("roomName");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_candidateToken_key" ON "Session"("candidateToken");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_reportToken_key" ON "Session"("reportToken");
CREATE INDEX IF NOT EXISTS "Session_ownerId_idx" ON "Session"("ownerId");
CREATE INDEX IF NOT EXISTS "Participant_sessionId_idx" ON "Participant"("sessionId");
CREATE INDEX IF NOT EXISTS "Question_sessionId_idx" ON "Question"("sessionId");
CREATE INDEX IF NOT EXISTS "TranscriptSegment_sessionId_startMs_idx" ON "TranscriptSegment"("sessionId", "startMs");
CREATE INDEX IF NOT EXISTS "Flag_sessionId_idx" ON "Flag"("sessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "EvaluationResult_sessionId_key" ON "EvaluationResult"("sessionId");

-- Foreign keys (guarded so re-running doesn't error).
DO $$ BEGIN
  ALTER TABLE "Session" ADD CONSTRAINT "Session_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "Participant" ADD CONSTRAINT "Participant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "Question" ADD CONSTRAINT "Question_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "Flag" ADD CONSTRAINT "Flag_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "EvaluationResult" ADD CONSTRAINT "EvaluationResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 2) REALTIME — stream new transcript segments to the HR panel.
-- ============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE "TranscriptSegment";
EXCEPTION
  WHEN duplicate_object THEN null;  -- already added
  WHEN undefined_object THEN null;  -- publication missing (non-Supabase pg)
END $$;

-- ============================================================
-- 3) STORAGE — private bucket for recordings / audio.
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('interview-media', 'interview-media', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4) (Optional, recommended for production) RLS on the transcript so the
--    anon Realtime subscription respects access. The app's API routes use
--    Prisma/service-role and bypass RLS, so this only affects Realtime reads.
-- ============================================================
-- ALTER TABLE "TranscriptSegment" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "read transcript" ON "TranscriptSegment" FOR SELECT USING (true);
