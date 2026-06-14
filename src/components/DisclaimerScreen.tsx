import React, { useState, useRef } from 'react';
import logoImg from '../assets/logo.svg';
import { ShieldAlert, Scale } from 'lucide-react';

interface DisclaimerScreenProps {
  onAccept: () => void;
}

export default function DisclaimerScreen({ onAccept }: DisclaimerScreenProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // Check if scrolled within 15px of bottom
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 15;
    if (isAtBottom) {
      setHasScrolledToBottom(true);
    }
  };

  React.useEffect(() => {
    const el = scrollContainerRef.current;
    const checkScroll = () => {
      if (el && el.scrollHeight <= el.clientHeight + 15) {
        setHasScrolledToBottom(true);
      }
    };
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => {
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  return (
    <div className="startup-container" style={{ width: '100%', height: '100%' }}>
      <div className="startup-card" style={{ maxWidth: '640px', padding: '32px' }}>
        {/* Logo and Branding */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
          <img
            src={logoImg}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
            }}
            alt="CentraGST Logo"
          />
          <h2>CentraGST</h2>
          <div className="enterprise-badge" style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: 'var(--color-primary)',
            fontWeight: 700,
            marginTop: '4px',
            background: 'var(--color-primary-light)',
            padding: '4px 10px',
            borderRadius: '100px'
          }}>
            End-User License &amp; Disclaimer
          </div>
        </div>

        {/* Scrollable Terms Box */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="disclaimer-scroll-box"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            maxHeight: '220px',
            overflowY: 'auto',
            textAlign: 'left',
            fontSize: '12.5px',
            lineHeight: '1.6',
            color: 'var(--color-text)',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', gap: '8px', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '12px', alignItems: 'center' }}>
            <ShieldAlert size={16} />
            <span>CRITICAL LEGAL NOTICE &amp; LIABILITY LIMITATION</span>
          </div>
          
          <p style={{ marginBottom: '12px' }}>
            Please read this document carefully before proceeding. By checking the box and clicking "Accept &amp; Continue", you agree to be bound by the terms of this license and exculpation agreement.
          </p>

          <h4 style={{ color: 'white', fontSize: '13px', margin: '14px 0 6px 0', fontWeight: 600 }}>1. Offline Local Architecture</h4>
          <p style={{ marginBottom: '12px', color: 'var(--color-text-muted)' }}>
            CentraGST operates entirely as an offline local application. All business profiles, invoices, product catalogs, and configurations are stored directly on your computer's local hard drive via an SQLite database. The developers do not host, store, transfer, or maintain any of your database records, business data, or generated invoices. You are solely responsible for managing, backing up, and securing your database file.
          </p>

          <h4 style={{ color: 'white', fontSize: '13px', margin: '14px 0 6px 0', fontWeight: 600 }}>2. Complete Exculpation of Liability</h4>
          <p style={{ marginBottom: '12px', color: 'var(--color-text-muted)' }}>
            Under no circumstances shall the developer(s), contributors, or distributors of CentraGST be held liable for any direct, indirect, incidental, special, or consequential damages. This includes, but is not limited to, damages for loss of profits, tax penalties, audit adjustments, business interruptions, loss of data, or incorrect financial and tax calculations resulting from the use or inability to use this software.
          </p>

          <h4 style={{ color: 'white', fontSize: '13px', margin: '14px 0 6px 0', fontWeight: 600 }}>3. No Financial, Legal, or Tax Advice</h4>
          <p style={{ marginBottom: '12px', color: 'var(--color-text-muted)' }}>
            The content, calculations, calculations math (including CGST, SGST, IGST, and round-offs) generated by this application are provided "as is" for convenience without warranties of any kind. This software does not constitute financial, legal, tax, or professional accounting advice. It is the user's sole responsibility to audit and verify the accuracy of all tax rates, totals, and values before printing, exporting, or presenting invoices to customers or tax authorities.
          </p>

          <h4 style={{ color: 'white', fontSize: '13px', margin: '14px 0 6px 0', fontWeight: 600 }}>4. Statutory GST Compliance</h4>
          <p style={{ marginBottom: '12px', color: 'var(--color-text-muted)' }}>
            GST laws, rates, HSN requirements, and invoicing rules vary by jurisdiction and are subject to frequent updates. You are responsible for ensuring that the invoices you generate comply with all local, state, and national tax regulations.
          </p>
        </div>

        {/* Scroll helper indicator */}
        {!hasScrolledToBottom && (
          <div className="scroll-indicator" style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Scale size={12} />
            <span>Please scroll to the bottom of the terms to enable acceptance.</span>
          </div>
        )}

        {/* Custom Checkbox Acceptance */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', textAlign: 'left', marginBottom: '24px' }}>
          <input
            id="accept-terms-checkbox"
            type="checkbox"
            checked={accepted}
            disabled={!hasScrolledToBottom}
            onChange={(e) => setAccepted(e.target.checked)}
            style={{
              marginTop: '3px',
              cursor: hasScrolledToBottom ? 'pointer' : 'not-allowed',
              accentColor: 'var(--color-primary)'
            }}
          />
          <label 
            htmlFor="accept-terms-checkbox" 
            style={{
              fontSize: '12px',
              color: hasScrolledToBottom ? 'var(--color-text)' : 'var(--color-text-muted)',
              cursor: hasScrolledToBottom ? 'pointer' : 'not-allowed',
              userSelect: 'none',
              lineHeight: '1.4'
            }}
          >
            I have read, understood, and accept the Developer Disclaimer and End-User License Agreement. I hold the developers harmless from any tax calculation correctness or business liabilities.
          </label>
        </div>

        {/* Continue Button */}
        <button
          className="btn btn-primary"
          disabled={!accepted || !hasScrolledToBottom}
          onClick={onAccept}
          style={{
            width: '100%',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          Accept &amp; Continue
        </button>
      </div>
    </div>
  );
}
