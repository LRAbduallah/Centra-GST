import React from 'react';
import { Profile } from '../types';
import { PlusCircle, History, Settings, FileText } from 'lucide-react';

interface SidebarProps {
  profiles: Profile[];
  activeProfileId: string | null;
  onProfileChange: (id: string) => void;
  currentScreen: string;
  onScreenChange: (screen: string) => void;
  activeProfile: Profile | null;
}

export default function Sidebar({
  profiles,
  activeProfileId,
  onProfileChange,
  currentScreen,
  onScreenChange,
  activeProfile,
}: SidebarProps) {
  const navItems = [
    {
      key: 'new-invoice',
      label: 'New Invoice',
      icon: <FileText size={16} />,
    },
    {
      key: 'history',
      label: 'Invoice History',
      icon: <History size={16} />,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <Settings size={16} />,
    },
  ];

  return (
    <div className="sidebar">
      {/* Sidebar Logo */}
      <div className="sidebar-logo">
        <h1>InvoiceForge</h1>
        <p>GST Invoice Generator</p>
      </div>

      {/* Profile switcher dropdown */}
      {profiles.length > 0 && (
        <div className="profile-switcher">
          <select
            className="profile-select"
            value={activeProfileId || ''}
            onChange={(e) => onProfileChange(e.target.value)}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation Panel */}
      <div className="nav-section">
        <div className="nav-label">Billing</div>
        {navItems.map((item) => (
          <div
            key={item.key}
            className={`nav-item ${currentScreen === item.key ? 'active' : ''}`}
            onClick={() => onScreenChange(item.key)}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Footer Info Box */}
      {activeProfile && (
        <div className="sidebar-footer">
          <div className="label">Active Business</div>
          <div className="value">{activeProfile.bizName}</div>
          <div className="value" style={{ fontSize: '10px', color: 'var(--color-text-darker)', fontWeight: 500 }}>
            GST: {activeProfile.gstNo || 'Not Set'}
          </div>
        </div>
      )}
    </div>
  );
}
