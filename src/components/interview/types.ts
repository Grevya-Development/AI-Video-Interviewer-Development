export type Role = "HR" | "CANDIDATE";

export interface QuestionDTO {
  id: string;
  text: string;
  order: number;
  status: "PENDING" | "ASKED" | "SKIPPED";
  note: string | null;
}

export interface TranscriptSegmentDTO {
  id: string;
  speakerRole: Role;
  speakerName: string;
  text: string;
  startMs: number;
  endMs: number;
}

export interface FlagDTO {
  id: string;
  label: string | null;
  timestampMs: number;
}

export interface TokenResponse {
  token: string;
  url: string;
  roomName: string;
  identity: string;
  role: Role;
}
