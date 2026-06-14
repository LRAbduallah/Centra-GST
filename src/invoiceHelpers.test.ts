import { describe, it, expect } from 'vitest';
import { Profile } from './types';

// Extracted from InvoiceEditor.tsx — tested here as a pure function
function makeInvoiceNo(prof: Pick<Profile, 'invoicePrefix' | 'invoiceCounter' | 'invoiceFormat'>): string {
  const p = prof.invoicePrefix || '';
  const c = prof.invoiceCounter || 1;
  if (prof.invoiceFormat === 'YEAR_COUNTER') {
    return `${new Date().getFullYear()}/${String(c).padStart(4, '0')}`;
  }
  return `${p}${c}`;
}

describe('makeInvoiceNo()', () => {
  it('H1: PREFIX_COUNTER with prefix and counter', () => {
    const result = makeInvoiceNo({ invoicePrefix: 'INV', invoiceCounter: 5, invoiceFormat: 'PREFIX_COUNTER' });
    expect(result).toBe('INV5');
  });

  it('H2: YEAR_COUNTER pads to 4 digits', () => {
    const year = new Date().getFullYear();
    const result = makeInvoiceNo({ invoicePrefix: '', invoiceCounter: 7, invoiceFormat: 'YEAR_COUNTER' });
    expect(result).toBe(`${year}/0007`);
  });

  it('H3: empty prefix just returns counter as string', () => {
    const result = makeInvoiceNo({ invoicePrefix: '', invoiceCounter: 3, invoiceFormat: 'PREFIX_COUNTER' });
    expect(result).toBe('3');
  });

  it('H4: counter=1 (first invoice) generates correctly', () => {
    const result = makeInvoiceNo({ invoicePrefix: 'VIS', invoiceCounter: 1, invoiceFormat: 'PREFIX_COUNTER' });
    expect(result).toBe('VIS1');
  });

  it('H5: large counter value (1000+) is not truncated', () => {
    const result = makeInvoiceNo({ invoicePrefix: 'RC', invoiceCounter: 1042, invoiceFormat: 'PREFIX_COUNTER' });
    expect(result).toBe('RC1042');
    const resultYear = makeInvoiceNo({ invoicePrefix: '', invoiceCounter: 1042, invoiceFormat: 'YEAR_COUNTER' });
    expect(resultYear).toContain('1042');
  });
});
