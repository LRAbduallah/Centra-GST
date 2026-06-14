import React, { useMemo } from 'react';
import { Invoice, Profile } from '../types';
import { calcTotals } from '../utils/calculations';

interface InvoicePreviewProps {
  invoice: Partial<Invoice> & { items: any[] };
  profile: Profile;
}

export default function InvoicePreview({ invoice, profile }: InvoicePreviewProps) {
  const { lines, subTotal, totalGst, grandTotal, roundOff, cgst, sgst, cgstPct, sgstPct } = useMemo(
    () => calcTotals(invoice.items || [], profile),
    [invoice.items, profile]
  );

  const formatCurrency = (val: number) => Number(val || 0).toFixed(2);

  return (
    <div className="bill-wrapper" id="bill-preview">
      {/* Title */}
      <div className="bill-title">TAX BILL</div>

      {/* Header Info */}
      <div className="bill-header">
        <div className="bill-header-left">
          <div className="bill-gst">GST NO: {profile.gstNo || 'Not Setup'}</div>
          <div className="bill-address">{profile.address1 || 'Business Address'}</div>
          {profile.address2 && <div className="bill-address">{profile.address2}</div>}
          {profile.phone && <div className="bill-phone">Phone: {profile.phone}</div>}
        </div>
        <div className="bill-logo-area">
          {profile.logo ? (
            <img src={profile.logo} className="bill-logo-img" alt="logo" />
          ) : (
            <div className="bill-logo-text">
              {profile.bizName ? (
                <>
                  {profile.bizName.split(' ')[0]}
                  <span>{profile.bizName.split(' ').slice(1).join(' ')}</span>
                </>
              ) : (
                'BUSINESS'
              )}
            </div>
          )}
          {profile.tagline && <div className="bill-tagline">{profile.tagline}</div>}
        </div>
      </div>

      {/* Customer details */}
      <div className="bill-customer">
        <div className="bill-customer-left">
          <div>
            <label>Name:</label>
            {invoice.customerName || '—'}
          </div>
          <div>
            <label>Mobile No.:</label>
            {invoice.mobile || '—'}
          </div>
          {invoice.customerGst && (
            <div>
              <label>GST NO.:</label>
              {invoice.customerGst}
            </div>
          )}
        </div>
        <div className="bill-customer-right">
          <div>
            <label>Date:</label>
            {invoice.date || '—'}
          </div>
          <div>
            <label>Invoice No.:</label>
            {invoice.invoiceNo || '—'}
          </div>
        </div>
      </div>

      {/* Bill Table */}
      <div className="bill-table-wrap">
        <table className="bill-table">
          <thead>
            <tr>
              <th style={{ width: '12%' }}>HSN</th>
              <th style={{ width: '38%', textAlign: 'left' }}>Description</th>
              <th style={{ width: '8%' }}>Qty</th>
              <th style={{ width: '13%' }}>NetRate</th>
              <th style={{ width: '12%' }}>GST (%)</th>
              <th style={{ width: '13%' }}>Rate</th>
              <th style={{ width: '14%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.length > 0 ? (
              lines.map((line, idx) => (
                <tr key={line.id || idx}>
                  <td className="td-center">{line.hsn || '—'}</td>
                  <td>{line.description || '—'}</td>
                  <td className="td-center">{line.qty || 0}</td>
                  <td className="td-right">₹{formatCurrency(line.netRate)}</td>
                  <td className="td-center">{line.gstPct}%</td>
                  <td className="td-right">₹{formatCurrency(line.rate)}</td>
                  <td className="td-right">₹{formatCurrency(line.amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="empty-row">
                  Add items to see invoice preview
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Details */}
      <div className="bill-footer-area">
        <div className="bill-footer-left">
          <div>
            {profile.footerNote && <div>{profile.footerNote}</div>}
            {profile.bankDetails && (
              <div style={{ marginTop: '6px', whiteSpace: 'pre-line', fontSize: '9px', opacity: 0.8 }}>
                <strong>Bank details:</strong>
                <br />
                {profile.bankDetails}
              </div>
            )}
            {profile.terms && (
              <div style={{ marginTop: '6px', whiteSpace: 'pre-line', fontSize: '8px', opacity: 0.6 }}>
                <strong>Terms:</strong> {profile.terms}
              </div>
            )}
          </div>
          <div className="bill-stamp">
            <div className="bill-stamp-line" />
            <div className="bill-stamp-label">Stamp & Signature</div>
          </div>
        </div>

        <div className="bill-footer-right">
          <table className="bill-summary-table">
            <tbody>
              <tr>
                <td className="label">Sub Total</td>
                <td className="amount">₹{formatCurrency(subTotal)}</td>
              </tr>
              <tr>
                <td className="label">CGST ({cgstPct}%):</td>
                <td className="amount">₹{formatCurrency(cgst)}</td>
              </tr>
              <tr>
                <td className="label">SGST ({sgstPct}%):</td>
                <td className="amount">₹{formatCurrency(sgst)}</td>
              </tr>
              {Math.abs(roundOff) > 0.001 && (
                <tr>
                  <td className="label">Round Off</td>
                  <td className="amount">{roundOff >= 0 ? '+' : '-'}₹{formatCurrency(Math.abs(roundOff))}</td>
                </tr>
              )}
              <tr className="total-row">
                <td className="label">Net Total</td>
                <td className="amount">₹{formatCurrency(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Greeting */}
      <div className="bill-thanks">THANKS FOR YOUR VISIT</div>
    </div>
  );
}
