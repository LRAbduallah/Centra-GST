import React, { useState, useMemo } from 'react';
import { Profile, Invoice } from '../types';
import InvoicePreview from './InvoicePreview';
import { STORAGE } from '../App';
import { Eye, FileText, Image as ImageIcon, Trash2, Printer, Search, X } from 'lucide-react';

interface InvoiceHistoryProps {
  profiles: Profile[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function InvoiceHistory({ profiles, showToast }: InvoiceHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProfileId, setFilterProfileId] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Combine and sort invoices from all business profiles
  const allInvoices = useMemo(() => {
    let list: Invoice[] = [];
    profiles.forEach((p) => {
      const invs: Invoice[] = STORAGE.get(`invoices:${p.id}`) || [];
      // Attach profile metadata if missing, just in case
      invs.forEach((inv) => {
        list.push({ ...inv, profileId: p.id });
      });
    });
    return list.sort((a, b) => b.generatedAt - a.generatedAt);
  }, [profiles]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return allInvoices.filter((inv) => {
      const matchProfile = filterProfileId === 'all' || inv.profileId === filterProfileId;
      const matchSearch =
        !searchTerm.trim() ||
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());
      return matchProfile && matchSearch;
    });
  }, [allInvoices, filterProfileId, searchTerm]);

  // Delete invoice
  const handleDeleteInvoice = (invToDelete: Invoice) => {
    if (window.confirm(`Are you sure you want to delete invoice ${invToDelete.invoiceNo} for ${invToDelete.customerName}?`)) {
      const invoicesForProfile: Invoice[] = STORAGE.get(`invoices:${invToDelete.profileId}`) || [];
      const updated = invoicesForProfile.filter((i) => i.id !== invToDelete.id);
      STORAGE.set(`invoices:${invToDelete.profileId}`, updated);
      showToast('Invoice deleted from history.', 'success');
      // Trigger update of combined list
      // In a real application, state lift or dispatch would trigger this, here we rely on localStorage + simple state reload
      // But since profiles prop doesn't change, we can force trigger by modifying local state if needed. But wait,
      // since the parent App uses STORAGE helper, if we delete here, allInvoices relies on profiles array. If we trigger a page reload
      // or force-update, it updates. Let's force update the UI by altering a dummy counter or refreshing state.
      // Wait, we can just trigger a component refresh. Let's do a trick: we can use a dummy state.
      setRefreshKey(k => k + 1);
    }
  };

  const [refreshKey, setRefreshKey] = useState(0);
  
  // Re-memoize combined invoices using refresh key
  const memoizedInvoices = useMemo(() => {
    let list: Invoice[] = [];
    profiles.forEach((p) => {
      const invs: Invoice[] = STORAGE.get(`invoices:${p.id}`) || [];
      invs.forEach((inv) => {
        list.push({ ...inv, profileId: p.id });
      });
    });
    return list.sort((a, b) => b.generatedAt - a.generatedAt);
  }, [profiles, refreshKey]);

  const memoizedFiltered = useMemo(() => {
    return memoizedInvoices.filter((inv) => {
      const matchProfile = filterProfileId === 'all' || inv.profileId === filterProfileId;
      const matchSearch =
        !searchTerm.trim() ||
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());
      return matchProfile && matchSearch;
    });
  }, [memoizedInvoices, filterProfileId, searchTerm]);

  // Document Exports
  const handleExportPDF = async (inv: Invoice) => {
    showToast('Exporting PDF document...');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const el = document.getElementById('modal-bill-render');
      if (!el) {
        showToast('Error: Preview render element not found', 'error');
        return;
      }

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);

      const filename = `${inv.profileSnapshot.name.replace(/\s+/g, '_')}_${inv.invoiceNo.replace(/[\/\\]/g, '-')}_${inv.date}.pdf`;

      if (window.electronAPI) {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const res = await window.electronAPI.saveFile(filename, pdfBase64);
        if (res.success) {
          showToast(`PDF saved to ${res.filePath}`, 'success');
        }
      } else {
        pdf.save(filename);
        showToast('PDF downloaded successfully!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error creating PDF: ' + err.message, 'error');
    }
  };

  const handleExportImage = async (inv: Invoice) => {
    showToast('Exporting PNG image...');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const el = document.getElementById('modal-bill-render');
      if (!el) return;

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const filename = `${inv.profileSnapshot.name.replace(/\s+/g, '_')}_${inv.invoiceNo.replace(/[\/\\]/g, '-')}_${inv.date}.png`;
      const base64Data = canvas.toDataURL('image/png').split(',')[1];

      if (window.electronAPI) {
        const res = await window.electronAPI.saveFile(filename, base64Data);
        if (res.success) {
          showToast(`Image saved to ${res.filePath}`, 'success');
        }
      } else {
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Image downloaded successfully!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error exporting image: ' + err.message, 'error');
    }
  };

  const handlePrint = () => {
    if (window.electronAPI) {
      window.electronAPI.printApp();
    } else {
      window.print();
    }
  };

  return (
    <div className="history-layout">
      {/* Search & Filters */}
      <div className="history-filter-bar">
        <div className="autocomplete-wrap search-input">
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '32px' }}
            placeholder="Search by customer name or invoice number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-darker)',
            }}
          />
        </div>

        <select
          className="profile-select"
          style={{ width: '220px' }}
          value={filterProfileId}
          onChange={(e) => setFilterProfileId(e.target.value)}
        >
          <option value="all">All Businesses</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Invoices List Table */}
      {memoizedFiltered.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <h4>No invoices found</h4>
          <p>
            {searchTerm.trim() || filterProfileId !== 'all'
              ? 'Try adjusting your search query or filters'
              : 'Generate invoices in the New Invoice tab to see them here'}
          </p>
        </div>
      ) : (
        <div className="history-table-container">
          <table className="history-list-table">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Invoice No</th>
                <th style={{ width: '25%' }}>Business Profile</th>
                <th style={{ width: '25%' }}>Customer Name</th>
                <th style={{ width: '15%' }}>Date</th>
                <th style={{ width: '20%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {memoizedFiltered.map((inv) => {
                const business = profiles.find((p) => p.id === inv.profileId);
                return (
                  <tr key={inv.id}>
                    <td>
                      <span className="invoice-badge primary">{inv.invoiceNo}</span>
                    </td>
                    <td>
                      <strong style={{ color: 'white' }}>{business?.name || 'Deleted Profile'}</strong>
                    </td>
                    <td>{inv.customerName}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{inv.date}</td>
                    <td>
                      <div className="history-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedInvoice(inv)}
                          title="View Invoice Sheet"
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          className="btn btn-danger-ghost btn-sm"
                          onClick={() => handleDeleteInvoice(inv)}
                          title="Delete Invoice"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Custom Invoice Sheet Modal View (Eye icon click) */}
      {selectedInvoice && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div
            className="modal-box"
            style={{ maxWidth: '770px', padding: '0', background: 'transparent', border: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Action Bar */}
            <div
              style={{
                background: 'var(--bg-panel)',
                padding: '12px 24px',
                borderTopLeftRadius: 'var(--radius-lg)',
                borderTopRightRadius: 'var(--radius-lg)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ color: 'white', fontSize: '13px', margin: 0, fontWeight: 700 }}>
                Invoice Review ({selectedInvoice.invoiceNo})
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleExportPDF(selectedInvoice)}
                >
                  <FileText size={12} /> PDF
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleExportImage(selectedInvoice)}
                >
                  <ImageIcon size={12} /> Image
                </button>
                <button className="btn btn-ghost btn-sm" onClick={handlePrint}>
                  <Printer size={12} /> Print
                </button>
                <button className="btn-icon" onClick={() => setSelectedInvoice(null)}>
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Render sheet wrapper with unique ID for canvas grabbing */}
            <div
              style={{
                backgroundColor: 'var(--bg-app)',
                padding: '24px',
                maxHeight: '75vh',
                overflowY: 'auto',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div id="modal-bill-render">
                <InvoicePreview invoice={selectedInvoice} profile={selectedInvoice.profileSnapshot} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
