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
