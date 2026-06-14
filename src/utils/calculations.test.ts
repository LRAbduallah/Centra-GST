import { describe, it, expect } from 'vitest';
import { calcLine, calcTotals } from './calculations';

// ─────────────────────────────────────────────
// calcLine()
// ─────────────────────────────────────────────
describe('calcLine()', () => {
  it('U1: basic rate + 18% GST', () => {
    const r = calcLine({ qty: 1, netRate: 100, gstPct: 18 }, 18);
    expect(r.gstAmt).toBeCloseTo(18);
    expect(r.rate).toBeCloseTo(118);
    expect(r.amount).toBeCloseTo(118);
    expect(r.lineNetAmt).toBeCloseTo(100);
    expect(r.lineGstAmt).toBeCloseTo(18);
  });

  it('U2: zero quantity gives zero amount', () => {
    const r = calcLine({ qty: 0, netRate: 500, gstPct: 18 }, 18);
    expect(r.amount).toBe(0);
    expect(r.lineGstAmt).toBe(0);
    expect(r.lineNetAmt).toBe(0);
  });

  it('U3: fractional quantity', () => {
    const r = calcLine({ qty: 2.5, netRate: 200, gstPct: 18 }, 18);
    // rate incl GST = 200 * 1.18 = 236
    // amount = 236 * 2.5 = 590
    expect(r.amount).toBeCloseTo(590);
    expect(r.lineNetAmt).toBeCloseTo(500);
  });

  it('U4: zero GST → no tax', () => {
    const r = calcLine({ qty: 1, netRate: 100, gstPct: 0 }, 0);
    expect(r.gstAmt).toBe(0);
    expect(r.rate).toBeCloseTo(100);
    expect(r.amount).toBeCloseTo(100);
  });

  it('U5: null GST inherits global rate', () => {
    const r = calcLine({ qty: 1, netRate: 100, gstPct: null }, 12);
    expect(r.gstPct).toBe(12);
    expect(r.gstAmt).toBeCloseTo(12);
  });

  it('U6: item-level GST overrides global rate', () => {
    const r = calcLine({ qty: 1, netRate: 100, gstPct: 5 }, 18);
    expect(r.gstPct).toBe(5);
    expect(r.gstAmt).toBeCloseTo(5);
    expect(r.rate).toBeCloseTo(105);
  });

  it('U7: string number inputs are coerced', () => {
    const r = calcLine({ qty: '3', netRate: '250', gstPct: 18 }, 18);
    // rate = 250 * 1.18 = 295; amount = 295 * 3 = 885
    expect(r.amount).toBeCloseTo(885);
  });

  it('U8: empty string inputs → all zeros, no crash', () => {
    const r = calcLine({ qty: '', netRate: '', gstPct: null }, 18);
    expect(r.qty).toBe(0);
    expect(r.netRate).toBe(0);
    expect(r.amount).toBe(0);
    expect(r.lineGstAmt).toBe(0);
  });
});

// ─────────────────────────────────────────────
// calcTotals()
// ─────────────────────────────────────────────
const profileBase = { gstRate: 18, cgstPct: 9, sgstPct: 9 };

describe('calcTotals()', () => {
  it('T1: equal CGST/SGST 50/50 split', () => {
    const items = [{ qty: 1, netRate: 100, gstPct: 18 }];
    const t = calcTotals(items, profileBase);
    expect(t.cgst).toBeCloseTo(t.sgst);
    expect(t.cgst).toBeCloseTo(9);
    expect(t.sgst).toBeCloseTo(9);
  });

  it('T2: cgst + sgst always equals totalGst', () => {
    const items = [
      { qty: 2, netRate: 150, gstPct: 18 },
      { qty: 3, netRate: 80, gstPct: 5 },
    ];
    const t = calcTotals(items, profileBase);
    expect(t.cgst + t.sgst).toBeCloseTo(t.totalGst);
  });

  it('T3: grandTotal = subTotal + totalGst', () => {
    const items = [{ qty: 4, netRate: 200, gstPct: 18 }];
    const t = calcTotals(items, profileBase);
    expect(t.grandTotal).toBeCloseTo(t.subTotal + t.totalGst);
  });

  it('T4: empty items array → all zeros, no crash', () => {
    const t = calcTotals([], profileBase);
    expect(t.subTotal).toBe(0);
    expect(t.totalGst).toBe(0);
    expect(t.grandTotal).toBe(0);
    expect(t.cgst).toBe(0);
    expect(t.sgst).toBe(0);
  });

  it('T5: asymmetric cgstPct/sgstPct (60/40 split)', () => {
    const profile = { gstRate: 10, cgstPct: 6, sgstPct: 4 };
    const items = [{ qty: 1, netRate: 1000, gstPct: 10 }];
    const t = calcTotals(items, profile);
    // totalGst = 100; cgst = 100 * (6/10) = 60; sgst = 40
    expect(t.cgst).toBeCloseTo(60, 1);
    expect(t.sgst).toBeCloseTo(40, 1);
  });

  it('T6: zero cgstPct + sgstPct → no divide-by-zero crash', () => {
    const profile = { gstRate: 0, cgstPct: 0, sgstPct: 0 };
    const items = [{ qty: 1, netRate: 100, gstPct: 0 }];
    expect(() => calcTotals(items, profile)).not.toThrow();
    const t = calcTotals(items, profile);
    expect(t.cgst).toBe(0);
    expect(t.sgst).toBe(0);
  });

  it('T7: 100 items performance < 10ms', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      qty: i + 1,
      netRate: 100 + i,
      gstPct: 18,
    }));
    const start = performance.now();
    calcTotals(items, profileBase);
    expect(performance.now() - start).toBeLessThan(10);
  });
});
