import { describe, it, expect } from 'vitest';
import {
  validateConverterOptions,
  cleanMerchantName,
  parseOfxContent,
  parseCsvContent,
  buildCsvExport,
  buildQifExport,
  calculateSummary,
  processBankStatement,
} from './engine';
import {
  DEFAULT_CONVERTER_OPTIONS,
  XLSX_CONVERTER_OPTIONS,
  QIF_CONVERTER_OPTIONS,
  SAMPLE_BANK_CSV,
  SAMPLE_DUAL_AMOUNT_CSV,
  SAMPLE_OFX_CONTENT,
  createSyntheticBankCsvFile,
  createSyntheticOfxFile,
} from './test-fixtures';
import { BankStatementConverterOptions } from './types';

describe('Bank Statement CSV & OFX Converter Engine (Seam 1)', () => {
  describe('Parameter Validation & Guardrails', () => {
    it('should validate default options successfully', () => {
      const res = validateConverterOptions(DEFAULT_CONVERTER_OPTIONS);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('should reject null or undefined options', () => {
      const res = validateConverterOptions(
        null as unknown as BankStatementConverterOptions
      );
      expect(res.valid).toBe(false);
      expect(res.error).toContain('required');
    });

    it('should reject unsupported date formats', () => {
      const invalid = {
        ...DEFAULT_CONVERTER_OPTIONS,
        dateFormatOutput: 'YYYY/MM' as any,
      };
      const res = validateConverterOptions(invalid);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('date format');
    });

    it('should reject unsupported export formats', () => {
      const invalid = {
        ...DEFAULT_CONVERTER_OPTIONS,
        exportFormat: 'pdf' as any,
      };
      const res = validateConverterOptions(invalid);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('export format');
    });
  });

  describe('Merchant Name Normalization & POS Code Cleaning', () => {
    it('should strip POS card auth codes and trailing locations', () => {
      const raw = 'WHOLEFDS SFO 10424 SAN FRANCISCO CA POS CARD 8812';
      const cleaned = cleanMerchantName(raw, true);
      expect(cleaned).not.toContain('POS CARD 8812');
      expect(cleaned).toContain('WHOLEFDS');
    });

    it('should clean store numbers and location suffixes', () => {
      const raw = 'STARBUCKS STORE #04812 SEATTLE WA 10/16';
      const cleaned = cleanMerchantName(raw, true);
      expect(cleaned).not.toContain('10/16');
      expect(cleaned).toContain('STARBUCKS');
    });
  });

  describe('OFX / QFX Parsing', () => {
    it('should parse standard OFX SGML tags into structured transactions', () => {
      const txs = parseOfxContent(SAMPLE_OFX_CONTENT);
      expect(txs.length).toBe(2);

      expect(txs[0].amount).toBe(-48.50);
      expect(txs[0].description).toContain('WHOLEFDS');
      expect(txs[0].date).toBe('2026-10-14');

      expect(txs[1].amount).toBe(2500.00);
      expect(txs[1].description).toContain('PAYROLL');
      expect(txs[1].date).toBe('2026-10-15');
    });

    it('should apply merchant cleaning, POS code stripping, and sign inversion to OFX (DEFECT-50-02)', async () => {
      const customOfx = `<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261014120000
<TRNAMT>-48.50
<NAME>WHOLEFDS SFO POS CARD 8812
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

      const result = await processBankStatement(
        customOfx,
        {
          ...DEFAULT_CONVERTER_OPTIONS,
          cleanMerchantDescriptions: true,
          stripPosCodes: true,
          invertAmountSigns: true,
        },
        'account.ofx'
      );

      expect(result.transactions.length).toBe(1);
      expect(result.transactions[0].description).toBe('WHOLEFDS SFO');
      expect(result.transactions[0].amount).toBe(48.5);
    });
  });

  describe('CSV Bank Statement Parsing', () => {
    it('should parse multi-column statement with separate Debit and Credit columns', () => {
      const txs = parseCsvContent(SAMPLE_BANK_CSV, DEFAULT_CONVERTER_OPTIONS);
      expect(txs.length).toBe(4);

      expect(txs[0].amount).toBe(-48.50);
      expect(txs[1].amount).toBe(2500.00);
      expect(txs[2].amount).toBe(-5.75);
    });

    it('should parse single Amount column CSV', () => {
      const txs = parseCsvContent(SAMPLE_DUAL_AMOUNT_CSV, DEFAULT_CONVERTER_OPTIONS);
      expect(txs.length).toBe(3);
      expect(txs[0].amount).toBe(-15.99);
      expect(txs[1].amount).toBe(1200.00);
      expect(txs[2].amount).toBe(-24.50);
    });
  });

  describe('Deliverable Builders (CSV, QIF, XLSX)', () => {
    const mockTxs = [
      {
        date: '2026-10-14',
        description: 'Office Depot',
        amount: -45.00,
        category: 'Supplies',
        balance: 1200.00,
      },
      {
        date: '2026-10-15',
        description: 'Client Deposit',
        amount: 500.00,
        category: 'Income',
        balance: 1700.00,
      },
    ];

    it('should build standardized CSV deliverable', () => {
      const csv = buildCsvExport(mockTxs);
      expect(csv).toContain('Date,Description,Amount,Category,Balance');
      expect(csv).toContain('2026-10-14,"Office Depot",-45,"Supplies",1200');
    });

    it('should build Quicken QIF deliverable with proper record delimiters', () => {
      const qif = buildQifExport(mockTxs);
      expect(qif).toContain('!Type:Bank');
      expect(qif).toContain('D2026-10-14');
      expect(qif).toContain('T-45');
      expect(qif).toContain('POffice Depot');
      expect(qif).toContain('^');
    });
  });

  describe('Deliverable Export Serialization (processBankStatement)', () => {
    it('should process bank CSV into standardized CSV deliverable', async () => {
      const file = createSyntheticBankCsvFile();
      const result = await processBankStatement(
        file,
        DEFAULT_CONVERTER_OPTIONS,
        'chase.csv'
      );

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('chase-normalized.csv');
      expect(result.mimeType).toBe('text/csv');
      expect(result.transactions.length).toBe(4);
      expect(result.summary.transactionCount).toBe(4);
      expect(result.summary.totalIncome).toBe(2500);
    });

    it('should process OFX statement into Quicken QIF deliverable', async () => {
      const file = createSyntheticOfxFile();
      const result = await processBankStatement(
        file,
        QIF_CONVERTER_OPTIONS,
        'bank.ofx'
      );

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('bank-normalized.qif');
      expect(result.mimeType).toBe('application/qif');
      expect(result.transactions.length).toBe(2);
    });

    it('should process CSV into Excel XLSX deliverable and populate formattedText (DEFECT-50-03)', async () => {
      const file = createSyntheticBankCsvFile();
      const result = await processBankStatement(
        file,
        XLSX_CONVERTER_OPTIONS,
        'statement.csv'
      );

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('statement-normalized.xlsx');
      expect(result.mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(result.blob.size).toBeGreaterThan(500);
      expect(result.formattedText).toBeDefined();
      expect(result.formattedText).toContain('Date,Description,Amount');
    });
  });

  describe('Chronological Summary Date Ordering (DEFECT-50-04)', () => {
    it('should sort DD/MM/YYYY dates chronologically instead of lexicographically', () => {
      const txs = [
        { date: '15/10/2026', description: 'Oct Tx', amount: -20 },
        { date: '02/11/2026', description: 'Nov Tx', amount: -30 },
        { date: '01/01/2027', description: 'Jan Next Year', amount: 100 },
      ];

      const summary = calculateSummary(txs);
      expect(summary.startDate).toBe('15/10/2026');
      expect(summary.endDate).toBe('01/01/2027');
    });

    it('should sort MM/DD/YYYY dates chronologically across month and year boundaries', () => {
      const txs = [
        { date: '10/15/2026', description: 'Oct Tx', amount: -20 },
        { date: '11/02/2026', description: 'Nov Tx', amount: -30 },
        { date: '01/05/2027', description: 'Jan Next Year', amount: 100 },
      ];

      const summary = calculateSummary(txs);
      expect(summary.startDate).toBe('10/15/2026');
      expect(summary.endDate).toBe('01/05/2027');
    });
  });
});
