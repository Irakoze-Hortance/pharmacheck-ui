export interface Stats {
  total_scans: number;
  authentic_count: number;
  counterfeit_count: number;
  authentic_rate_pct: number;
  counterfeit_rate_pct: number;
  avg_confidence: number;
  avg_inference_ms: number;
  avg_similarity_score: number;
  model_version?: string;
  [key: string]: unknown;
}

export interface Probabilities {
  authentic: number;
  counterfeit: number;
}

export interface HistoryItem {
  observation_id: string;
  timestamp: string;
  query_filename: string;
  best_match_filename: string;
  best_match_split: string;
  similarity_score: number;
  verdict: 'authentic' | 'counterfeit';
  confidence: number;
  probabilities: Probabilities;
  inference_ms: number;
  inspector_id: string | null;
}

export interface DayBucket {
  key: string;           // ISO date e.g. "2026-07-04"
  label: string;         // e.g. "Jul 4"
  authentic: number;
  counterfeit: number;
  total: number;
}

export type ChartFilter = 'all' | 'authentic' | 'counterfeit';
export type TableFilter = 'all' | 'authentic' | 'counterfeit';