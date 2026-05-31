# InterviewIQ

**Open-source AI Video Interviewer.** Run live video interviews with real-time
transcription, AI follow-up suggestions, and a structured end-of-interview
hiring decision — built entirely on open infrastructure.

> Stack: **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS** ·
> **Supabase** (Postgres + Auth + Storage) · **Prisma** · **LiveKit** (WebRTC) ·
> **Groq** (LLM + Whisper, OpenAI-compatible & swappable).

---

## Features

### HR Panel (live)
- Live video grid (HR + Candidate) via LiveKit.
- Ordered **question list** — mark *Asked* / *Skip*, attach notes.
- **Live transcript** feed, color-coded by speaker, with timestamps.
- **AI follow-up suggestions** — after the candidate pauses (>3s of silence),
  the LLM proposes one probing follow-up as a dismissible chip.
- **Flag Moment** button to bookmark a transcript timestamp (optional label).
- Interview **timer** (countdown if a duration is set, otherwise elapsed).

### Candidate Panel
- Clean video room (own feed + HR feed).
- Subtle **“Recording in progress”** indicator. **No AI elements.**
- Joins by **secret link** — no account required.

### Transcription pipeline
- Each participant records their **own** mic in ~5s chunks (`MediaRecorder` on
  the LiveKit audio track).
- Chunks POST to `/api/transcribe`, which calls **Groq `whisper-large-v3`**.
- Speakers are labeled by **track identity** (whose mic produced the chunk),
  which is reliable for a 2-person interview.
- Segments are written to Postgres and streamed to the HR panel via
  **Supabase Realtime** (Postgres change subscriptions) — no custom WebSocket
  server needed.

### End-of-interview AI decision
`POST /api/sessions/:id/evaluate` sends the full transcript, job title + JD,
question list (with which were asked), HR flags/notes, and a 5-dimension rubric
(communication, technical fit, culture fit, confidence, clarity) to the LLM and
stores structured JSON:

```jsonc
{
  "decision": "HIRE" | "HOLD" | "REJECT",
  "overall_score": 0-100,
  "dimension_scores": { "communication": { "score": 0-100, "reasoning": "…" }, … },
  "hire_rationale": "…",
  "strengths": ["…"],
  "gaps": ["…"],
  "candidate_feedback": "…",
  "improvement_suggestions": ["…"]
}
```

### HR Report page (`/r/:reportToken`)
Decision badge (green/amber/red), score breakdown bar chart, per-dimension
reasoning, strengths/gaps, candidate feedback, and **Export PDF** (native
print-to-PDF). Shareable via its secret URL.

---

## Architecture

```
Browser (HR)         Browser (Candidate)
  │  video/audio        │  video/audio
  ▼                     ▼
        LiveKit room (WebRTC)
  │                     │
  │ 5s mic chunks       │ 5s mic chunks
  ▼                     ▼
   POST /api/transcribe  ──► Groq Whisper ──► Postgres (TranscriptSegment)
                                                   │
                          Supabase Realtime ◄──────┘
                                   │
                                   ▼
                         HR panel live transcript

End → POST /api/sessions/:id/evaluate ──► Groq LLM ──► EvaluationResult ──► /r/:token report
```

---

## Data model (Prisma)

`User` (mirrors Supabase auth) · `Session` · `Participant (HR | CANDIDATE)` ·
`Question` · `TranscriptSegment` · `Flag` · `EvaluationResult`.
See [`prisma/schema.prisma`](prisma/schema.prisma).

---

## Setup

### 1. Prerequisites (all free tiers / open source)
- **Node.js 20+**
- A **Supabase** project — <https://supabase.com> (or self-host Supabase).
- A **LiveKit** project — <https://cloud.livekit.io> (or self-host LiveKit).
- A **Groq** API key — <https://console.groq.com> (LLM + Whisper).

### 2. Install
```bash
npm install
cp .env.example .env   # then fill in the values
```

### 3. Configure `.env`
Fill in Supabase URL/keys, `DATABASE_URL` + `DIRECT_URL` (Supabase → Database →
Connection string), `LLM_*` / `WHISPER_*` (Groq), and `LIVEKIT_*`. See
[`.env.example`](.env.example) for every variable.

> **Swappable LLM:** `LLM_API_URL` / `LLM_MODEL` / `LLM_API_KEY` accept any
> OpenAI-compatible endpoint — Groq (default), Ollama (`http://localhost:11434/v1`),
> OpenAI, or an Anthropic-compatible proxy.

### 4. Create the database schema
```bash
npm run db:push        # pushes the Prisma schema to Supabase Postgres
```

### 5. Wire up Realtime + Storage
Run [`supabase/setup.sql`](supabase/setup.sql) in the Supabase SQL Editor. It
adds `TranscriptSegment` to the Realtime publication and creates the
`interview-media` storage bucket.

### 6. (Auth) Disable email confirmation for local dev
In Supabase → Authentication → Providers → Email, turn **off** “Confirm email”
so HR sign-up logs in immediately. (Leave on for production + configure SMTP.)

### 7. Run
```bash
npm run dev
# http://localhost:3000
```

---

## Usage

1. **Sign up** as an HR user at `/signup`.
2. **Create an interview** — job title, JD, questions, optional duration.
3. You land in the **HR room**. Click **Candidate link** to copy the join URL
   and send it to the candidate.
4. The candidate opens the link, clicks **Join interview**, and grants A/V.
5. Run the interview: mark questions, watch the live transcript, accept/dismiss
   AI follow-ups, flag moments.
6. Click **End & evaluate** → the AI report is generated and you’re taken to
   `/r/:reportToken`. Share that link or export a PDF.

---

## Self-hosting notes
- **Supabase**: works with self-hosted Supabase — point `NEXT_PUBLIC_SUPABASE_URL`
  and `DATABASE_URL` at your instance.
- **LiveKit**: self-host with the official Docker image and set
  `NEXT_PUBLIC_LIVEKIT_URL` + API key/secret.
- **LLM/Whisper**: Groq is cloud, but you can point `LLM_API_URL` at a local
  Ollama and `WHISPER_API_URL` at a self-hosted faster-whisper OpenAI-compatible
  server for a 100% offline stack.

## Project layout
```
prisma/schema.prisma          data model
supabase/setup.sql            Realtime + Storage wiring
src/lib/                      prisma, supabase, llm, transcribe, livekit, rubric
src/app/api/                  sessions, livekit token, questions, flags,
                              transcribe, followup, evaluate
src/app/(pages)/              landing, login, signup, dashboard, interview,
                              join, report (/r)
src/components/interview/     LiveKit room UI + transcription/silence hooks
src/components/report/        chart, PDF export, share link
```

## License
MIT.
