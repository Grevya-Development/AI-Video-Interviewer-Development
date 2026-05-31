// Scoring rubric shared between the evaluation prompt and the report UI.

export const RUBRIC_DIMENSIONS = [
  {
    key: "communication",
    label: "Communication",
    description: "Clarity of expression, structure, and listening.",
  },
  {
    key: "technical_fit",
    label: "Technical Fit",
    description: "Depth and relevance of skills for the role.",
  },
  {
    key: "culture_fit",
    label: "Culture Fit",
    description: "Alignment with values, collaboration, and motivation.",
  },
  {
    key: "confidence",
    label: "Confidence",
    description: "Composure, ownership, and conviction in answers.",
  },
  {
    key: "clarity",
    label: "Clarity",
    description: "Concise, well-organized, easy-to-follow responses.",
  },
] as const;

export type DimensionKey = (typeof RUBRIC_DIMENSIONS)[number]["key"];

export interface DimensionScore {
  score: number; // 0–100
  reasoning: string;
}

export type DimensionScores = Record<DimensionKey, DimensionScore>;

export interface EvaluationPayload {
  decision: "HIRE" | "HOLD" | "REJECT";
  overall_score: number;
  dimension_scores: DimensionScores;
  hire_rationale: string;
  strengths: string[];
  gaps: string[];
  candidate_feedback: string;
  improvement_suggestions: string[];
}
