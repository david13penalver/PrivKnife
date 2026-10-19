import { DiffCheckerOptions } from './types';

export const DEFAULT_DIFF_OPTIONS: DiffCheckerOptions = {
  viewMode: 'side_by_side',
  diffGranularity: 'word',
  ignoreWhitespace: false,
  ignoreCase: false,
  syntaxLanguage: 'javascript',
  syncScroll: true,
};

export const SAMPLE_CODE_ORIGINAL = `function calculateTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total = total + items[i].price;
  }
  return total;
}`;

export const SAMPLE_CODE_MODIFIED = `function calculateTotal(items: Item[]): number {
  const taxRate = 0.08;
  const subtotal = items.reduce((acc, item) => acc + item.price, 0);
  return subtotal * (1 + taxRate);
}`;

export const SAMPLE_CONTRACT_ORIGINAL = `Clause 4. Payment Terms
4.1 The Client shall pay all undisputed invoices within thirty (30) days from the invoice date.
4.2 Late payments shall incur interest at the rate of 1.5% per month.
4.3 Payment shall be made via wire transfer to Provider's designated bank account.`;

export const SAMPLE_CONTRACT_MODIFIED = `Clause 4. Payment Terms
4.1 The Client shall pay all undisputed invoices within fifteen (15) business days from the invoice date.
4.2 Late payments shall incur interest at the statutory rate of 2.0% per month or the legal maximum.
4.3 Payment shall be made via wire transfer or automated ACH to Provider's designated escrow account.
4.4 Early payment discount of 2% applies if settled within 5 days.`;
