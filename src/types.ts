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
  hsnLabel?: string;
}

export interface Product {
  id?: string;
  name: string;
  hsn: string;
  rate: string; // tax-inclusive rate
  category: string;
  gstPct?: number | null;
  unit?: string;
}

export interface LineItem {
  id: string;
  hsn: string;
  description: string;
  qty: number;
  netRate: string | number;
  gstPct: number | null; // null means inherit global GST
  unit?: string;
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
  customerAddress?: string;
  placeOfSupply?: string;
  discount?: number;
  reverseCharge?: 'Yes' | 'No';
}

export interface ElectronAPI {
  isElectron?: boolean;
  saveFile: (
    suggestedName: string,
    contentBase64: string
  ) => Promise<{ success: boolean; canceled?: boolean; filePath?: string; error?: string }>;
  printApp: () => Promise<{ success: boolean; error?: string }>;
  db: {
    getProfiles: () => Promise<any[]>;
    upsertProfile: (id: string, data: any) => Promise<void>;
    deleteProfile: (id: string) => Promise<void>;
    getCatalog: (profileId: string) => Promise<any[]>;
    upsertCatalogItem: (id: string, profileId: string, data: any) => Promise<void>;
    deleteCatalogItem: (id: string) => Promise<void>;
    getInvoices: (profileId?: string) => Promise<any[]>;
    upsertInvoice: (id: string, profileId: string, data: any) => Promise<void>;
    deleteInvoice: (id: string) => Promise<void>;
    getSetting: (key: string) => Promise<any>;
    setSetting: (key: string, value: any) => Promise<void>;
    isReady: () => Promise<boolean>;
    selectCreate: () => Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }>;
    selectOpen: () => Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

