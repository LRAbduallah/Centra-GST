import React, { useState } from 'react';
import { Profile, Product } from '../types';
import ProfileModal from './ProfileModal';
import { STORAGE } from '../App';
import { Plus, Edit2, Trash2, Download, Upload, Shield, CheckCircle, AlertTriangle } from 'lucide-react';

interface SettingsScreenProps {
  profiles: Profile[];
  onUpdateProfile: (p: Profile) => void;
  onAddProfile: (p: Profile) => void;
  onDeleteProfile: (id: string) => void;
  catalog: Product[];
  onUpdateCatalog: (newCatalog: Product[]) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function SettingsScreen({
  profiles,
  onUpdateProfile,
  onAddProfile,
  onDeleteProfile,
  catalog,
  onUpdateCatalog,
  showToast,
}: SettingsScreenProps) {
  const [activeTab, setActiveTab] = useState<'profiles' | 'catalog' | 'backup'>('profiles');
  const [editingProfile, setEditingProfile] = useState<Profile | undefined>(undefined);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Catalog tab sub-states
  const [catEditingIndex, setCatEditingIndex] = useState<number | null>(null);
  const [catForm, setCatForm] = useState<Product>({ name: '', hsn: '', rate: '', category: '' });

  const saveCatalogItem = () => {
    if (!catForm.name.trim()) {
      showToast('Product name is required', 'error');
      return;
    }

    let updatedCatalog = [...catalog];
    if (catEditingIndex !== null) {
      updatedCatalog[catEditingIndex] = { ...catForm };
      showToast('Product updated!', 'success');
    } else {
      updatedCatalog.push({ ...catForm });
      showToast('Product added!', 'success');
    }

    onUpdateCatalog(updatedCatalog);
    setCatEditingIndex(null);
    setCatForm({ name: '', hsn: '', rate: '', category: '' });
  };

  const deleteCatalogItem = (index: number) => {
    if (window.confirm('Delete this product from catalog?')) {
      const updatedCatalog = catalog.filter((_, idx) => idx !== index);
      onUpdateCatalog(updatedCatalog);
      showToast('Product deleted.', 'success');
    }
  };

  const editCatalogItem = (index: number) => {
    setCatEditingIndex(index);
    setCatForm({ ...catalog[index] });
  };

  // CSV Import/Export
  const exportCatalogToCSV = () => {
    if (catalog.length === 0) {
      showToast('Catalog is empty, nothing to export', 'error');
      return;
    }
    const headers = ['Product Name', 'HSN Code', 'Default Net Rate', 'Category'];
    const rows = catalog.map((item) => [
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.hsn}"`,
      item.rate,
      `"${item.category.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `catalog_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Catalog CSV exported!', 'success');
  };

  const importCatalogFromCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          showToast('CSV file is empty or invalid', 'error');
          return;
        }

        const newItems: Product[] = [];
        // Skip header line
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Simple comma splitter supporting quotes
          const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
          if (matches.length >= 1) {
            const name = matches[0]?.replace(/^"|"$/g, '').trim() || '';
            const hsn = matches[1]?.replace(/^"|"$/g, '').trim() || '';
            const rate = matches[2]?.replace(/^"|"$/g, '').trim() || '';
            const category = matches[3]?.replace(/^"|"$/g, '').trim() || '';

            if (name) {
              newItems.push({ name, hsn, rate, category });
            }
          }
        }

        if (newItems.length > 0) {
          onUpdateCatalog([...catalog, ...newItems]);
          showToast(`Successfully imported ${newItems.length} products!`, 'success');
        } else {
          showToast('No valid products found in CSV', 'error');
        }
      } catch (err) {
        showToast('Error parsing CSV file', 'error');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  // Database Backup / Restore
  const exportFullBackup = () => {
    try {
      const data: Record<string, any> = {
        profiles,
        invoices: {},
        catalogs: {},
      };

      // Gather all local storage databases for active profiles
      profiles.forEach((p) => {
        data.invoices[p.id] = STORAGE.get(`invoices:${p.id}`) || [];
        data.catalogs[p.id] = STORAGE.get(`catalog:${p.id}`) || [];
      });

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `InvoiceForge_Backup_${today}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Backup export complete!', 'success');
    } catch {
      showToast('Failed to create backup.', 'error');
    }
  };

  const importFullBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('WARNING: Restoring backup will overwrite all existing local profiles, catalogs, and invoices. Proceed?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data && Array.isArray(data.profiles)) {
          // Restore profiles list
          STORAGE.set('profiles', data.profiles);
          
          // Restore invoices and catalogs
          Object.entries(data.invoices || {}).forEach(([profileId, list]) => {
            STORAGE.set(`invoices:${profileId}`, list);
          });
          Object.entries(data.catalogs || {}).forEach(([profileId, cat]) => {
            STORAGE.set(`catalog:${profileId}`, cat);
          });

          showToast('Backup restored successfully! App is reloading...', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          showToast('Invalid backup file structure.', 'error');
        }
      } catch (err) {
        showToast('Error reading backup file. Make sure it is valid JSON.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="main-layout" style={{ overflow: 'hidden' }}>
      {/* Settings Navigation Tabs */}
      <div className="settings-tab-bar" style={{ padding: '0 24px', background: 'var(--bg-panel)' }}>
        <button
          className={`settings-tab ${activeTab === 'profiles' ? 'active' : ''}`}
          onClick={() => setActiveTab('profiles')}
        >
          Business Profiles
        </button>
        <button
          className={`settings-tab ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          Product Catalog
        </button>
        <button
          className={`settings-tab ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          Backup & Restore
        </button>
      </div>

      <div className="content-area" style={{ overflowY: 'auto' }}>
        <div className="settings-layout">
          
          {/* TAB 1: Business Profiles */}
          {activeTab === 'profiles' && (
            <div>
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3>Business Profiles</h3>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setEditingProfile(undefined);
                      setShowProfileModal(true);
                    }}
                  >
                    <Plus size={14} /> Add Business
                  </button>
                </div>

                {profiles.map((p) => (
                  <div key={p.id} className="profile-row-item">
                    <div className="info">
                      <h4>{p.name}</h4>
                      <p>
                        {p.bizName} • GSTIN: {p.gstNo || 'Not Setup'}
                      </p>
                    </div>
                    <div className="history-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setEditingProfile(p);
                          setShowProfileModal(true);
                        }}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      {profiles.length > 1 && (
                        <button
                          className="btn btn-danger-ghost btn-sm"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete profile "${p.name}"? This action cannot be undone.`)) {
                              onDeleteProfile(p.id);
                            }
                          }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Product Catalog */}
          {activeTab === 'catalog' && (
            <div>
              {/* Product input / editing card */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3>{catEditingIndex !== null ? 'Edit Catalog Product' : 'Add New Product'}</h3>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Product Description / Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Vision Luxe Glasses"
                      value={catForm.name}
                      onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">HSN Code</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 90049090"
                      value={catForm.hsn}
                      onChange={(e) => setCatForm((f) => ({ ...f, hsn: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Default Net Rate (Pre-tax) (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g. 1500"
                      value={catForm.rate}
                      onChange={(e) => setCatForm((f) => ({ ...f, rate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Sunglasses, Frames, Lenses..."
                      value={catForm.category}
                      onChange={(e) => setCatForm((f) => ({ ...f, category: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button className="btn btn-primary btn-sm" onClick={saveCatalogItem}>
                    {catEditingIndex !== null ? 'Update Product' : 'Add Product'}
                  </button>
                  {catEditingIndex !== null && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setCatEditingIndex(null);
                        setCatForm({ name: '', hsn: '', rate: '', category: '' });
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Product catalog lists */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3>Catalog Items ({catalog.length})</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={exportCatalogToCSV}>
                      <Download size={12} /> Export CSV
                    </button>
                    <label className="btn btn-ghost btn-sm" style={{ margin: 0 }}>
                      <Upload size={12} /> Import CSV
                      <input
                        type="file"
                        accept=".csv"
                        style={{ display: 'none' }}
                        onChange={importCatalogFromCSV}
                      />
                    </label>
                  </div>
                </div>

                {catalog.length === 0 ? (
                  <div className="empty-state">
                    <AlertTriangle size={32} />
                    <h4>No Products setup yet</h4>
                    <p>Add a product above or import from CSV catalog to speed up invoice inputs.</p>
                  </div>
                ) : (
                  <div className="catalog-grid">
                    {catalog.map((item, idx) => (
                      <div key={idx} className="catalog-row-item">
                        <div className="details">
                          <h4>{item.name}</h4>
                          <p>
                            HSN: {item.hsn || 'None'} • Rate: ₹{Number(item.rate || 0).toFixed(2)} • Category:{' '}
                            {item.category || 'General'}
                          </p>
                        </div>
                        <div className="history-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => editCatalogItem(idx)}>
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="btn btn-danger-ghost btn-sm"
                            onClick={() => deleteCatalogItem(idx)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Backup & Restore */}
          {activeTab === 'backup' && (
            <div>
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3>App Data Backup & Restore</h3>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ color: 'var(--color-primary)', flexShrink: 0 }}>
                    <Shield size={40} />
                  </div>
                  <div>
                    <h4 style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>Local Backup Security</h4>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginTop: '4px', lineHeight: '1.6' }}>
                      InvoiceForge lives entirely inside your local browser storage (`localStorage`). To prevent data loss
                      due to browser cleanups, cache clearings, or computer changes, we recommend exporting standard 
                      database backups periodically.
                    </p>
                  </div>
                </div>

                <div className="divider" />

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button className="btn btn-primary" onClick={exportFullBackup}>
                    <Download size={14} /> Export Full JSON Backup
                  </button>

                  <label className="btn btn-ghost" style={{ margin: 0 }}>
                    <Upload size={14} /> Restore Database Backup
                    <input
                      type="file"
                      accept=".json"
                      style={{ display: 'none' }}
                      onChange={importFullBackup}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Setup / Edit Modal */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>{editingProfile ? 'Edit Business Profile' : 'Add Business Profile'}</h3>
            </div>
            <ProfileModal
              profile={editingProfile}
              onSave={(p) => {
                if (editingProfile) {
                  onUpdateProfile(p);
                } else {
                  onAddProfile(p);
                }
                setShowProfileModal(false);
              }}
              onCancel={() => setShowProfileModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
