import { SimulationRequest } from './simulation';

export interface TechnicalIndicatorVideoPoint {
  date: string;
  close: number;
  rsi: number;
  macd: number;
  macd_signal: number;
  bollinger_upper: number;
  bollinger_lower: number;
}

export interface TechnicalIndicatorVideoContext {
  kind: 'technical_indicators';
  title: string;
  data_label: string;
  latest_date: string;
  close: number;
  rsi: number;
  macd: number;
  macd_signal: number;
  bollinger_upper: number;
  bollinger_lower: number;
  series: TechnicalIndicatorVideoPoint[];
}

export interface VideoRequest extends Partial<SimulationRequest> {
  account_id?: string;
  include_rebalance?: boolean;
  page_context?: TechnicalIndicatorVideoContext;
}

export interface VideoInfo {
  video_id: string;
  account_id: string | null;
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
  account_id: string | null;
  status: 'queued' | 'rendering' | 'done' | 'error';
  progress: number;
  message: string;
  video: VideoInfo | null;
}
