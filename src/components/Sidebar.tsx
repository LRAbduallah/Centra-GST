import React from 'react';
import { Profile } from '../types';
import { PlusCircle, History, Settings, FileText, Menu, Sun, Moon, TrendingUp } from 'lucide-react';
import logoImg from '../assets/logo.svg';

interface SidebarProps {
  profiles: Profile[];
  activeProfileId: string | null;
  onProfileChange: (id: string) => void;
  currentScreen: string;
  onScreenChange: (screen: string) => void;
  activeProfile: Profile | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  profiles,
  activeProfileId,
  onProfileChange,
  currentScreen,
  onScreenChange,
  activeProfile,
  theme,
  onToggleTheme,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const navItems = [
    {
      key: 'new-invoice',
      label: 'Invoice',
      icon: <FileText size={16} />,
    },
    {
      key: 'history',
      label: 'Invoice History',
      icon: <History size={16} />,
    },
    {
      key: 'reports',
      label: 'Reports',
      icon: <TrendingUp size={16} />,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <Settings size={16} />,
    },
  ];

  return (
    <div className={`sidebar-wrapper ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar">
        {/* Sidebar Logo Header */}
        <div className="sidebar-logo" style={{ padding: isCollapsed ? '16px 0' : '20px' }}>
          <div className="sidebar-logo-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
              <img
                src={logoImg}
                style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', flexShrink: 0 }}
                onClick={onToggleCollapse}
                alt="CentraGST Logo"
                title={isCollapsed ? 'Expand Sidebar' : 'CentraGST'}
              />
              <div className="sidebar-text" style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>CentraGST</h1>
                <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  Enterprise Billing System
                </p>
              </div>
            </div>
            {!isCollapsed && (
              <button
                className="collapse-toggle-btn"
                onClick={onToggleCollapse}
                title="Collapse Sidebar"
                style={{ marginLeft: '10px', flexShrink: 0 }}
              >
                <Menu size={18} />
              </button>
            )}
          </div>
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
          <div className="nav-label sidebar-text">Billing</div>
          {navItems.map((item) => (
            <div
              key={item.key}
              className={`nav-item ${currentScreen === item.key ? 'active' : ''}`}
              onClick={() => onScreenChange(item.key)}
            >
              {item.icon}
              <span className="sidebar-text">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Theme Switcher Row */}
        <div className="theme-toggle-row">
          <span className="sidebar-text">
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
          <button
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {/* Footer Info Box */}
        {activeProfile && (
          <div className="sidebar-footer sidebar-text">
            <div className="label">Active Business</div>
            <div className="value">{activeProfile.bizName}</div>
            <div className="value" style={{ fontSize: '10px', color: 'var(--color-text-darker)', fontWeight: 500 }}>
              GST: {activeProfile.gstNo || 'Not Set'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
