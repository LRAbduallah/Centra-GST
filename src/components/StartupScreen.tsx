import React from 'react';
import { Profile } from '../types';
import { Plus, Briefcase } from 'lucide-react';

interface StartupScreenProps {
  profiles: Profile[];
  onSelect: (profile: Profile) => void;
  onAdd: () => void;
}

export default function StartupScreen({ profiles, onSelect, onAdd }: StartupScreenProps) {
  const hasProfiles = profiles.length > 0;

  return (
    <div className="startup-container">
      {hasProfiles ? (
        <div className="startup-card" style={{ maxWidth: '640px' }}>
          <h2>InvoiceForge</h2>
          <p className="subtitle">Select a business profile to start billing</p>

          <div className="startup-grid">
            {profiles.map((p) => (
              <div key={p.id} className="startup-biz-card" onClick={() => onSelect(p)}>
                {p.logo ? (
                  <img src={p.logo} alt={p.name} />
                ) : (
                  <div style={{ color: 'var(--color-primary)', marginBottom: '8px' }}>
                    <Briefcase size={24} />
                  </div>
                )}
                <h3>{p.name}</h3>
                <p>{p.bizName}</p>
                <p style={{ opacity: 0.6 }}>{p.gstNo || 'No GST Setup'}</p>
              </div>
            ))}

            {/* Add Business quick card */}
            <div className="startup-add-card" onClick={onAdd}>
              <Plus size={24} />
              <span>Add Business</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="startup-card">
          <h2>Welcome to InvoiceForge</h2>
          <p className="subtitle">
            Create your first business profile to generate GST-compliant tax bills.
          </p>
          <button className="btn btn-primary" style={{ width: '100%', padding: '12px' }} onClick={onAdd}>
            <Plus size={16} />
            Set Up My Business
          </button>
        </div>
      )}
    </div>
  );
}
