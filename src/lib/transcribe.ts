/**
 * Audio transcription via an OpenAI-compatible /audio/transcriptions endpoint.
 * Defaults to Groq's whisper-large-v3.
 *
 * Note on diarization: Groq Whisper does not return speaker labels. We label
 * speakers by the LiveKit track the chunk came from (the caller passes which
 * participant recorded it), which is reliable for a 2-person interview.
 */

const WHISPER_API_URL =
  process.env.WHISPER_API_URL ?? "https://api.groq.com/openai/v1";
const WHISPER_API_KEY =
  process.env.WHISPER_API_KEY ?? process.env.LLM_API_KEY ?? "";
const WHISPER_MODEL = process.env.WHISPER_MODEL ?? "whisper-large-v3";

export async function transcribeAudio(
  audio: Blob,
  filename = "chunk.webm",
): Promise<string> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", WHISPER_MODEL);
  form.append("response_format", "json");
  form.append("temperature", "0");

  const res = await fetch(`${WHISPER_API_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHISPER_API_KEY}`,
    },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Transcription failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  return (data.text ?? "").trim();
}
