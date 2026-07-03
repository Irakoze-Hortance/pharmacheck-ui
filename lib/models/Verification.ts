import mongoose, { Schema, Document } from 'mongoose';

interface TopMatch {
  filename: string;
  split: string;
  labels: {
    authentic: number;
    counterfeit: number;
  };
  similarity_score: number;
}

export interface IVerification extends Document {
  observation_id: string;
  timestamp: Date;
  query_filename: string;
  best_match_filename: string;
  best_match_split: string;
  best_match_labels: {
    authentic: number;
    counterfeit: number;
  };
  similarity_score: number;
  top_5_matches: TopMatch[];
  verdict: 'authentic' | 'counterfeit';
  confidence: number;
  prob_authentic: number;
  prob_counterfeit: number;
  inference_ms: number;
  model_version: string;
  inspector_id: string;
  createdAt: Date;
  updatedAt: Date;
}

const TopMatchSchema = new Schema<TopMatch>(
  {
    filename:         { type: String, required: true },
    split:            { type: String, required: true },
    labels: {
      authentic:   { type: Number, required: true },
      counterfeit: { type: Number, required: true },
    },
    similarity_score: { type: Number, required: true },
  },
  { _id: false }
);

const VerificationSchema = new Schema<IVerification>(
  {
    observation_id:      { type: String, required: true, unique: true, index: true },
    timestamp:           { type: Date,   required: true },
    query_filename:      { type: String, required: true },
    best_match_filename: { type: String, required: true },
    best_match_split:    { type: String, required: true },
    best_match_labels: {
      authentic:   { type: Number, required: true },
      counterfeit: { type: Number, required: true },
    },
    similarity_score:  { type: Number, required: true, min: 0, max: 1 },
    top_5_matches:     { type: [TopMatchSchema], default: [] },
    verdict:           { type: String, enum: ['authentic', 'counterfeit'], required: true },
    confidence:        { type: Number, required: true, min: 0, max: 1 },
    prob_authentic:    { type: Number, required: true, min: 0, max: 1 },
    prob_counterfeit:  { type: Number, required: true, min: 0, max: 1 },
    inference_ms:      { type: Number, required: true },
    model_version:     { type: String, required: true },
    inspector_id:      { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'observations', // ← explicitly target the observations collection
  }
);

export default mongoose.models.Observation ||
  mongoose.model<IVerification>('Observation', VerificationSchema);