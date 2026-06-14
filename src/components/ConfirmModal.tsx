import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-box"
        style={{ maxWidth: '420px', padding: '0' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background:
                  variant === 'danger'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'var(--color-primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle
                size={16}
                style={{
                  color:
                    variant === 'danger' ? '#ef4444' : 'var(--color-primary)',
                }}
              />
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 700,
                color: 'white',
              }}
            >
              {title}
            </h3>
          </div>
          <button className="btn-icon" onClick={onCancel}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '20px 24px',
            color: 'var(--color-text-muted)',
            fontSize: '13px',
            lineHeight: '1.7',
          }}
        >
          {message}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 24px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className="btn btn-sm"
            style={
              variant === 'danger'
                ? {
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    fontWeight: 600,
                  }
                : {
                    background: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 600,
                  }
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
