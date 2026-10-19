export type DateFormatOutput = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
export type BankExportFormat = 'csv' | 'xlsx' | 'qif';

export interface BankTransaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
  balance?: number;
  reference?: string;
}

export interface BankStatementConverterOptions {
  dateFormatOutput: DateFormatOutput;
  exportFormat: BankExportFormat;
  autoDetectColumns: boolean;
  cleanMerchantDescriptions: boolean;
  stripPosCodes: boolean;
  invertAmountSigns: boolean;
}

export interface StatementSummary {
  transactionCount: number;
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  startDate: string;
  endDate: string;
}

export interface BankStatementConverterResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  transactions: BankTransaction[];
  summary: StatementSummary;
  formattedText?: string;
  metadata?: {
    format: BankExportFormat;
    detectedSourceType: 'csv' | 'ofx_qfx' | 'excel';
    originalRowCount: number;
  };
}
