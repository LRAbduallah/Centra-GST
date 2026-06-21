import React, { useState, useRef } from 'react';
import { Profile } from '../types';
import { Camera, Trash2, ArrowLeft, ArrowRight, Save, X } from 'lucide-react';

interface ProfileModalProps {
  profile?: Profile;
  onSave: (profile: Profile) => void;
  onCancel: () => void;
}

const DEFAULT_PROFILE: Omit<Profile, 'id'> = {
  name: '',
  bizName: '',
  logo: '',
  gstNo: '',
  address1: '',
  address2: '',
  phone: '',
  tagline: '',
  footerNote: 'No Return once sold. No Cash Refund.',
  gstRate: 18,
  cgstPct: 9,
  sgstPct: 9,
  invoicePrefix: '',
  invoiceCounter: 1,
  invoiceFormat: 'PREFIX_COUNTER',
  bankDetails: '',
  terms: '',
  hsnLabel: 'HSN',
};

export default function ProfileModal({ profile, onSave, onCancel }: ProfileModalProps) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<Profile>(() => {
    if (profile) return { ...profile };
    return {
      id: crypto.randomUUID(),
      ...DEFAULT_PROFILE,
    } as Profile;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateField = (key: keyof Profile, value: any) => {
    setState((prev) => {
      const updated = { ...prev, [key]: value };

      // Auto-recalculate splits if global GST rate changes
      if (key === 'gstRate') {
        const rate = Number(value) || 0;
        updated.cgstPct = rate / 2;
        updated.sgstPct = rate / 2;
      }
      return updated;
    });
  };

  // Handle logo upload — compress to max 400px JPEG before storing
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX = 400;
        let w = img.width;
        let h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) {
            h = Math.round((h * MAX) / w);
            w = MAX;
          } else {
            w = Math.round((w * MAX) / h);
            h = MAX;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        updateField('logo', canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateField('logo', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Validate fields for each step
  const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;

  const canGoNext = () => {
    if (step === 0) {
      return state.name.trim() !== '' && state.bizName.trim() !== '';
    }
    if (step === 1) {
      // Validate 15-char GSTIN format
      if (!GSTIN_REGEX.test(state.gstNo.trim())) return false;
      return state.address1.trim() !== '';
    }
    if (step === 2) {
      // GST rates validation: CGST + SGST must equal GST Rate
      return (
        state.gstRate >= 0 &&
        state.cgstPct >= 0 &&
        state.sgstPct >= 0 &&
        state.cgstPct + state.sgstPct === state.gstRate
      );
    }
    return true;
  };

  const handleNext = () => {
    if (canGoNext()) setStep((s) => s + 1);
  };

  const handleBack = () => {
    setStep((s) => s - 1);
  };

  const handleSave = () => {
    if (canGoNext()) {
      onSave(state);
    }
  };

  const stepsCount = 4;

  return (
    <div className="modal-body" style={{ minWidth: '400px' }}>
      {/* Wizard Step Dots */}
      <div className="step-indicator">
        {Array.from({ length: stepsCount }).map((_, idx) => (
          <div
            key={idx}
            className={`step-dot ${idx === step ? 'active' : idx < step ? 'done' : ''}`}
          />
        ))}
      </div>

      {/* STEP 1: Business Identity */}
      {step === 0 && (
        <div>
          <div className="form-section-title">Step 1: Business Identity</div>
          
          <div className="form-grid single">
            <div className="form-group">
              <label className="form-label">Profile Label (internal only) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Vision Opticals (Nagercoil)"
                value={state.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Business Name (on invoice header) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="VISION OPTICALS"
                value={state.bizName}
                onChange={(e) => updateField('bizName', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tagline (printed below logo/name)</label>
              <input
                type="text"
                className="form-input"
                placeholder="The Perfect Partner Of Your Eyes"
                value={state.tagline}
                onChange={(e) => updateField('tagline', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Logo</label>
              <div 
                className="logo-upload-box"
                onClick={() => fileInputRef.current?.click()}
              >
                {state.logo ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={state.logo} alt="Business Logo" />
                    <button 
                      className="btn-icon" 
                      style={{ 
                        position: 'absolute', 
                        top: '-10px', 
                        right: '-10px', 
                        backgroundColor: '#ff6b6b', 
                        color: 'white',
                        border: 'none',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%'
                      }}
                      onClick={removeLogo}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Camera size={24} style={{ color: 'var(--color-text-darker)', marginBottom: '4px' }} />
                    <p className="title">Click to upload logo</p>
                    <p className="subtitle">PNG, JPG, SVG supported</p>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleLogoUpload}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Contact Details & GST */}
      {step === 1 && (
        <div>
          <div className="form-section-title">Step 2: Contact Details & GST</div>

          <div className="form-grid single">
            <div className="form-group">
              <label className="form-label">GSTIN (15-character GST Number) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="33AAYFV2352E1ZZ"
                maxLength={15}
                value={state.gstNo}
                onChange={(e) => updateField('gstNo', e.target.value.toUpperCase())}
              />
              {state.gstNo.trim().length > 0 && !GSTIN_REGEX.test(state.gstNo.trim()) && (
                <p style={{ color: '#f59e0b', fontSize: '11px', marginTop: '5px', fontWeight: 500 }}>
                  ⚠ Format: 2 digits + 5 letters + 4 digits + letter + alphanumeric + Z + alphanumeric (e.g. 33AAYFV2352E1ZZ)
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Address Line 1 *</label>
              <input
                type="text"
                className="form-input"
                placeholder="961, OPP: Dr.J. Mathias KP Road"
                value={state.address1}
                onChange={(e) => updateField('address1', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Address Line 2 (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nagercoil - 629001"
                value={state.address2}
                onChange={(e) => updateField('address2', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone / Mobile</label>
              <input
                type="text"
                className="form-input"
                placeholder="04652-220560"
                value={state.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: GST & Invoice Config */}
      {step === 2 && (
        <div>
          <div className="form-section-title">Step 3: GST & Invoice Config</div>

          <div className="form-grid triple">
            <div className="form-group">
              <label className="form-label">GST Rate (%)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="100"
                value={state.gstRate}
                onChange={(e) => updateField('gstRate', Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">CGST Rate (%)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="100"
                step="0.1"
                value={state.cgstPct}
                onChange={(e) => updateField('cgstPct', Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">SGST Rate (%)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="100"
                step="0.1"
                value={state.sgstPct}
                onChange={(e) => updateField('sgstPct', Number(e.target.value))}
              />
            </div>
          </div>

          {state.cgstPct + state.sgstPct !== state.gstRate && (
            <p style={{ color: '#ff6b6b', fontSize: '11px', marginTop: '6px', fontWeight: 500 }}>
              ⚠ Warning: CGST ({state.cgstPct}%) + SGST ({state.sgstPct}%) must equal total GST ({state.gstRate}%).
            </p>
          )}

          <div className="divider" />

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Invoice Prefix</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. VO-"
                value={state.invoicePrefix}
                onChange={(e) => updateField('invoicePrefix', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Starting Counter Number</label>
              <input
                type="number"
                className="form-input"
                min="1"
                value={state.invoiceCounter}
                onChange={(e) => updateField('invoiceCounter', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-grid single" style={{ marginTop: '8px' }}>
            <div className="form-group">
              <label className="form-label">Invoice Number Format</label>
              <select
                className="profile-select"
                value={state.invoiceFormat}
                onChange={(e) => updateField('invoiceFormat', e.target.value)}
              >
                <option value="PREFIX_COUNTER">Prefix + Counter (e.g. VO-0001)</option>
                <option value="YEAR_COUNTER">Year/Counter (e.g. 2026/0001)</option>
              </select>
            </div>
          </div>

          <div className="form-grid single" style={{ marginTop: '8px' }}>
            <div className="form-group">
              <label className="form-label">HSN Field Label (e.g. HSN, Serial No, S.No)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. HSN (default)"
                value={state.hsnLabel || ''}
                onChange={(e) => updateField('hsnLabel', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Footer Notes & Terms */}
      {step === 3 && (
        <div>
          <div className="form-section-title">Step 4: Footer & Terms (Optional)</div>

          <div className="form-grid single">
            <div className="form-group">
              <label className="form-label">Footer Note / Message</label>
              <input
                type="text"
                className="form-input"
                placeholder="No Return once sold. No Cash Refund."
                value={state.footerNote}
                onChange={(e) => updateField('footerNote', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bank Accounts Details (for customer transfer)</label>
              <textarea
                className="form-input form-textarea"
                rows={3}
                placeholder="Bank Name: State Bank of India&#10;A/C No: 1234567890&#10;IFSC: SBIN0001234"
                value={state.bankDetails}
                onChange={(e) => updateField('bankDetails', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Terms and Conditions</label>
              <textarea
                className="form-input form-textarea"
                rows={3}
                placeholder="1. Goods once sold cannot be taken back.&#10;2. Interest @18% will be charged if bill is unpaid."
                value={state.terms}
                onChange={(e) => updateField('terms', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Wizard Footer controls */}
      <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', marginTop: '20px', padding: '16px 0 0' }}>
        <button className="btn btn-ghost" onClick={onCancel}>
          <X size={14} /> Cancel
        </button>

        <div style={{ flex: 1 }} />

        {step > 0 && (
          <button className="btn btn-ghost" onClick={handleBack}>
            <ArrowLeft size={14} /> Back
          </button>
        )}

        {step < stepsCount - 1 ? (
          <button className="btn btn-primary" onClick={handleNext} disabled={!canGoNext()}>
            Next <ArrowRight size={14} />
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleSave} disabled={!canGoNext()}>
            <Save size={14} /> Save Business
          </button>
        )}
      </div>
    </div>
  );
}
