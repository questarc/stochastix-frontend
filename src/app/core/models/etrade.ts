export interface EtradeStatement {
  filename: string;
  page_count: number;
  text: string;
  character_count: number;
  imported_at: string;
  document_type: 'transfer_activity' | 'statement_text';
  transactions: EtradeTransaction[];
  summary: EtradeTransferSummary | null;
}

export interface EtradeTransaction {
  date: string;
  type: string;
  amount: number;
  status: string;
}

export interface EtradeTransferSummary {
  transaction_count: number;
  total_amount: number;
  completed_amount: number;
  scheduled_amount: number;
}
