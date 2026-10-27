import { SimulationRequest } from './simulation';

export interface VideoRequest extends SimulationRequest {
  include_rebalance: boolean;
}

export interface VideoInfo {
  video_id: string;
  account_id: string;
  client_name: string;
  duration_seconds: number;
  scenes: string[];
  created_at: string;
  file_name: string;
  size_bytes: number;
  url: string;
}

export interface VideoJob {
  job_id: string;
  account_id: string;
  status: 'queued' | 'rendering' | 'done' | 'error';
  progress: number;
  message: string;
  video: VideoInfo | null;
}
