/**
 * Shared test fixtures used by all component and E2E tests.
 * Centralised here so any schema change only needs updating once.
 */
import { Profile, Product, Invoice } from '../../types';

export const testProfile: Profile = {
  id: 'profile-test-001',
  name: 'Vision Opticals',
  bizName: 'Vision Opticals Pvt Ltd',
  logo: '',
  gstNo: '29AABCU9603R1ZX',
  address1: '123 MG Road',
  address2: 'Bengaluru, Karnataka 560001',
  phone: '9876543210',
  tagline: 'See Clearly, Live Brilliantly',
  footerNote: 'Thank you for your purchase!',
  gstRate: 18,
  cgstPct: 9,
  sgstPct: 9,
  invoicePrefix: 'VIS',
  invoiceCounter: 1,
  invoiceFormat: 'PREFIX_COUNTER',
  bankDetails: 'Bank: SBI | A/C: 1234567890 | IFSC: SBIN0001234',
  terms: 'Payment due within 30 days.',
};

export const testProfile2: Profile = {
  ...testProfile,
  id: 'profile-test-002',
  name: 'OptiCare Solutions',
  bizName: 'OptiCare Solutions',
  gstNo: '27AABCU9603R2ZX',
  invoicePrefix: 'OC',
  invoiceCounter: 1,
};

export const testProduct: Product = {
  id: 'prod-001',
  name: 'Anti-Reflective Lens',
  hsn: '9001',
  rate: '1200',
  category: 'Lenses',
};

export const testProduct2: Product = {
  id: 'prod-002',
  name: 'Rimless Frame',
  hsn: '9003',
  rate: '800',
  category: 'Frames',
};

export const testInvoice: Invoice = {
  id: 'inv-001',
  profileId: testProfile.id,
  customerName: 'JOHN DOE',
  mobile: '9876543210',
  customerGst: '',
  date: '01-06-2026',
  invoiceNo: 'VIS1',
  items: [
    {
      id: 'item-001',
      hsn: '9001',
      description: 'Anti-Reflective Lens',
      qty: 1,
      netRate: 1200,
      gstPct: 18,
    },
    {
      id: 'item-002',
      hsn: '9003',
      description: 'Rimless Frame',
      qty: 2,
      netRate: 800,
      gstPct: 18,
    },
  ],
  profileSnapshot: { ...testProfile },
  generatedAt: Date.now(),
  status: 'generated',
};

// 1. Profile with 12% default GST
export const b2bProfile: Profile = {
  ...testProfile,
  id: 'profile-b2b-001',
  name: 'B2B Wholesale Opticals',
  bizName: 'B2B Wholesale Hub Ltd',
  gstRate: 12,
  cgstPct: 6,
  sgstPct: 6,
  invoicePrefix: 'BWH',
};

// 2. Products with specific UOM and GST
export const testProduct3: Product = {
  id: 'prod-003',
  name: 'Designer Frame Box',
  hsn: '9003',
  rate: '5000',
  category: 'Frames',
  gstPct: 12,
  unit: 'BOX',
};

export const testProduct4: Product = {
  id: 'prod-004',
  name: 'Optics Raw Material',
  hsn: '3901',
  rate: '400',
  category: 'Raw Materials',
  gstPct: 5,
  unit: 'KG',
};

// 3. High-Value B2B Invoice (value > ₹50,000) with mixed-slab lines, UOM, and pre-tax discount
export const b2bInvoice: Invoice = {
  id: 'inv-b2b-001',
  profileId: b2bProfile.id,
  customerName: 'APEX EYE CLINIC',
  mobile: '9123456789',
  customerGst: '33AAAAA1111A1Z1', // Tamil Nadu GSTIN
  date: '21-06-2026',
  invoiceNo: 'BWH1',
  items: [
    {
      id: 'b2b-item-001',
      hsn: '9003',
      description: 'Designer Frame Box',
      qty: 10,
      netRate: 5000, // tax-inclusive rate. 10 * 5000 = 50000 gross. 12% GST.
      gstPct: 12,
      unit: 'BOX',
    },
    {
      id: 'b2b-item-002',
      hsn: '3901',
      description: 'Optics Raw Material',
      qty: 30,
      netRate: 400, // 30 * 400 = 12000 gross. 5% GST.
      gstPct: 5,
      unit: 'KG',
    },
  ],
  profileSnapshot: { ...b2bProfile },
  generatedAt: Date.now(),
  status: 'generated',
  customerAddress: '456 Cathedral Road, Chennai\nTamil Nadu - 600086',
  placeOfSupply: 'TAMIL NADU (33)',
  discount: 2000, // Pre-tax discount of ₹2,000
};

