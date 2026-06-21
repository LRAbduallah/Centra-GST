import { describe, it, expect } from 'vitest';
import { calcLine, calcTotals } from './calculations';
import { b2bInvoice, b2bProfile } from '../components/__tests__/fixtures';

// ─────────────────────────────────────────────
// calcLine()
// ─────────────────────────────────────────────
describe('calcLine()', () => {
  it('U1: basic rate + 18% GST (tax-inclusive)', () => {
    const r = calcLine({ qty: 1, netRate: 118, gstPct: 18 }, 18);
    expect(r.netRate).toBeCloseTo(100);
    expect(r.gstAmt).toBeCloseTo(18);
    expect(r.rate).toBeCloseTo(118);
    expect(r.amount).toBeCloseTo(118);
    expect(r.lineNetAmt).toBeCloseTo(100);
    expect(r.lineGstAmt).toBeCloseTo(18);
  });

  it('U2: zero quantity gives zero amount', () => {
    const r = calcLine({ qty: 0, netRate: 118, gstPct: 18 }, 18);
    expect(r.amount).toBe(0);
    expect(r.lineGstAmt).toBe(0);
    expect(r.lineNetAmt).toBe(0);
  });

  it('U3: fractional quantity', () => {
    const r = calcLine({ qty: 2.5, netRate: 118, gstPct: 18 }, 18);
    expect(r.amount).toBeCloseTo(295);
    expect(r.lineNetAmt).toBeCloseTo(250);
    expect(r.lineGstAmt).toBeCloseTo(45);
  });

  it('U4: zero GST → no tax', () => {
    const r = calcLine({ qty: 1, netRate: 100, gstPct: 0 }, 0);
    expect(r.netRate).toBeCloseTo(100);
    expect(r.gstAmt).toBe(0);
    expect(r.rate).toBeCloseTo(100);
    expect(r.amount).toBeCloseTo(100);
  });

  it('U5: null GST inherits global rate', () => {
    const r = calcLine({ qty: 1, netRate: 112, gstPct: null }, 12);
    expect(r.gstPct).toBe(12);
    expect(r.netRate).toBeCloseTo(100);
    expect(r.gstAmt).toBeCloseTo(12);
  });

  it('U6: item-level GST overrides global rate', () => {
    const r = calcLine({ qty: 1, netRate: 105, gstPct: 5 }, 18);
    expect(r.gstPct).toBe(5);
    expect(r.netRate).toBeCloseTo(100);
    expect(r.gstAmt).toBeCloseTo(5);
    expect(r.rate).toBeCloseTo(105);
  });

  it('U7: string number inputs are coerced', () => {
    const r = calcLine({ qty: '3', netRate: '118', gstPct: 18 }, 18);
    expect(r.amount).toBeCloseTo(354);
    expect(r.lineNetAmt).toBeCloseTo(300);
    expect(r.lineGstAmt).toBeCloseTo(54);
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
    const items = [{ qty: 1, netRate: 118, gstPct: 18 }];
    const t = calcTotals(items, profileBase);
    expect(t.cgst).toBeCloseTo(t.sgst);
    expect(t.cgst).toBeCloseTo(9);
    expect(t.sgst).toBeCloseTo(9);
    expect(t.cgstPct).toBe(9);
    expect(t.sgstPct).toBe(9);
    expect(t.isMixed).toBe(false);
  });

  it('T2: cgst + sgst always equals totalGst', () => {
    const items = [
      { qty: 2, netRate: 118, gstPct: 18 },
      { qty: 3, netRate: 105, gstPct: 5 },
    ];
    const t = calcTotals(items, profileBase);
    expect(t.cgst + t.sgst).toBeCloseTo(t.totalGst);
    expect(t.isMixed).toBe(true);
    expect(t.cgstPct).toBe('');
    expect(t.sgstPct).toBe('');
  });

  it('T3: grandTotal = subTotal + totalGst', () => {
    const items = [{ qty: 4, netRate: 118, gstPct: 18 }];
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

  it('T5: symmetric cgst/sgst split is 50/50 of total GST', () => {
    const profile = { gstRate: 10, cgstPct: 5, sgstPct: 5 };
    const items = [{ qty: 1, netRate: 1100, gstPct: 10 }];
    const t = calcTotals(items, profile);
    // rate = 1100, gstPct = 10%
    // netRate = 1000, totalGst = 100. cgst = 50, sgst = 50.
    expect(t.cgst).toBeCloseTo(50, 1);
    expect(t.sgst).toBeCloseTo(50, 1);
    expect(t.cgstPct).toBe(5);
    expect(t.sgstPct).toBe(5);
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
      netRate: 118 + i,
      gstPct: 18,
    }));
    const start = performance.now();
    calcTotals(items, profileBase);
    expect(performance.now() - start).toBeLessThan(10);
  });

  it('T8: calculates round-off and rounded grand total correctly', () => {
    const items = [
      { qty: 1, netRate: 118.25, gstPct: 18 }
    ];
    const t = calcTotals(items, profileBase);
    // grandTotalRaw = 118.25
    // grandTotal = 118
    // roundOff = -0.25
    expect(t.grandTotalRaw).toBeCloseTo(118.25);
    expect(t.grandTotal).toBe(118);
    expect(t.roundOff).toBeCloseTo(-0.25);
  });

  it('T9: applies a pre-tax discount proportionally to a single item', () => {
    const items = [{ qty: 1, netRate: 118, gstPct: 18 }]; // pre-tax total is 100
    const t = calcTotals(items, profileBase, 20); // 20 pre-tax discount
    // subTotalBeforeDiscount = 100
    // discountAmount = 20
    // new taxable subTotal = 80
    // totalGst = 80 * 18% = 14.4
    // grandTotalRaw = 80 + 14.4 = 94.4
    // grandTotal = 94
    // roundOff = -0.4
    expect(t.subTotalBeforeDiscount).toBeCloseTo(100);
    expect(t.discount).toBe(20);
    expect(t.subTotal).toBeCloseTo(80);
    expect(t.totalGst).toBeCloseTo(14.4);
    expect(t.grandTotal).toBe(94);
  });

  it('T10: applies a pre-tax discount proportionally across mixed rate items', () => {
    const items = [
      { qty: 1, netRate: 118, gstPct: 18 }, // pre-tax 100
      { qty: 1, netRate: 105, gstPct: 5 },  // pre-tax 100
    ];
    const t = calcTotals(items, profileBase, 50); // 50 pre-tax discount split 50/50 (25 each)
    // Item 1: pre-tax 75, GST = 75 * 18% = 13.5
    // Item 2: pre-tax 75, GST = 75 * 5% = 3.75
    // total subTotal = 150
    // totalGst = 17.25
    // grandTotalRaw = 167.25
    // grandTotal = 167
    // roundOff = -0.25
    expect(t.subTotalBeforeDiscount).toBeCloseTo(200);
    expect(t.discount).toBe(50);
    expect(t.subTotal).toBeCloseTo(150);
    expect(t.totalGst).toBeCloseTo(17.25);
    expect(t.grandTotal).toBe(167);
  });

  it('T11: calculates splits and discounts for the high-value B2B invoice scenario', () => {
    const t = calcTotals(b2bInvoice.items, b2bProfile, b2bInvoice.discount);
    // VIS1 Items:
    // Item 1: 10 BOX, netRate 5000 (Incl. 12% GST). Total 50000. Taxable Net = 50000 / 1.12 = 44642.85
    // Item 2: 30 KG, netRate 400 (Incl. 5% GST). Total 12000. Taxable Net = 12000 / 1.05 = 11428.57
    // Gross Taxable Net = 44642.85 + 11428.57 = 56071.42
    // Pre-tax discount = 2000.
    // Taxable Net (post discount) = 56071.42 - 2000 = 54071.42
    expect(t.subTotalBeforeDiscount).toBeCloseTo(56071.42, 1);
    expect(t.discount).toBe(2000);
    expect(t.subTotal).toBeCloseTo(54071.42, 1);
    // Sum of post-discount tax:
    // Item 1 shares 44642.85 / 56071.42 of 2000 discount = 1592.35. Net = 43050.5. Tax (12%) = 5166.06
    // Item 2 shares 11428.57 / 56071.42 of 2000 discount = 407.65. Net = 11020.92. Tax (5%) = 551.04
    // Total Tax = 5166.06 + 551.04 = 5717.1
    expect(t.totalGst).toBeCloseTo(5717.1, 1);
    expect(t.cgst).toBeCloseTo(t.totalGst / 2);
    expect(t.sgst).toBeCloseTo(t.totalGst / 2);
    expect(t.grandTotal).toBe(59789); // rounded 54071.42 + 5717.1 = 59788.52 -> 59789
  });
});

describe('calcLine() — Edge cases & 12% Slab', () => {
  it('U9: handles non-standard 12% GST slab correctly', () => {
    const r = calcLine({ qty: 1, netRate: 112, gstPct: 12 }, 12);
    expect(r.netRate).toBeCloseTo(100);
    expect(r.gstAmt).toBeCloseTo(12);
    expect(r.amount).toBe(112);
  });

  it('U10: handles negative and zero inputs gracefully', () => {
    const rZero = calcLine({ qty: -2, netRate: 0, gstPct: 18 }, 18);
    expect(rZero.qty).toBe(-2);
    expect(rZero.netRate).toBe(0);
    expect(rZero.amount).toBeCloseTo(0);

    const tNegDiscount = calcTotals([{ qty: 1, netRate: 118, gstPct: 18 }], b2bProfile, -50);
    expect(tNegDiscount.discount).toBe(0);
    expect(tNegDiscount.subTotal).toBeCloseTo(100);
  });
});

