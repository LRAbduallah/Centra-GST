import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Profile, Product, LineItem, Invoice } from '../types';
import InvoicePreview from './InvoicePreview';
import { STORAGE } from '../App';
import { calcTotals } from '../utils/calculations';
import { Plus, Printer, Download, FileText, Image as ImageIcon, RotateCcw, Save, X, Search, AlertTriangle } from 'lucide-react';

interface InvoiceEditorProps {
  profile: Profile;
  catalog: Product[];
  onSaveProfile: (updated: Profile) => void;
  onUpdateCatalog: (newCatalog: Product[]) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  pendingCatalogAdd: Product | null;
  clearPendingCatalogAdd: () => void;
}

function todayDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

export default function InvoiceEditor({
  profile,
  catalog,
  onSaveProfile,
  onUpdateCatalog,
  showToast,
  pendingCatalogAdd,
  clearPendingCatalogAdd,
}: InvoiceEditorProps) {
  // Generate invoice number format
  const makeInvoiceNo = (prof: Profile) => {
    const p = prof.invoicePrefix || '';
    const c = prof.invoiceCounter || 1;
    if (prof.invoiceFormat === 'YEAR_COUNTER') {
      return `${new Date().getFullYear()}/${String(c).padStart(4, '0')}`;
    }
    return `${p}${c}`;
  };

  const createInitialState = (prof: Profile) => ({
    customerName: '',
    mobile: '',
    customerGst: '',
    date: todayDate(),
    invoiceNo: makeInvoiceNo(prof),
    items: [
      {
        id: Math.random().toString(36).substring(2, 9),
        hsn: '',
        description: '',
        qty: 1,
        netRate: '',
        gstPct: null,
      },
    ],
  });

  const [inv, setInv] = useState(() => createInitialState(profile));
  const [activeCatalogRow, setActiveCatalogRow] = useState<number | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);

  // Catalog Browser Modal States
  const [showCatalogBrowser, setShowCatalogBrowser] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [selectedModalProducts, setSelectedModalProducts] = useState<Product[]>([]);

  const filteredModalCatalog = useMemo(() => {
    const query = modalSearch.trim().toLowerCase();
    if (!query) return catalog;
    return catalog.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.hsn.includes(query) ||
        (c.category && c.category.toLowerCase().includes(query))
    );
  }, [modalSearch, catalog]);

  const toggleModalProductSelection = (prod: Product) => {
    setSelectedModalProducts((prev) => {
      const alreadySelected = prev.some((p) => p.name === prod.name);
      if (alreadySelected) {
        return prev.filter((p) => p.name !== prod.name);
      } else {
        return [...prev, prod];
      }
    });
  };

  const handleAddSelectedFromModal = () => {
    if (selectedModalProducts.length === 0) return;

    setInv((prev) => {
      let updatedItems = [...prev.items];

      const firstItem = prev.items[0];
      const isFirstBlank =
        prev.items.length === 1 &&
        !firstItem.description.trim() &&
        !firstItem.hsn.trim() &&
        !firstItem.netRate;

      const newItems = selectedModalProducts.map((prod) => ({
        id: Math.random().toString(36).substring(2, 9),
        hsn: prod.hsn || '',
        description: prod.name,
        qty: 1,
        netRate: prod.rate || '',
        gstPct: null,
      }));

      if (isFirstBlank) {
        updatedItems = newItems;
      } else {
        updatedItems = [...updatedItems, ...newItems];
      }

      return {
        ...prev,
        items: updatedItems,
      };
    });

    showToast(`Added ${selectedModalProducts.length} items to invoice!`, 'success');
    setSelectedModalProducts([]);
    setModalSearch('');
    setShowCatalogBrowser(false);
  };

  // Sync with profile changes (reset only when switching profiles)
  useEffect(() => {
    setInv(createInitialState(profile));
    setIsGenerated(false);
  }, [profile.id]);

  // Sync pending catalog add from Settings
  useEffect(() => {
    if (pendingCatalogAdd) {
      setInv((prev) => {
        const firstItem = prev.items[0];
        const isFirstBlank =
          prev.items.length === 1 &&
          !firstItem.description.trim() &&
          !firstItem.hsn.trim() &&
          !firstItem.netRate;

        const newItem = {
          id: Math.random().toString(36).substring(2, 9),
          hsn: pendingCatalogAdd.hsn || '',
          description: pendingCatalogAdd.name,
          qty: 1,
          netRate: pendingCatalogAdd.rate || '',
          gstPct: null,
        };

        if (isFirstBlank) {
          return {
            ...prev,
            items: [newItem],
          };
        } else {
          return {
            ...prev,
            items: [...prev.items, newItem],
          };
        }
      });
      clearPendingCatalogAdd();
    }
  }, [pendingCatalogAdd, clearPendingCatalogAdd]);

  const totals = useMemo(() => calcTotals(inv.items, profile), [inv.items, profile]);

  const updateInvField = (k: keyof typeof inv, v: any) => {
    setInv((prev) => ({ ...prev, [k]: v }));
  };

  const updateItemField = (idx: number, k: keyof LineItem, v: any) => {
    setInv((prev) => {
      const updatedItems = prev.items.map((item, i) => {
        if (i === idx) {
          return { ...item, [k]: v };
        }
        return item;
      });
      return { ...prev, items: updatedItems };
    });
  };

  const addItemRow = () => {
    setInv((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Math.random().toString(36).substring(2, 9),
          hsn: '',
          description: '',
          qty: 1,
          netRate: '',
          gstPct: null,
        },
      ],
    }));
  };

  const deleteItemRow = (idx: number) => {
    if (inv.items.length <= 1) {
      showToast('At least one item is required', 'error');
      return;
    }
    setInv((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  // Keyboard shortcut listener
  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Enter' && idx === inv.items.length - 1) {
      e.preventDefault();
      addItemRow();
    }
  };

  // Reset editor state
  const handleReset = () => {
    if (window.confirm('Are you sure you want to clear current invoice fields?')) {
      setInv(createInitialState(profile));
      setIsGenerated(false);
      showToast('Form cleared', 'success');
    }
  };

  // Autocomplete selections
  const filteredCatalog = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    if (!query) {
      return catalog.slice(0, 15); // Return first 15 catalog items to pick directly when focused/empty!
    }
    return catalog.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.hsn.includes(query)
    ).slice(0, 15);
  }, [catalogSearch, catalog]);

  const selectCatalogItem = (rowIdx: number, prod: Product) => {
    updateItemField(rowIdx, 'description', prod.name);
    updateItemField(rowIdx, 'hsn', prod.hsn || '');
    updateItemField(rowIdx, 'netRate', prod.rate || '');
    setActiveCatalogRow(null);
    setCatalogSearch('');
  };

  // Save/Generate Action
  const handleGenerate = () => {
    if (!inv.customerName.trim()) {
      showToast('Customer name is required', 'error');
      return;
    }
    
    // Check if items are complete
    const incomplete = inv.items.some(it => !it.description.trim() || !it.netRate);
    if (incomplete) {
      showToast('Please fill out descriptions and rates for all items', 'error');
      return;
    }

    const savedInvoice: Invoice = {
      id: Math.random().toString(36).substring(2, 9),
      profileId: profile.id,
      customerName: inv.customerName,
      mobile: inv.mobile,
      customerGst: inv.customerGst,
      date: inv.date,
      invoiceNo: inv.invoiceNo,
      items: inv.items.map(it => ({ ...it, qty: Number(it.qty) || 1, netRate: Number(it.netRate) || 0 })),
      profileSnapshot: { ...profile },
      generatedAt: Date.now(),
      status: 'generated',
    };

    // Check and efficiently auto-add new items to profile catalog (time O(N) complexity)
    const currentCatalog = [...catalog];
    let catalogUpdated = false;
    const catalogNameMap = new Map(currentCatalog.map(p => [p.name.toLowerCase(), p]));

    inv.items.forEach((item) => {
      const cleanName = item.description.trim();
      if (!cleanName) return;

      if (!catalogNameMap.has(cleanName.toLowerCase())) {
        const newProduct: Product = {
          id: Math.random().toString(36).substring(2, 9),
          name: cleanName,
          hsn: item.hsn || '',
          rate: String(item.netRate || '0'),
          category: 'Auto-Added',
        };
        currentCatalog.push(newProduct);
        catalogNameMap.set(cleanName.toLowerCase(), newProduct);
        catalogUpdated = true;
      }
    });

    if (catalogUpdated) {
      onUpdateCatalog(currentCatalog);
    }

    // Save to history
    const existing = STORAGE.get(`invoices:${profile.id}`) || [];
    STORAGE.set(`invoices:${profile.id}`, [...existing, savedInvoice]);

    // Increment profile counter
    const updatedProfile: Profile = {
      ...profile,
      invoiceCounter: (profile.invoiceCounter || 1) + 1,
    };
    onSaveProfile(updatedProfile);
    setIsGenerated(true);
    showToast('Invoice generated & saved!', 'success');
  };

  // Export PDF (supports Electron Native dialog and Browser fallback)
  const handleExportPDF = async () => {
    const el = document.getElementById('bill-preview');
    if (!el) return;

    showToast('Preparing PDF document...');
    try {
      // Dynamic imports for performance
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

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

      const filename = `${profile.name.replace(/\s+/g, '_')}_${inv.invoiceNo.replace(/[\/\\]/g, '-')}_${inv.date}.pdf`;

      if (window.electronAPI) {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const res = await window.electronAPI.saveFile(filename, pdfBase64);
        if (res.success) {
          showToast(`PDF saved to ${res.filePath}`, 'success');
        } else if (!res.canceled) {
          showToast('Failed to save PDF file.', 'error');
        }
      } else {
        // Fallback for browser
        pdf.save(filename);
        showToast('PDF downloaded successfully!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error exporting PDF: ' + err.message, 'error');
    }
  };

  // Export PNG (supports Electron Native dialog and Browser fallback)
  const handleExportImage = async () => {
    const el = document.getElementById('bill-preview');
    if (!el) return;

    showToast('Preparing PNG image...');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const filename = `${profile.name.replace(/\s+/g, '_')}_${inv.invoiceNo.replace(/[\/\\]/g, '-')}_${inv.date}.png`;
      const base64Data = canvas.toDataURL('image/png').split(',')[1];

      if (window.electronAPI) {
        const res = await window.electronAPI.saveFile(filename, base64Data);
        if (res.success) {
          showToast(`Image saved to ${res.filePath}`, 'success');
        } else if (!res.canceled) {
          showToast('Failed to save image file.', 'error');
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
    <div className="invoice-editor">
      {/* Editor Form */}
      <div className="editor-form-panel">
        
        {/* Section: Customer Details */}
        <div className="form-section">
          <div className="form-section-title">Customer Details</div>
          
          <div className="form-grid single">
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. JOHN DOE"
                disabled={isGenerated}
                value={inv.customerName}
                onChange={(e) => updateInvField('customerName', e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 9876543210"
                disabled={isGenerated}
                value={inv.mobile}
                onChange={(e) => updateInvField('mobile', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Customer GST No. (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="15-character GSTIN"
                disabled={isGenerated}
                maxLength={15}
                value={inv.customerGst}
                onChange={(e) => updateInvField('customerGst', e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Invoice Date</label>
              <input
                type="text"
                className="form-input"
                placeholder="DD-MM-YYYY"
                disabled={isGenerated}
                value={inv.date}
                onChange={(e) => updateInvField('date', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Invoice Number</label>
              <input
                type="text"
                className="form-input"
                disabled={isGenerated}
                value={inv.invoiceNo}
                onChange={(e) => updateInvField('invoiceNo', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section: Line Items */}
        <div className="form-section">
          <div className="form-section-title">Invoice Line Items</div>
          
          <div className="editor-items-container">
            <table className="editor-table">
              <thead>
                <tr>
                  <th style={{ width: '18%' }}>HSN</th>
                  <th style={{ width: '40%' }}>Description</th>
                  <th style={{ width: '12%' }}>Qty</th>
                  <th style={{ width: '18%' }}>Net Price</th>
                  <th style={{ width: '12%' }}></th>
                </tr>
              </thead>
              <tbody>
                {inv.items.map((item, idx) => {
                  const itemGst = item.gstPct !== null ? item.gstPct : profile.gstRate;
                  const itemNet = parseFloat(item.netRate as string) || 0;
                  const itemRateInclTax = itemNet * (1 + itemGst / 100);
                  const itemTotal = itemRateInclTax * (Number(item.qty) || 0);

                  return (
                    <tr key={item.id}>
                      <td>
                        <input
                          type="text"
                          className="table-input"
                          placeholder="HSN"
                          disabled={isGenerated}
                          value={item.hsn}
                          onChange={(e) => updateItemField(idx, 'hsn', e.target.value)}
                        />
                      </td>
                      <td className="autocomplete-wrap">
                        <input
                          type="text"
                          className="table-input"
                          placeholder="Description"
                          disabled={isGenerated}
                          value={item.description}
                          onChange={(e) => {
                            updateItemField(idx, 'description', e.target.value);
                            setCatalogSearch(e.target.value);
                            setActiveCatalogRow(idx);
                          }}
                          onFocus={() => {
                            setCatalogSearch(item.description || '');
                            setActiveCatalogRow(idx);
                          }}
                          onBlur={() => {
                            // Delay to allow item clicks
                            setTimeout(() => {
                              if (activeCatalogRow === idx) setActiveCatalogRow(null);
                            }, 200);
                          }}
                        />

                        {/* Autocomplete Dropdown list */}
                        {activeCatalogRow === idx && filteredCatalog.length > 0 && (
                          <div className="autocomplete-list">
                            {filteredCatalog.map((prod, pIdx) => (
                              <div
                                key={pIdx}
                                className="autocomplete-item"
                                onMouseDown={() => selectCatalogItem(idx, prod)}
                              >
                                <span>{prod.name}</span>
                                <span className="rate">₹{Number(prod.rate || 0).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          className="table-input num"
                          placeholder="1"
                          disabled={isGenerated}
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateItemField(idx, 'qty', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="table-input num"
                          placeholder="0.00"
                          disabled={isGenerated}
                          value={item.netRate}
                          onChange={(e) => updateItemField(idx, 'netRate', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx)}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="table-row-del"
                          disabled={isGenerated}
                          onClick={() => deleteItemRow(idx)}
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!isGenerated && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="add-row-btn" style={{ flex: 1 }} onClick={addItemRow}>
                + Add Blank Row
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1, borderStyle: 'dashed', borderRadius: 'var(--radius-md)', fontSize: '11px', fontWeight: 600, padding: '8px' }}
                onClick={() => setShowCatalogBrowser(true)}
              >
                + Add From Catalog
              </button>
            </div>
          )}
        </div>

        {/* Section: Live Calculations Totals */}
        <div className="form-totals-panel">
          <div className="totals-row">
            <span>Sub Total (Before Tax)</span>
            <span className="val">₹{totals.subTotal.toFixed(2)}</span>
          </div>
          <div className="totals-row">
            <span>GST Tax Amount</span>
            <span className="val">₹{totals.totalGst.toFixed(2)}</span>
          </div>
          <div className="totals-row">
            <span>CGST ({totals.cgstPct}%)</span>
            <span className="val">₹{totals.cgst.toFixed(2)}</span>
          </div>
          <div className="totals-row">
            <span>SGST ({totals.sgstPct}%)</span>
            <span className="val">₹{totals.sgst.toFixed(2)}</span>
          </div>
          <div className="totals-row grand">
            <span>Grand Total</span>
            <span className="val">₹{totals.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Action button rows */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
          {!isGenerated ? (
            <>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleGenerate}>
                <Save size={14} /> Generate Invoice
              </button>
              <button className="btn btn-ghost" onClick={handleReset}>
                <RotateCcw size={14} /> Clear
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                setInv(createInitialState(profile));
                setIsGenerated(false);
                showToast('Ready for new invoice', 'success');
              }}>
                <Plus size={14} /> New Invoice
              </button>
              <button className="btn btn-ghost" onClick={handleExportPDF}>
                <FileText size={14} /> Save PDF
              </button>
              <button className="btn btn-ghost" onClick={handleExportImage}>
                <ImageIcon size={14} /> Save Image
              </button>
              <button className="btn btn-ghost" onClick={handlePrint}>
                <Printer size={14} /> Print
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Live Preview */}
      <div className="preview-interactive-panel">
        <div className="preview-header-bar">
          <h3>Live Invoice Preview</h3>
          <div className="preview-actions">
            <button className="btn-icon" onClick={handleExportPDF} title="Export PDF">
              <FileText size={14} />
            </button>
            <button className="btn-icon" onClick={handleExportImage} title="Export PNG Image">
              <ImageIcon size={14} />
            </button>
            <button className="btn-icon" onClick={handlePrint} title="Direct System Print">
              <Printer size={14} />
            </button>
          </div>
        </div>

        <InvoicePreview invoice={inv} profile={profile} />
      </div>

      {/* Catalog Browser Modal (Add multiple at once) */}
      {showCatalogBrowser && (
        <div className="modal-overlay" onClick={() => setShowCatalogBrowser(false)}>
          <div className="modal-box" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Browse Product Catalog ({profile.bizName})</h3>
              <button className="btn-icon" onClick={() => setShowCatalogBrowser(false)}>
                <X size={14} />
              </button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Search filter */}
              <div className="autocomplete-wrap" style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '32px' }}
                  placeholder="Filter catalog products..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
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

              {/* Products List */}
              {filteredModalCatalog.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <AlertTriangle size={32} />
                  <h4>No catalog items found</h4>
                  <p>Add products in settings or search another query.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredModalCatalog.map((prod) => {
                    const isSelected = selectedModalProducts.some((p) => p.name === prod.name);
                    return (
                      <div
                        key={prod.id || prod.name}
                        className="profile-row-item"
                        style={{
                          margin: 0,
                          cursor: 'pointer',
                          borderColor: isSelected ? 'var(--color-primary)' : 'var(--border-color)',
                          backgroundColor: isSelected ? 'var(--bg-active)' : 'var(--bg-card)',
                        }}
                        onClick={() => toggleModalProductSelection(prod)}
                      >
                        <div className="info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            style={{ cursor: 'pointer' }}
                          />
                          <div>
                            <h4 style={{ margin: 0 }}>{prod.name}</h4>
                            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                              HSN: {prod.hsn || '—'} • Category: {prod.category || 'General'}
                            </p>
                          </div>
                        </div>
                        <div className="table-text-display" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                          ₹{Number(prod.rate || 0).toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCatalogBrowser(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={selectedModalProducts.length === 0}
                onClick={handleAddSelectedFromModal}
              >
                Add Selected ({selectedModalProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
