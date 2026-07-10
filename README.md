# InterviewIQ

**Open-source AI Video Interviewer.** Run live video interviews with real-time
transcription, AI follow-up suggestions, AI-generated question sets, and a
structured end-of-interview hiring decision — built entirely on open,
swappable infrastructure.

> **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS ·
> Supabase (Postgres + Auth + Realtime + Storage) · Prisma · LiveKit (WebRTC) ·
> Groq (LLM + Whisper — OpenAI-compatible & swappable)

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Data model (schema)](#data-model-schema)
- [API reference](#api-reference)
- [Environment variables](#environment-variables)
- [Getting started (end to end)](#getting-started-end-to-end)
- [Usage walkthrough](#usage-walkthrough)
- [Self-hosting / going fully open source](#self-hosting--going-fully-open-source)
- [Project layout](#project-layout)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

### HR panel (live)
- Live video grid (HR + candidate) via LiveKit.
- Ordered **question list** — mark *Asked* / *Skip*, attach notes.
- **AI question generation** — generate a role-specific question set (3–15
  questions) from the job title + description.
- **Live transcript** feed, color-coded by speaker, with timestamps.
- **AI follow-up suggestions** — after the candidate pauses (>3 s of silence),
  the LLM proposes one probing follow-up as a dismissible chip.
- **Flag Moment** button to bookmark a transcript timestamp (optional label).
- Interview **timer** — countdown if a duration is set, otherwise elapsed.

### Candidate panel
- Clean video room (own feed + HR feed).
- Subtle **“Recording in progress”** indicator. **No AI elements are shown.**
- Joins by **secret link** — no account required.

### Transcription pipeline
- Each participant records their **own** mic in ~5 s chunks
  (`MediaRecorder` on the LiveKit audio track).
- Chunks POST to `/api/transcribe`, which calls **Whisper**
  (`whisper-large-v3` on Groq by default).
- Speakers are labeled by **track identity** (whose mic produced the chunk) —
  reliable for a two-person interview, no diarization model needed.
- Segments are written to Postgres and streamed to the HR panel via
  **Supabase Realtime** (Postgres change subscriptions) — no custom WebSocket
  server required.

### End-of-interview AI decision
`POST /api/sessions/:id/evaluate` sends the full transcript, job title + JD,
the question list (with which were asked/skipped), HR flags/notes, and a
5-dimension rubric (communication, technical fit, culture fit, confidence,
clarity) to the LLM, and stores structured JSON:

```jsonc
{
  "decision": "HIRE" | "HOLD" | "REJECT",
  "overall_score": 0-100,
  "dimension_scores": { "communication": { "score": 0-100, "reasoning": "…" }, /* … */ },
  "hire_rationale": "…",
  "strengths": ["…"],
  "gaps": ["…"],
  "candidate_feedback": "…",
  "improvement_suggestions": ["…"]
}
```

### HR report page (`/r/:reportToken`)
Decision badge (green/amber/red), score-breakdown bar chart, per-dimension
reasoning, strengths/gaps, candidate feedback, and **Export PDF** (native
print-to-PDF). Shareable via its secret URL.

---

## Architecture

```
        Browser (HR)                    Browser (Candidate)
        /interview/:id                  /join/:candidateToken
             │  video/audio                  │  video/audio
             ▼                               ▼
        ┌─────────────────────────────────────────┐
        │          LiveKit room (WebRTC)          │   token minted by
        └─────────────────────────────────────────┘   POST /api/livekit/token
             │                               │
             │ ~5s mic chunks                │ ~5s mic chunks
             ▼                               ▼
        POST /api/transcribe ──► Whisper (Groq) ──► Postgres (TranscriptSegment)
                                                          │
                              Supabase Realtime ◄─────────┘
                                     │  (Postgres change subscription)
                                     ▼
                         HR panel — live transcript feed
                                     │
                       >3s candidate silence detected
                                     ▼
                  POST /api/sessions/:id/followup ──► LLM ──► suggestion chip

  End interview:
   POST /api/sessions/:id/evaluate ──► LLM (rubric + transcript + flags)
                                          │
                                          ▼
                              Postgres (EvaluationResult)
                                          │
                                          ▼
                          /r/:reportToken  (shareable report + PDF)
```

**Key design decisions**

| Concern | Approach |
| --- | --- |
| Video/audio | LiveKit rooms; the server mints short-lived access tokens per participant. |
| Speaker attribution | Each browser records only its own mic, so the track identity *is* the speaker — no diarization model. |
| Live updates | Supabase Realtime on the `TranscriptSegment` table; the app never runs its own WebSocket server. |
| Auth | Supabase Auth (email/password) for HR. Candidates and report viewers authenticate via unguessable secret tokens (`candidateToken`, `reportToken`). |
| AI providers | All LLM/Whisper calls go through OpenAI-compatible endpoints, so Groq, OpenAI, Ollama, or any self-hosted server are drop-in swaps via env vars. |
| DB access | Prisma for schema + queries; the Supabase service-role client is used server-side where RLS must be bypassed (e.g. writing transcript segments). |

---

## Data model (schema)

Defined in [`prisma/schema.prisma`](prisma/schema.prisma); the equivalent raw
DDL lives in [`supabase/setup.sql`](supabase/setup.sql).

```
User 1 ──── * Session 1 ──── * Question
                    │ 1
                    ├──── * Participant        (HR | CANDIDATE)
                    ├──── * TranscriptSegment
                    ├──── * Flag
                    └──── 1 EvaluationResult   (one per session)
```

| Model | Purpose | Notable fields |
| --- | --- | --- |
| `User` | HR user; mirrors a Supabase Auth user | `authUserId` (→ `auth.users.id`), `email` |
| `Session` | One interview | `status` (`DRAFT`/`LIVE`/`ENDED`), `roomName` (LiveKit), `candidateToken` + `reportToken` (secret links), `durationMinutes`, `startedAt`/`endedAt` |
| `Participant` | Person in a session | `role` (`HR`/`CANDIDATE`), `identity` (LiveKit), `joinedAt` |
| `Question` | Ordered question list | `order`, `status` (`PENDING`/`ASKED`/`SKIPPED`), `note`, `askedAt` |
| `TranscriptSegment` | One transcribed audio chunk | `speakerRole`, `speakerName`, `text`, `startMs`/`endMs` (offset from session start) |
| `Flag` | HR bookmark on the timeline | `label`, `timestampMs` |
| `EvaluationResult` | Final AI decision (1:1 with session) | `decision` (`HIRE`/`HOLD`/`REJECT`), `overallScore`, `dimensionScores` (JSON), `strengths[]`, `gaps[]`, `rawModelOutput` (audit) |

All child rows cascade-delete with their `Session`; sessions cascade-delete
with their owning `User`.

---

## API reference

All routes are Next.js App Router handlers under `src/app/api/`. HR routes
require a Supabase Auth session; candidate/report access is token-based.

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `POST /api/sessions` | HR | Create an interview (job title, JD, questions, duration). |
| `GET /api/sessions/:id` | HR / token | Fetch session details. |
| `PATCH /api/sessions/:id` | HR | Update status (start / end), etc. |
| `POST /api/livekit/token` | HR / candidate token | Mint a LiveKit room access token. |
| `POST /api/questions/generate` | HR | Generate 3–15 interview questions from a JD via the LLM. |
| `PATCH /api/questions/:id` | HR | Mark asked/skipped, attach a note. |
| `POST /api/transcribe` | participant | Transcribe a ~5 s audio chunk → `TranscriptSegment`. |
| `GET /api/sessions/:id/transcript` | HR | Fetch the full transcript. |
| `POST /api/sessions/:id/followup` | HR | Ask the LLM for one probing follow-up question. |
| `POST /api/sessions/:id/flags` | HR | Bookmark a transcript timestamp. |
| `POST /api/sessions/:id/evaluate` | HR | Run the final rubric evaluation → `EvaluationResult`. |

---

## Environment variables

Copy [`.env.example`](.env.example) to `.env` and fill in the values.
`NEXT_PUBLIC_*` variables are exposed to the browser — never put secrets in
them. Everything else is server-only.

### Supabase (Dashboard → Project Settings → API)

| Variable | Required | Secret | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | – | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | – | Anon/public API key (RLS-limited). |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 🔒 | Service-role key; bypasses RLS. Server-only. |

### Database (Dashboard → Project Settings → Database)

| Variable | Required | Secret | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✅ | 🔒 | Pooled Postgres connection (port 6543, `?pgbouncer=true`) — used at runtime. |
| `DIRECT_URL` | ✅ | 🔒 | Direct connection (port 5432) — used by Prisma migrate / `db push`. |

### LiveKit (cloud.livekit.io → Settings → Keys, or self-hosted)

| Variable | Required | Secret | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_LIVEKIT_URL` | ✅ | – | LiveKit WebSocket URL (`wss://…`). |
| `LIVEKIT_API_KEY` | ✅ | 🔒 | Server-side key for minting room tokens. |
| `LIVEKIT_API_SECRET` | ✅ | 🔒 | Server-side secret for minting room tokens. |

### LLM — any OpenAI-compatible endpoint (console.groq.com for a free key)

| Variable | Required | Secret | Default | Description |
| --- | --- | --- | --- | --- |
| `LLM_API_KEY` | ✅ | 🔒 | – | API key for the chat-completions endpoint. |
| `LLM_API_URL` | optional | – | `https://api.groq.com/openai/v1` | Base URL (Groq, OpenAI, Ollama…). |
| `LLM_MODEL` | optional | – | `llama-3.3-70b-versatile` | Chat model ID. |

### Whisper — any OpenAI-compatible `/audio/transcriptions` endpoint

| Variable | Required | Secret | Default | Description |
| --- | --- | --- | --- | --- |
| `WHISPER_API_KEY` | optional | 🔒 | falls back to `LLM_API_KEY` | Key for the transcription endpoint. |
| `WHISPER_API_URL` | optional | – | `https://api.groq.com/openai/v1` | Base URL. |
| `WHISPER_MODEL` | optional | – | `whisper-large-v3` | Speech-to-text model ID. |

> **Minimum viable `.env`:** the three Supabase values, the two database URLs,
> the three LiveKit values, and `LLM_API_KEY` — nine variables. Everything
> else has sensible Groq defaults.

---

## Getting started (end to end)

### Prerequisites (all free tiers / open source)
- **Node.js 20+**
- A **Supabase** project — <https://supabase.com> (or self-hosted)
- A **LiveKit** project — <https://cloud.livekit.io> (or self-hosted)
- A **Groq** API key — <https://console.groq.com> (LLM + Whisper)

### 1. Install

```bash
npm install            # also runs `prisma generate` via postinstall
cp .env.example .env   # then fill in the values (see table above)
```

### 2. Create the database schema

Either push via Prisma:

```bash
npm run db:push
```

…or paste [`supabase/setup.sql`](supabase/setup.sql) into the Supabase SQL
Editor and run it — it is idempotent and creates the full schema **plus** the
Realtime and Storage wiring (in which case skip step 3).

### 3. Wire up Realtime + Storage

If you used `db:push`, run sections 2 & 3 of
[`supabase/setup.sql`](supabase/setup.sql) in the Supabase SQL Editor. They
add `TranscriptSegment` to the Realtime publication (live transcript feed)
and create the `interview-media` storage bucket.

### 4. Configure auth for local dev

Supabase → Authentication → Providers → Email → turn **off** “Confirm email”
so HR sign-up logs in immediately. (Leave it **on** in production and
configure SMTP.)

### 5. Run

```bash
npm run dev
# → http://localhost:3000
```

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server. |
| `npm run build` | `prisma generate` + production build. |
| `npm start` | Serve the production build. |
| `npm run lint` | ESLint. |
| `npm run db:push` | Push the Prisma schema to the database (no migration files). |
| `npm run db:migrate` | Create/apply a dev migration. |
| `npm run db:studio` | Open Prisma Studio (DB browser). |

---

## Usage walkthrough

1. **Sign up** as an HR user at `/signup`, or **log in** at `/login`.
2. **Create an interview** from the dashboard — job title, JD, questions
   (write them or click **Generate with AI**), optional duration.
3. You land in the **HR room**. Click **Candidate link** to copy the secret
   join URL and send it to the candidate.
4. The candidate opens `/join/:candidateToken`, clicks **Join interview**, and
   grants camera/mic access — no account needed.
5. Run the interview: mark questions asked/skipped, watch the live transcript,
   accept or dismiss AI follow-up chips, flag notable moments.
6. Click **End & evaluate** → the AI report is generated and you're taken to
   `/r/:reportToken`. Share that link with stakeholders or **Export PDF**.

---

## Self-hosting / going fully open source

Every third-party dependency is swappable via environment variables:

| Service | Cloud default | Self-hosted swap |
| --- | --- | --- |
| Supabase | supabase.com | Self-hosted Supabase — point `NEXT_PUBLIC_SUPABASE_URL`, keys, and `DATABASE_URL`/`DIRECT_URL` at your instance. |
| LiveKit | cloud.livekit.io | Official LiveKit Docker image — set `NEXT_PUBLIC_LIVEKIT_URL` + key/secret. |
| LLM | Groq | Ollama: `LLM_API_URL=http://localhost:11434/v1`, `LLM_MODEL=llama3.3` (any OpenAI-compatible server works). |
| Whisper | Groq | A self-hosted faster-whisper server with an OpenAI-compatible API — set `WHISPER_API_URL` / `WHISPER_MODEL`. |

With all four swapped, the stack runs 100 % offline.

---

## Project layout

```
prisma/schema.prisma            Data model (source of truth)
supabase/setup.sql              One-shot DDL + Realtime + Storage wiring
src/middleware.ts               Supabase auth session refresh
src/lib/
  prisma.ts                     Prisma client singleton
  supabase/                     Browser / server / service-role clients
  auth.ts                       Current-user helper (Supabase → User row)
  livekit.ts                    Room token minting
  llm.ts                        OpenAI-compatible chat completions
  transcribe.ts                 OpenAI-compatible Whisper transcription
  rubric.ts                     5-dimension evaluation rubric + prompt
src/app/api/                    sessions, livekit/token, questions(+generate),
                                transcribe, followup, flags, transcript, evaluate
src/app/                        landing, login, signup, dashboard,
                                interview (HR room), join (candidate), r (report)
src/components/interview/       LiveKit room UI + transcription/silence hooks
src/components/report/          Score chart, PDF export, share link
```

---

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Live transcript never appears | `TranscriptSegment` not in the Realtime publication — run section 2 of `supabase/setup.sql`. |
| `PrismaClientInitializationError` / P1001 | Wrong `DATABASE_URL`/`DIRECT_URL`; check the pooler host, port (6543 vs 5432), and password. |
| Video room won't connect | `NEXT_PUBLIC_LIVEKIT_URL` must be the `wss://` URL; key/secret must match the same LiveKit project. |
| 401 from `/api/transcribe` or LLM routes | Missing/invalid `LLM_API_KEY` (Whisper falls back to it when `WHISPER_API_KEY` is unset). |
| Sign-up doesn't log in locally | Email confirmation is on — disable it in Supabase Auth settings for dev. |

---

## License

MIT — see [`package.json`](package.json).
