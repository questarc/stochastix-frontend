import { Order } from './order';

export interface ChatRequest {
  message: string;
  thread_id: string;
  provider: string;
  model: string | null;
  account_id?: string | null;
  model_id?: string | null;
}

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  result: string;
}

export interface ChatResponse {
  text: string;
  tool_calls: ToolCall[];
  orders_added: number;
  orders: Order[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  toolCalls?: ToolCall[];
  ordersAdded?: number;
  error?: boolean;
}

export type ChatWindowSize = 'normal' | 'max' | 'min';
