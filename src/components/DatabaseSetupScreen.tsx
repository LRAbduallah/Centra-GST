import React from 'react';
import { Database, FolderOpen, FilePlus, ShieldCheck } from 'lucide-react';

interface DatabaseSetupScreenProps {
  onSetupComplete: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function DatabaseSetupScreen({ onSetupComplete, showToast }: DatabaseSetupScreenProps) {
  const handleCreateDb = async () => {
    if (!window.electronAPI) {
      showToast('Database selection is only supported in the desktop app', 'error');
      return;
    }
    
    try {
      const res = await window.electronAPI.db.selectCreate();
      if (res.success) {
        showToast('Database created successfully!', 'success');
        onSetupComplete();
      } else if (!res.canceled) {
        showToast(res.error || 'Failed to create database', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error selecting database location: ' + err.message, 'error');
    }
  };

  const handleOpenDb = async () => {
    if (!window.electronAPI) {
      showToast('Database selection is only supported in the desktop app', 'error');
      return;
    }

    try {
      const res = await window.electronAPI.db.selectOpen();
      if (res.success) {
        showToast('Database connected successfully!', 'success');
        onSetupComplete();
      } else if (!res.canceled) {
        showToast(res.error || 'Failed to open database', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error opening database: ' + err.message, 'error');
    }
  };

  return (
    <div className="startup-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'radial-gradient(circle at 50% 50%, #1e1e24 0%, #0f0f12 100%)', padding: '24px' }}>
      <div className="glass-card" style={{
        maxWidth: '720px',
        width: '100%',
        background: 'rgba(30, 30, 35, 0.45)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-lg)',
        padding: '48px',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Animated Brand Header */}
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)'
        }}>
          <Database size={32} color="#fff" />
        </div>

        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-0.5px',
          margin: '0 0 8px 0',
          background: 'linear-gradient(to bottom, #ffffff 60%, #a1a1aa 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Welcome to InvoiceForge
        </h1>
        <p style={{
          color: 'var(--color-text-muted)',
          fontSize: '15px',
          maxWidth: '460px',
          lineHeight: '1.6',
          margin: '0 0 40px 0'
        }}>
          Select where you would like to store your local SQLite3 database. All your business profiles, settings, and invoices will be stored securely at this location.
        </p>

        {/* Option Selection Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px',
          width: '100%',
          marginBottom: '32px'
        }}>
          {/* Card A: Create Database */}
          <div 
            onClick={handleCreateDb}
            className="db-setup-card"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: 'var(--radius-md)',
              padding: '32px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div className="icon-wrapper" style={{
              background: 'rgba(59, 130, 246, 0.1)',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              color: '#3b82f6',
              transition: 'all 0.3s ease'
            }}>
              <FilePlus size={22} />
            </div>
            <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 700, margin: '0 0 8px 0' }}>
              Create New Database
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '12.5px', lineHeight: '1.5', margin: 0 }}>
              Choose a folder on your computer to save a clean, new database file. Best for fresh setups.
            </p>
          </div>

          {/* Card B: Open Existing Database */}
          <div 
            onClick={handleOpenDb}
            className="db-setup-card"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: 'var(--radius-md)',
              padding: '32px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div className="icon-wrapper" style={{
              background: 'rgba(16, 185, 129, 0.1)',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              color: '#10b981',
              transition: 'all 0.3s ease'
            }}>
              <FolderOpen size={22} />
            </div>
            <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 700, margin: '0 0 8px 0' }}>
              Open Existing Database
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '12.5px', lineHeight: '1.5', margin: 0 }}>
              Connect to an existing database file. Perfect for restoring from backup or sharing drives.
            </p>
          </div>
        </div>

        {/* Security / Info Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: '50px',
          padding: '6px 16px',
          color: 'var(--color-text-muted)',
          fontSize: '11px'
        }}>
          <ShieldCheck size={14} style={{ color: '#10b981' }} />
          <span>No internet required. Your database lives entirely offline on your system.</span>
        </div>

        {/* Local Styles for Hover Micro-animations */}
        <style>{`
          .db-setup-card:hover {
            transform: translateY(-5px);
            border-color: rgba(255, 255, 255, 0.15) !important;
            background: rgba(255, 255, 255, 0.04) !important;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          }
          .db-setup-card:hover .icon-wrapper {
            transform: scale(1.1);
          }
        `}</style>
      </div>
    </div>
  );
}
