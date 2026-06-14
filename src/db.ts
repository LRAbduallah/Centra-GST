import { Profile, Product, Invoice } from './types';

export interface DatabaseAPI {
  getProfiles: () => Promise<Profile[]>;
  upsertProfile: (id: string, data: Profile) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  getCatalog: (profileId: string) => Promise<Product[]>;
  upsertCatalogItem: (id: string, profileId: string, data: Product) => Promise<void>;
  deleteCatalogItem: (id: string) => Promise<void>;
  getInvoices: (profileId?: string) => Promise<Invoice[]>;
  upsertInvoice: (id: string, profileId: string, data: Invoice) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  getSetting: (key: string) => Promise<any>;
  setSetting: (key: string, value: any) => Promise<void>;
  isReady: () => Promise<boolean>;
  selectCreate: () => Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }>;
  selectOpen: () => Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }>;
}

// Check if we are running in the Electron environment with the DB bridge exposed
const hasElectronDB =
  typeof window !== 'undefined' &&
  window.electronAPI &&
  (window.electronAPI as any).db;

// Expose the native Electron DB client or fall back to the localStorage shim
export const db: DatabaseAPI = hasElectronDB
  ? (window.electronAPI as any).db
  : {
      getProfiles: async () => {
        try {
          const val = localStorage.getItem('invoiceforge:profiles');
          return val ? JSON.parse(val) : [];
        } catch {
          return [];
        }
      },

      upsertProfile: async (id: string, data: Profile) => {
        try {
          const val = localStorage.getItem('invoiceforge:profiles');
          const list: Profile[] = val ? JSON.parse(val) : [];
          const idx = list.findIndex(p => p.id === id);
          if (idx !== -1) {
            list[idx] = data;
          } else {
            list.push(data);
          }
          localStorage.setItem('invoiceforge:profiles', JSON.stringify(list));
        } catch (e) {
          console.error('shim: upsertProfile failed', e);
        }
      },

      deleteProfile: async (id: string) => {
        try {
          const val = localStorage.getItem('invoiceforge:profiles');
          if (val) {
            const list: Profile[] = JSON.parse(val);
            const updated = list.filter(p => p.id !== id);
            localStorage.setItem('invoiceforge:profiles', JSON.stringify(updated));
          }
          // Clean up catalog and invoices for this profile
          localStorage.removeItem(`invoiceforge:catalog:${id}`);
          localStorage.removeItem(`invoiceforge:invoices:${id}`);
        } catch (e) {
          console.error('shim: deleteProfile failed', e);
        }
      },

      getCatalog: async (profileId: string) => {
        try {
          const val = localStorage.getItem(`invoiceforge:catalog:${profileId}`);
          return val ? JSON.parse(val) : [];
        } catch {
          return [];
        }
      },

      upsertCatalogItem: async (id: string, profileId: string, data: Product) => {
        try {
          const val = localStorage.getItem(`invoiceforge:catalog:${profileId}`);
          const list: Product[] = val ? JSON.parse(val) : [];
          const idx = list.findIndex(item => item.id === id);
          if (idx !== -1) {
            list[idx] = { ...data, id };
          } else {
            list.push({ ...data, id });
          }
          localStorage.setItem(`invoiceforge:catalog:${profileId}`, JSON.stringify(list));
        } catch (e) {
          console.error('shim: upsertCatalogItem failed', e);
        }
      },

      deleteCatalogItem: async (id: string) => {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('invoiceforge:catalog:')) {
              const val = localStorage.getItem(key);
              if (val) {
                const list: Product[] = JSON.parse(val);
                if (list.some(item => item.id === id)) {
                  const updated = list.filter(item => item.id !== id);
                  localStorage.setItem(key, JSON.stringify(updated));
                  break;
                }
              }
            }
          }
        } catch (e) {
          console.error('shim: deleteCatalogItem failed', e);
        }
      },

      getInvoices: async (profileId?: string) => {
        try {
          if (profileId && profileId !== 'all') {
            const val = localStorage.getItem(`invoiceforge:invoices:${profileId}`);
            return val ? JSON.parse(val) : [];
          } else {
            // Aggregate all invoices
            const allInvoices: Invoice[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('invoiceforge:invoices:')) {
                const val = localStorage.getItem(key);
                if (val) {
                  const list: Invoice[] = JSON.parse(val);
                  allInvoices.push(...list);
                }
              }
            }
            return allInvoices.sort((a, b) => b.generatedAt - a.generatedAt);
          }
        } catch {
          return [];
        }
      },

      upsertInvoice: async (id: string, profileId: string, data: Invoice) => {
        try {
          const val = localStorage.getItem(`invoiceforge:invoices:${profileId}`);
          const list: Invoice[] = val ? JSON.parse(val) : [];
          const idx = list.findIndex(inv => inv.id === id);
          if (idx !== -1) {
            list[idx] = data;
          } else {
            list.push(data);
          }
          localStorage.setItem(`invoiceforge:invoices:${profileId}`, JSON.stringify(list));
        } catch (e) {
          console.error('shim: upsertInvoice failed', e);
        }
      },

      deleteInvoice: async (id: string) => {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('invoiceforge:invoices:')) {
              const val = localStorage.getItem(key);
              if (val) {
                const list: Invoice[] = JSON.parse(val);
                if (list.some(inv => inv.id === id)) {
                  const updated = list.filter(inv => inv.id !== id);
                  localStorage.setItem(key, JSON.stringify(updated));
                  break;
                }
              }
            }
          }
        } catch (e) {
          console.error('shim: deleteInvoice failed', e);
        }
      },

      getSetting: async (key: string) => {
        try {
          const val = localStorage.getItem(`invoiceforge:${key}`);
          return val ? JSON.parse(val) : null;
        } catch {
          return null;
        }
      },

      setSetting: async (key: string, value: any) => {
        try {
          localStorage.setItem(`invoiceforge:${key}`, JSON.stringify(value));
        } catch (e) {
          console.error('shim: setSetting failed', e);
        }
      },

      isReady: async () => {
        return true;
      },
      selectCreate: async () => {
        return { success: true, filePath: 'mock-test.db' };
      },
      selectOpen: async () => {
        return { success: true, filePath: 'mock-test.db' };
      },
    };
