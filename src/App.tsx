import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import StartupScreen from './components/StartupScreen';
import ProfileModal from './components/ProfileModal';
import InvoiceEditor from './components/InvoiceEditor';
import InvoiceHistory from './components/InvoiceHistory';
import SettingsScreen from './components/SettingsScreen';
import { Profile, Product, Invoice } from './types';

// Storage Helper
export const STORAGE = {
  get: (k: string) => {
    try {
      const v = localStorage.getItem('invoiceforge:' + k);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },
  set: (k: string, v: any) => {
    try {
      localStorage.setItem('invoiceforge:' + k, JSON.stringify(v));
    } catch {}
  },
};

export interface ToastMessage {
  id: number;
  msg: string;
  type?: 'success' | 'error';
}

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>(() => STORAGE.get('profiles') || []);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => STORAGE.get('active_profile') || null);
  const [screen, setScreen] = useState<string>('startup');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | undefined>(undefined);
  const [pendingCatalogAdd, setPendingCatalogAdd] = useState<Product | null>(null);

  const handleAddProductToInvoice = (prod: Product) => {
    setPendingCatalogAdd(prod);
    setScreen('new-invoice');
    showToast(`Added ${prod.name} to invoice!`, 'success');
  };

  // Active Profile
  const activeProfile = useMemo(() => {
    const p = profiles.find((x) => x.id === activeProfileId);
    return p || profiles[0] || null;
  }, [profiles, activeProfileId]);

  // Load Profile catalog
  const [catalog, setCatalog] = useState<Product[]>([]);

  useEffect(() => {
    if (activeProfile) {
      setCatalog(STORAGE.get(`catalog:${activeProfile.id}`) || []);
    } else {
      setCatalog([]);
    }
  }, [activeProfileId, activeProfile]);

  const updateCatalog = (newCatalog: Product[]) => {
    if (!activeProfile) return;
    STORAGE.set(`catalog:${activeProfile.id}`, newCatalog);
    setCatalog(newCatalog);
  };

  // Switcher check on startup
  useEffect(() => {
    if (profiles.length === 0) {
      setScreen('startup');
      return;
    }
    if (!activeProfileId || !profiles.find((p) => p.id === activeProfileId)) {
      const firstId = profiles[0].id;
      setActiveProfileId(firstId);
      STORAGE.set('active_profile', firstId);
    }
    if (screen === 'startup') {
      setScreen('new-invoice');
    }
  }, [profiles]);

  // Toast utility
  const showToast = (msg: string, type?: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Profile operations
  const addProfile = (p: Profile) => {
    const updated = [...profiles, p];
    setProfiles(updated);
    STORAGE.set('profiles', updated);
    setActiveProfileId(p.id);
    STORAGE.set('active_profile', p.id);
    setShowProfileModal(false);
    setScreen('new-invoice');
    showToast('Business profile created!', 'success');
  };

  const updateProfile = (p: Profile) => {
    const updated = profiles.map((x) => (x.id === p.id ? p : x));
    setProfiles(updated);
    STORAGE.set('profiles', updated);
    showToast('Business profile updated!', 'success');
  };

  const deleteProfile = (id: string) => {
    const updated = profiles.filter((p) => p.id !== id);
    setProfiles(updated);
    STORAGE.set('profiles', updated);
    
    // Clean up history and catalog if desired, though PRD states invoices should remain.
    // Clean up active ID
    if (activeProfileId === id) {
      const nextId = updated.length > 0 ? updated[0].id : null;
      setActiveProfileId(nextId);
      if (nextId) STORAGE.set('active_profile', nextId);
    }
    showToast('Business profile deleted.', 'success');
  };

  const switchProfile = (id: string) => {
    setActiveProfileId(id);
    STORAGE.set('active_profile', id);
    setScreen('new-invoice');
  };

  // First setup screen
  if (screen === 'startup' && profiles.length === 0) {
    return (
      <div className="app-shell">
        <StartupScreen
          profiles={profiles}
          onSelect={(p) => switchProfile(p.id)}
          onAdd={() => {
            setEditingProfile(undefined);
            setShowProfileModal(true);
          }}
        />

        {showProfileModal && (
          <div className="modal-overlay">
            <div className="modal-box">
              <div className="modal-header">
                <h3>Set Up Your Business</h3>
              </div>
              <ProfileModal
                profile={editingProfile}
                onSave={addProfile}
                onCancel={() => setShowProfileModal(false)}
              />
            </div>
          </div>
        )}

        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <Sidebar
        profiles={profiles}
        activeProfileId={activeProfileId}
        onProfileChange={switchProfile}
        currentScreen={screen}
        onScreenChange={setScreen}
        activeProfile={activeProfile}
      />

      {/* Main Panel Content */}
      <div className="main-layout">
        <div className="topbar">
          <h2>
            {screen === 'new-invoice' && 'New Invoice'}
            {screen === 'history' && 'Invoice History'}
            {screen === 'settings' && 'Settings'}
          </h2>
          <div className="topbar-info">
            {screen === 'new-invoice' && activeProfile && (
              <span>
                {activeProfile.bizName} | Prefix: {activeProfile.invoicePrefix || 'None'} | Next ID:{' '}
                {activeProfile.invoiceCounter}
              </span>
            )}
          </div>
        </div>

        <div className="content-area">
          {screen === 'new-invoice' && activeProfile && (
            <InvoiceEditor
              profile={activeProfile}
              catalog={catalog}
              onSaveProfile={updateProfile}
              onUpdateCatalog={updateCatalog}
              showToast={showToast}
              pendingCatalogAdd={pendingCatalogAdd}
              clearPendingCatalogAdd={() => setPendingCatalogAdd(null)}
            />
          )}

          {screen === 'history' && (
            <InvoiceHistory profiles={profiles} showToast={showToast} />
          )}

          {screen === 'settings' && (
            <SettingsScreen
              profiles={profiles}
              onUpdateProfile={updateProfile}
              onAddProfile={addProfile}
              onDeleteProfile={deleteProfile}
              catalog={catalog}
              onUpdateCatalog={updateCatalog}
              onAddToInvoice={handleAddProductToInvoice}
              showToast={showToast}
            />
          )}
        </div>
      </div>

      {/* Toasts Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

// Micro Toast Subcomponent
function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: ToastMessage[];
  removeToast: (id: number) => void;
}) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDone={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDone }: { toast: ToastMessage; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className={`toast-message ${toast.type || ''}`}>
      {toast.type === 'success' && (
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
      {toast.type === 'error' && (
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      )}
      {toast.msg}
    </div>
  );
}
