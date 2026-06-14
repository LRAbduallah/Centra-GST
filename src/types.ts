export interface Profile {
  id: string;
  name: string;
  bizName: string;
  logo: string; // base64
  gstNo: string;
  address1: string;
  address2: string;
  phone: string;
  tagline: string;
  footerNote: string;
  gstRate: number;
  cgstPct: number;
  sgstPct: number;
  invoicePrefix: string;
  invoiceCounter: number;
  invoiceFormat: 'PREFIX_COUNTER' | 'YEAR_COUNTER';
  bankDetails: string;
  terms: string;
}

export interface Product {
  name: string;
  hsn: string;
  rate: string; // net rate pre-tax
  category: string;
}

export interface LineItem {
  id: string;
  hsn: string;
  description: string;
  qty: number;
  netRate: string | number;
  gstPct: number | null; // null means inherit global GST
}

export interface Invoice {
  id: string;
  profileId: string;
  customerName: string;
  mobile: string;
  customerGst: string;
  date: string;
  invoiceNo: string;
  items: LineItem[];
  profileSnapshot: Profile;
  generatedAt: number;
  status: 'draft' | 'generated';
}

export interface ElectronAPI {
  isElectron?: boolean;
  saveFile: (
    suggestedName: string,
    contentBase64: string
  ) => Promise<{ success: boolean; canceled?: boolean; filePath?: string; error?: string }>;
  printApp: () => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
