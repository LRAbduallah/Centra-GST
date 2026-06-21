import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import StartupScreen from './components/StartupScreen';
import ProfileModal from './components/ProfileModal';
import InvoiceEditor from './components/InvoiceEditor';
import InvoiceHistory from './components/InvoiceHistory';
import SettingsScreen from './components/SettingsScreen';
import ReportsScreen from './components/ReportsScreen';
import DatabaseSetupScreen from './components/DatabaseSetupScreen';
import DisclaimerScreen from './components/DisclaimerScreen';
import { Profile, Product, Invoice } from './types';
import { db } from './db';

export interface ToastMessage {
  id: number;
  msg: string;
  type?: 'success' | 'error';
  duration?: number; // ms — auto-set based on type if omitted
}

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [screen, setScreen] = useState<string>('startup');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | undefined>(undefined);
  const [pendingCatalogAdd, setPendingCatalogAdd] = useState<Product | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    async function initTheme() {
      try {
        const ready = await db.isReady();
        if (ready) {
          const t = await db.getSetting('theme');
          if (t === 'light' || t === 'dark') {
            setTheme(t);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    initTheme();
  }, [isLoaded]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      const ready = await db.isReady();
      if (ready) {
        await db.setSetting('theme', nextTheme);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load initial data and check database status on startup
  useEffect(() => {
    async function initApp() {
      try {
        const ready = await db.isReady();
        if (!ready) {
          setScreen('db-setup');
          setIsLoaded(true);
          return;
        }

        const termsAccepted = await db.getSetting('terms_accepted');
        if (!termsAccepted) {
          setScreen('disclaimer');
          setIsLoaded(true);
          return;
        }

        const dbProfiles = await db.getProfiles();
        const activeId = await db.getSetting('active_profile');

        setProfiles(dbProfiles);
        setActiveProfileId(activeId);
        
        if (dbProfiles.length === 0) {
          setScreen('startup');
        } else {
          setScreen('new-invoice');
        }
      } catch (err) {
        console.error('App init error:', err);
        showToast('Error initializing database', 'error');
      } finally {
        setIsLoaded(true);
      }
    }
    initApp();
  }, []);

  const handleDbSetupComplete = async () => {
    try {
      setIsLoaded(false);
      
      const termsAccepted = await db.getSetting('terms_accepted');
      if (!termsAccepted) {
        setScreen('disclaimer');
        setIsLoaded(true);
        return;
      }

      const dbProfiles = await db.getProfiles();
      const activeId = await db.getSetting('active_profile');

      setProfiles(dbProfiles);
      setActiveProfileId(activeId);

      if (dbProfiles.length === 0) {
        setScreen('startup');
      } else {
        setScreen('new-invoice');
      }
    } catch (err) {
      console.error('Failed to load database after setup:', err);
      showToast('Error loading database profiles', 'error');
    } finally {
      setIsLoaded(true);
    }
  };

  const handleAcceptTerms = async () => {
    try {
      setIsLoaded(false);
      const ready = await db.isReady();
      if (ready) {
        await db.setSetting('terms_accepted', true);
      }
      
      const dbProfiles = await db.getProfiles();
      const activeId = await db.getSetting('active_profile');

      setProfiles(dbProfiles);
      setActiveProfileId(activeId);

      if (dbProfiles.length === 0) {
        setScreen('startup');
      } else {
        setScreen('new-invoice');
      }
    } catch (err) {
      console.error('Failed to accept terms:', err);
      showToast('Error saving agreement setting', 'error');
    } finally {
      setIsLoaded(true);
    }
  };

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
    async function loadCatalog() {
      if (activeProfile) {
        const dbCatalog = await db.getCatalog(activeProfile.id);
        setCatalog(dbCatalog);
      } else {
        setCatalog([]);
      }
    }
    loadCatalog();
  }, [activeProfileId, activeProfile]);

  const updateCatalog = async (newCatalog: Product[]) => {
    if (!activeProfile) return;
    try {
      const oldCatalog = await db.getCatalog(activeProfile.id);
      const oldIds = new Set(oldCatalog.map((x) => x.id).filter(Boolean));
      const newIds = new Set(newCatalog.map((x) => x.id).filter(Boolean));

      // Delete items no longer present
      for (const id of oldIds) {
        if (!newIds.has(id)) {
          await db.deleteCatalogItem(id as string);
        }
      }

      // Upsert new/updated items
      for (const item of newCatalog) {
        const itemId = item.id || Math.random().toString(36).substring(2, 9);
        await db.upsertCatalogItem(itemId, activeProfile.id, { ...item, id: itemId });
      }

      setCatalog(newCatalog);
    } catch (err) {
      console.error('Failed to update catalog:', err);
      showToast('Error saving product catalog', 'error');
    }
  };

  // Switcher check on startup
  useEffect(() => {
    if (!isLoaded || screen === 'db-setup' || screen === 'disclaimer') return;
    if (profiles.length === 0) {
      setScreen('startup');
      return;
    }
    async function ensureActiveProfile() {
      if (!activeProfileId || !profiles.find((p) => p.id === activeProfileId)) {
        const firstId = profiles[0].id;
        setActiveProfileId(firstId);
        await db.setSetting('active_profile', firstId);
      }
      if (screen === 'startup') {
        setScreen('new-invoice');
      }
    }
    ensureActiveProfile();
  }, [profiles, isLoaded, screen]);

  // Toast utility — errors linger for 6 s, success/info for 3 s
  const showToast = (msg: string, type?: 'success' | 'error') => {
    const id = Date.now();
    const duration = type === 'error' ? 6000 : 3000;
    setToasts((prev) => [...prev, { id, msg, type, duration }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Profile operations
  const addProfile = async (p: Profile) => {
    try {
      const updated = [...profiles, p];
      setProfiles(updated);
      await db.upsertProfile(p.id, p);
      setActiveProfileId(p.id);
      await db.setSetting('active_profile', p.id);
      setShowProfileModal(false);
      setScreen('new-invoice');
      showToast('Business profile created!', 'success');
    } catch (err) {
      console.error('Failed to add profile:', err);
      showToast('Error saving profile', 'error');
    }
  };

  const updateProfile = async (p: Profile) => {
    try {
      const updated = profiles.map((x) => (x.id === p.id ? p : x));
      setProfiles(updated);
      await db.upsertProfile(p.id, p);
      showToast('Business profile updated!', 'success');
    } catch (err) {
      console.error('Failed to update profile:', err);
      showToast('Error saving profile changes', 'error');
    }
  };

  const deleteProfile = async (id: string) => {
    try {
      const updated = profiles.filter((p) => p.id !== id);
      setProfiles(updated);
      await db.deleteProfile(id);

      // Clean up active ID
      if (activeProfileId === id) {
        const nextId = updated.length > 0 ? updated[0].id : null;
        setActiveProfileId(nextId);
        if (nextId) await db.setSetting('active_profile', nextId);
      }
      showToast('Business profile deleted.', 'success');
    } catch (err) {
      console.error('Failed to delete profile:', err);
      showToast('Error deleting profile', 'error');
    }
  };

  const switchProfile = async (id: string) => {
    try {
      setActiveProfileId(id);
      await db.setSetting('active_profile', id);
      setScreen('new-invoice');
    } catch (err) {
      console.error('Failed to switch profile:', err);
    }
  };

  // Loading state render
  if (!isLoaded) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f0f', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 }}>Loading Database...</p>
        </div>
      </div>
    );
  }

  // Database path setup selection screen
  if (screen === 'db-setup') {
    return (
      <div className="app-shell">
        <DatabaseSetupScreen
          onSetupComplete={handleDbSetupComplete}
          showToast={showToast}
        />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

  // Disclaimer and Terms screen
  if (screen === 'disclaimer') {
    return (
      <div className="app-shell">
        <DisclaimerScreen
          onAccept={handleAcceptTerms}
        />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

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
      <Sidebar
        profiles={profiles}
        activeProfileId={activeProfileId}
        onProfileChange={switchProfile}
        currentScreen={screen}
        onScreenChange={setScreen}
        activeProfile={activeProfile}
        theme={theme}
        onToggleTheme={toggleTheme}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Panel Content */}
      <div className="main-layout">
        <div className="topbar">
          <h2>
            {screen === 'new-invoice' && 'New Invoice'}
            {screen === 'history' && 'Invoice History'}
            {screen === 'reports' && 'Sales & GST Reports'}
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

          {screen === 'reports' && activeProfile && (
            <ReportsScreen profile={activeProfile} showToast={showToast} />
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
              profile={activeProfile || undefined}
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
  const duration = toast.duration ?? (toast.type === 'error' ? 6000 : 3000);

  useEffect(() => {
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [onDone, duration]);

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
      <span style={{ flex: 1 }}>{toast.msg}</span>
      <button
        onClick={onDone}
        title="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          opacity: 0.55,
          padding: '0 0 0 10px',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
