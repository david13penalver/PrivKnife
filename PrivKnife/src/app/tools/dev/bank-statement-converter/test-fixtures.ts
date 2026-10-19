import { BankStatementConverterOptions } from './types';

export const DEFAULT_CONVERTER_OPTIONS: BankStatementConverterOptions = {
  dateFormatOutput: 'YYYY-MM-DD',
  exportFormat: 'csv',
  autoDetectColumns: true,
  cleanMerchantDescriptions: true,
  stripPosCodes: true,
  invertAmountSigns: false,
};

export const XLSX_CONVERTER_OPTIONS: BankStatementConverterOptions = {
  dateFormatOutput: 'MM/DD/YYYY',
  exportFormat: 'xlsx',
  autoDetectColumns: true,
  cleanMerchantDescriptions: true,
  stripPosCodes: true,
  invertAmountSigns: false,
};

export const QIF_CONVERTER_OPTIONS: BankStatementConverterOptions = {
  dateFormatOutput: 'YYYY-MM-DD',
  exportFormat: 'qif',
  autoDetectColumns: true,
  cleanMerchantDescriptions: false,
  stripPosCodes: false,
  invertAmountSigns: false,
};

export const SAMPLE_BANK_CSV = `Posting Date,Transaction Description,Debit,Credit,Balance
10/14/2026,WHOLEFDS SFO 10424 SAN FRANCISCO CA POS CARD 8812,48.50,,4120.50
10/15/2026,PAYROLL DIRECT DEP ACME CORP,,2500.00,6620.50
10/16/2026,STARBUCKS STORE #04812 SEATTLE WA 10/16,5.75,,6614.75
10/17/2026,AMZN Mktp US*9A214 SEATTLE WA,32.40,,6582.35`;

export const SAMPLE_DUAL_AMOUNT_CSV = `Date,Merchant,Amount
2026-10-14,Netflix Subscription,-15.99
2026-10-15,Consulting Invoice,1200.00
2026-10-16,Uber Trip San Francisco,-24.50`;

export const SAMPLE_OFX_CONTENT = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>USD
<BANKTRANLIST>
<DTSTART>20261001
<DTEND>20261017
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261014120000
<TRNAMT>-48.50
<FITID>20261014001
<NAME>WHOLEFDS SFO 10424
<MEMO>GROCERIES
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261015120000
<TRNAMT>2500.00
<FITID>20261015002
<NAME>PAYROLL ACME CORP
<MEMO>SALARY
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

export function createSyntheticBankCsvFile(
  name: string = 'chase-statement.csv',
  content: string = SAMPLE_BANK_CSV
): File {
  return new File([content], name, { type: 'text/csv' });
}

export function createSyntheticOfxFile(
  name: string = 'account-statement.ofx',
  content: string = SAMPLE_OFX_CONTENT
): File {
  return new File([content], name, { type: 'application/x-ofx' });
}
