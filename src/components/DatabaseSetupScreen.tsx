import React from 'react';
import { Database, FolderOpen, FilePlus, ShieldCheck } from 'lucide-react';
import logoImg from '../assets/logo.svg';

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
    <div className="startup-container" style={{ width: '100%', height: '100%' }}>
      <div className="startup-card" style={{ maxWidth: '640px', padding: '40px' }}>
        {/* Animated Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src={logoImg}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
            }}
            alt="CentraGST Suite Logo"
          />

          <h2>Welcome to CentraGST Suite</h2>
          <p className="subtitle" style={{ maxWidth: '480px', margin: '8px auto 32px auto', lineHeight: '1.6' }}>
            Select where you would like to store your local database. All your business profiles, settings, and invoices will be stored securely at this location.
          </p>
        </div>

        {/* Option Selection Grid */}
        <div className="startup-grid" style={{ gap: '16px', marginBottom: '24px' }}>
          {/* Card A: Create Database */}
          <div 
            onClick={handleCreateDb}
            className="db-setup-card"
          >
            <div className="icon-wrapper">
              <FilePlus size={22} />
            </div>
            <h3>Create New Database</h3>
            <p>
              Choose a folder on your computer to save a clean, new database file. Best for fresh setups.
            </p>
          </div>

          {/* Card B: Open Existing Database */}
          <div 
            onClick={handleOpenDb}
            className="db-setup-card"
          >
            <div className="icon-wrapper">
              <FolderOpen size={22} />
            </div>
            <h3>Open Existing Database</h3>
            <p>
              Connect to an existing database file. Perfect for restoring from backup or sharing drives.
            </p>
          </div>
        </div>

        {/* Security / Info Badge */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="security-badge" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '50px',
            padding: '8px 20px',
            color: 'var(--color-text-muted)',
            fontSize: '11px'
          }}>
            <ShieldCheck size={14} style={{ color: 'var(--color-primary)' }} />
            <span>No internet required. Your database lives entirely offline on your system.</span>
          </div>
        </div>

        {/* Local Styles for Consistency & Hover Micro-animations */}
        <style>{`
          .db-setup-card {
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 32px 20px;
            text-align: center;
            cursor: pointer;
            transition: all var(--transition-normal);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            min-height: 200px;
          }
          .db-setup-card:hover {
            border-color: var(--color-primary);
            background-color: var(--bg-hover);
            transform: translateY(-4px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
          }
          .db-setup-card .icon-wrapper {
            background-color: var(--color-primary-light);
            color: var(--color-primary);
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
            transition: transform var(--transition-normal);
          }
          .db-setup-card:hover .icon-wrapper {
            transform: scale(1.1);
          }
          .db-setup-card h3 {
            font-size: 15px;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 8px 0;
          }
          .db-setup-card p {
            font-size: 11.5px;
            color: var(--color-text-muted);
            line-height: 1.5;
            margin: 0;
          }
        `}</style>
      </div>
    </div>
  );
}
