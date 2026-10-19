import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  BankExportFormat,
  BankStatementConverterOptions,
  BankStatementConverterResult,
  BankTransaction,
  DateFormatOutput,
  StatementSummary,
} from './types';

// -------------------------------------------------------------
// 1. Validation Guardrails
// -------------------------------------------------------------
export function validateConverterOptions(
  options: BankStatementConverterOptions
): { valid: boolean; error?: string } {
  if (!options) {
    return { valid: false, error: 'Converter options are required' };
  }

  const validDateFormats = ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'];
  if (!validDateFormats.includes(options.dateFormatOutput)) {
    return {
      valid: false,
      error: `Unsupported date format: ${options.dateFormatOutput}`,
    };
  }

  const validExportFormats = ['csv', 'xlsx', 'qif'];
  if (!validExportFormats.includes(options.exportFormat)) {
    return {
      valid: false,
      error: `Unsupported export format: ${options.exportFormat}`,
    };
  }

  return { valid: true };
}

// -------------------------------------------------------------
// 2. Merchant Name Cleaning & Date Formatting
// -------------------------------------------------------------
export function cleanMerchantName(
  rawName: string,
  stripPos: boolean = true
): string {
  if (!rawName) return '';

  let name = rawName.trim();

  if (stripPos) {
    // Strip POS, CARD, AUTH codes, and timestamps at end
    name = name.replace(/\bPOS\s+(?:CARD|DEBIT|AUTH)?\s*\d*\b/gi, '');
    name = name.replace(/\bCARD\s+\d{4,}\b/gi, '');
    name = name.replace(/\bAUTH\s+\d+\b/gi, '');
    name = name.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, ''); // date stamp at end
    name = name.replace(/\bSTORE\s+#\d+\b/gi, (m) => m); // keep store number but clean
    name = name.replace(/\s{2,}/g, ' ').trim();
  }

  return name;
}

export function formatTransactionDate(
  rawDate: string,
  targetFormat: DateFormatOutput = 'YYYY-MM-DD'
): string {
  if (!rawDate) return '';

  let year = '';
  let month = '';
  let day = '';

  const clean = rawDate.trim();

  // 1. YYYYMMDD (OFX format)
  if (/^\d{8}/.test(clean)) {
    year = clean.substring(0, 4);
    month = clean.substring(4, 6);
    day = clean.substring(6, 8);
  }
  // 2. YYYY-MM-DD or YYYY/MM/DD
  else if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(clean)) {
    const parts = clean.split(/[-/.]/);
    year = parts[0];
    month = parts[1].padStart(2, '0');
    day = parts[2].substring(0, 2).padStart(2, '0');
  }
  // 3. MM/DD/YYYY or DD/MM/YYYY
  else if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(clean)) {
    const parts = clean.split(/[-/.]/);
    month = parts[0].padStart(2, '0');
    day = parts[1].padStart(2, '0');
    year = parts[2].length === 2 ? `20${parts[2]}` : parts[2].substring(0, 4);
  } else {
    return clean;
  }

  switch (targetFormat) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
    default:
      return `${year}-${month}-${day}`;
  }
}

// -------------------------------------------------------------
// 3. OFX / QFX Parsing Heuristics
// -------------------------------------------------------------
export function parseOfxContent(
  ofxText: string,
  targetDateFormat: DateFormatOutput = 'YYYY-MM-DD'
): BankTransaction[] {
  const transactions: BankTransaction[] = [];

  // Match all <STMTTRN>...</STMTTRN> blocks
  const trnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = trnRegex.exec(ofxText)) !== null) {
    const block = match[1];

    const dtMatch = /<DTPOSTED>([0-9]{8})/i.exec(block);
    const amtMatch = /<TRNAMT>([+-]?[0-9.]+)/i.exec(block);
    const nameMatch = /<NAME>([^<\r\n]+)/i.exec(block);
    const memoMatch = /<MEMO>([^<\r\n]+)/i.exec(block);

    if (dtMatch && amtMatch) {
      const date = formatTransactionDate(dtMatch[1], targetDateFormat);
      const amount = parseFloat(amtMatch[1]);
      const description = nameMatch ? nameMatch[1].trim() : 'Transaction';
      const category = memoMatch ? memoMatch[1].trim() : undefined;

      transactions.push({
        date,
        description,
        amount,
        category,
      });
    }
  }

  return transactions;
}

// -------------------------------------------------------------
// 4. CSV Statement Parsing Heuristics
// -------------------------------------------------------------
export function parseCsvContent(
  csvText: string,
  options: BankStatementConverterOptions
): BankTransaction[] {
  const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  if (!parsed.data || parsed.data.length === 0) {
    return [];
  }

  const rows = parsed.data;
  const headers = parsed.meta.fields || Object.keys(rows[0]);

  // Identify column roles
  let dateCol = headers.find((h) =>
    /date|fecha|datum|posting/i.test(h)
  );
  let descCol = headers.find((h) =>
    /desc|payee|merchant|details|concepto|narrative|memo|name/i.test(h)
  );
  let amountCol = headers.find((h) =>
    /amount|importe|betrag|total/i.test(h)
  );
  let debitCol = headers.find((h) =>
    /debit|money out|cargo|gasto|withdraw/i.test(h)
  );
  let creditCol = headers.find((h) =>
    /credit|money in|abono|ingreso|deposit/i.test(h)
  );
  let balanceCol = headers.find((h) =>
    /balance|saldo/i.test(h)
  );
  let categoryCol = headers.find((h) =>
    /category|categoria|type/i.test(h)
  );

  // Fallbacks if not auto-detected
  if (!dateCol && headers.length > 0) dateCol = headers[0];
  if (!descCol && headers.length > 1) descCol = headers[1];

  const transactions: BankTransaction[] = [];

  for (const row of rows) {
    const rawDate = dateCol ? row[dateCol] : '';
    if (!rawDate) continue;

    const date = formatTransactionDate(rawDate, options.dateFormatOutput);

    let rawDesc = descCol ? row[descCol] : 'Transaction';
    if (options.cleanMerchantDescriptions) {
      rawDesc = cleanMerchantName(rawDesc, options.stripPosCodes);
    }

    let amount = 0;
    if (debitCol && creditCol) {
      const debitVal = parseFloat((row[debitCol] || '0').replace(/[^0-9.-]/g, '')) || 0;
      const creditVal = parseFloat((row[creditCol] || '0').replace(/[^0-9.-]/g, '')) || 0;

      if (creditVal > 0) {
        amount = creditVal;
      } else if (debitVal > 0) {
        amount = -debitVal;
      } else {
        amount = 0;
      }
    } else if (amountCol) {
      const rawAmt = (row[amountCol] || '0').replace(/[^0-9.-]/g, '');
      amount = parseFloat(rawAmt) || 0;
    }

    if (options.invertAmountSigns) {
      amount = -amount;
    }

    let balance: number | undefined;
    if (balanceCol && row[balanceCol]) {
      const rawBal = row[balanceCol].replace(/[^0-9.-]/g, '');
      balance = parseFloat(rawBal) || undefined;
    }

    const category = categoryCol ? row[categoryCol] : undefined;

    transactions.push({
      date,
      description: rawDesc,
      amount,
      balance,
      category,
    });
  }

  return transactions;
}

// -------------------------------------------------------------
// 5. Deliverable Package Builders (CSV, QIF, XLSX)
// -------------------------------------------------------------
export function buildCsvExport(transactions: BankTransaction[]): string {
  const headers = ['Date', 'Description', 'Amount', 'Category', 'Balance'];
  const rows = transactions.map((t) => [
    t.date,
    `"${t.description.replace(/"/g, '""')}"`,
    t.amount,
    t.category ? `"${t.category.replace(/"/g, '""')}"` : '',
    t.balance !== undefined ? t.balance : '',
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function buildQifExport(transactions: BankTransaction[]): string {
  const lines: string[] = ['!Type:Bank'];

  for (const t of transactions) {
    lines.push(`D${t.date}`);
    lines.push(`T${t.amount}`);
    lines.push(`P${t.description}`);
    if (t.category) {
      lines.push(`L${t.category}`);
    }
    lines.push('^');
  }

  return lines.join('\n');
}

export function buildXlsxExport(
  transactions: BankTransaction[],
  summary: StatementSummary
): Blob {
  const wb = XLSX.utils.book_new();

  // Transactions Sheet
  const txData = [
    ['Date', 'Description', 'Amount', 'Category', 'Balance'],
    ...transactions.map((t) => [
      t.date,
      t.description,
      t.amount,
      t.category || '',
      t.balance !== undefined ? t.balance : '',
    ]),
  ];
  const wsTx = XLSX.utils.aoa_to_sheet(txData);
  XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions');

  // Summary Sheet
  const summaryData = [
    ['Metric', 'Value'],
    ['Total Transactions', summary.transactionCount],
    ['Total Income', summary.totalIncome],
    ['Total Expense', summary.totalExpense],
    ['Net Cashflow', summary.netFlow],
    ['Start Date', summary.startDate],
    ['End Date', summary.endDate],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// -------------------------------------------------------------
// 6. Summary Calculator
// -------------------------------------------------------------
export function calculateSummary(
  transactions: BankTransaction[]
): StatementSummary {
  let income = 0;
  let expense = 0;

  for (const t of transactions) {
    if (t.amount > 0) {
      income += t.amount;
    } else {
      expense += Math.abs(t.amount);
    }
  }

  const dates = transactions.map((t) => t.date).filter(Boolean).sort();
  const startDate = dates.length > 0 ? dates[0] : '';
  const endDate = dates.length > 0 ? dates[dates.length - 1] : '';

  return {
    transactionCount: transactions.length,
    totalIncome: Number(income.toFixed(2)),
    totalExpense: Number(expense.toFixed(2)),
    netFlow: Number((income - expense).toFixed(2)),
    startDate,
    endDate,
  };
}

// -------------------------------------------------------------
// 7. Statement Processing Pipeline
// -------------------------------------------------------------
export async function processBankStatement(
  source: File | Blob | string,
  options: BankStatementConverterOptions,
  originalFileName: string = 'statement.csv'
): Promise<BankStatementConverterResult> {
  const validation = validateConverterOptions(options);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid converter options');
  }

  let textContent = '';
  if (typeof source === 'string') {
    textContent = source;
  } else {
    textContent = await source.text();
  }

  const isOfx =
    originalFileName.toLowerCase().endsWith('.ofx') ||
    originalFileName.toLowerCase().endsWith('.qfx') ||
    /<OFX>|<STMTTRN>/i.test(textContent);

  let transactions: BankTransaction[] = [];
  if (isOfx) {
    transactions = parseOfxContent(textContent, options.dateFormatOutput);
  } else {
    transactions = parseCsvContent(textContent, options);
  }

  const summary = calculateSummary(transactions);
  const baseName = originalFileName.replace(/\.[^/.]+$/, '');

  let deliverableBlob: Blob;
  let outFileName: string;
  let mimeType: string;
  let formattedText: string | undefined;

  switch (options.exportFormat) {
    case 'qif':
      formattedText = buildQifExport(transactions);
      deliverableBlob = new Blob([formattedText], { type: 'application/qif' });
      outFileName = `${baseName}-normalized.qif`;
      mimeType = 'application/qif';
      break;

    case 'xlsx':
      deliverableBlob = buildXlsxExport(transactions, summary);
      outFileName = `${baseName}-normalized.xlsx`;
      mimeType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      break;

    case 'csv':
    default:
      formattedText = buildCsvExport(transactions);
      deliverableBlob = new Blob([formattedText], { type: 'text/csv' });
      outFileName = `${baseName}-normalized.csv`;
      mimeType = 'text/csv';
      break;
  }

  return {
    success: true,
    blob: deliverableBlob,
    fileName: outFileName,
    fileSize: deliverableBlob.size,
    mimeType,
    transactions,
    summary,
    formattedText,
    metadata: {
      format: options.exportFormat,
      detectedSourceType: isOfx ? 'ofx_qfx' : 'csv',
      originalRowCount: transactions.length,
    },
  };
}
