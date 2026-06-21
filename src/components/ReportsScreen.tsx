import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Profile, Invoice, LineItem } from '../types';
import { db } from '../db';
import { calcTotals } from '../utils/calculations';
import { Download, FileText, Image as ImageIcon, Printer, Search, Calendar, ChevronRight, AlertTriangle } from 'lucide-react';

interface ReportsScreenProps {
  profile: Profile;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'financial_yearly' | 'custom';

function parseInvoiceDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const year = parseInt(parts[2], 10);
    // Return date normalized to local noon to avoid timezone shift offsets
    return new Date(year, month, day, 12, 0, 0);
  }
  return new Date(NaN);
}

function getTodayYYYYMMDD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReportsScreen({ profile, showToast }: ReportsScreenProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayYYYYMMDD());
  const [weekStartDate, setWeekStartDate] = useState<string>(() => {
    // Default weekly start date is 7 days ago
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [financialYearStart, setFinancialYearStart] = useState<number>(() => {
    const d = new Date();
    // If month is Jan, Feb, Mar, the financial year started in the previous calendar year
    return d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
  });
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [customEndDate, setCustomEndDate] = useState<string>(getTodayYYYYMMDD());

  // Load Invoices for Profile
  useEffect(() => {
    async function loadInvoices() {
      setIsLoading(true);
      try {
        const data = await db.getInvoices(profile.id);
        setInvoices(data);
      } catch (err) {
        console.error('Failed to load invoices:', err);
        showToast('Error loading invoices for report', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    loadInvoices();
  }, [profile.id]);

  // Year Selection Options
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const list = [];
    for (let y = current; y >= current - 10; y--) {
      list.push(y);
    }
    return list;
  }, []);

  // Filter Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const invDate = parseInvoiceDate(inv.date);
      if (isNaN(invDate.getTime())) return false;

      const invYear = invDate.getFullYear();
      const invMonth = invDate.getMonth(); // 0-indexed
      const invDay = invDate.getDate();
      const invTime = new Date(invYear, invMonth, invDay).getTime();

      if (periodType === 'daily') {
        if (!selectedDate) return false;
        const [sy, sm, sd] = selectedDate.split('-').map(Number);
        const selTime = new Date(sy, sm - 1, sd).getTime();
        return invTime === selTime;
      }

      if (periodType === 'weekly') {
        if (!weekStartDate) return false;
        const [sy, sm, sd] = weekStartDate.split('-').map(Number);
        const startTime = new Date(sy, sm - 1, sd).getTime();
        const endTime = startTime + 6 * 24 * 60 * 60 * 1000;
        return invTime >= startTime && invTime <= endTime;
      }

      if (periodType === 'monthly') {
        if (!selectedMonth) return false;
        const [sy, sm] = selectedMonth.split('-').map(Number);
        return invYear === sy && (invMonth + 1) === sm;
      }

      if (periodType === 'yearly') {
        return invYear === selectedYear;
      }

      if (periodType === 'financial_yearly') {
        const startTime = new Date(financialYearStart, 3, 1).getTime(); // April 1st
        const endTime = new Date(financialYearStart + 1, 2, 31, 23, 59, 59).getTime(); // March 31st
        return invTime >= startTime && invTime <= endTime;
      }

      if (periodType === 'custom') {
        if (!customStartDate || !customEndDate) return false;
        const [sy, sm, sd] = customStartDate.split('-').map(Number);
        const [ey, em, ed] = customEndDate.split('-').map(Number);
        const startTime = new Date(sy, sm - 1, sd).getTime();
        const endTime = new Date(ey, em - 1, ed, 23, 59, 59).getTime();
        return invTime >= startTime && invTime <= endTime;
      }

      return false;
    });
  }, [invoices, periodType, selectedDate, weekStartDate, selectedMonth, selectedYear, financialYearStart, customStartDate, customEndDate]);

  // Consolidated Lines and Slab summaries
  const reportData = useMemo(() => {
    const lines: Array<{
      id: string;
      invoiceNo: string;
      date: string;
      description: string;
      hsn: string;
      qty: number;
      unit: string;
      netRate: number; // Pre-tax taxable rate
      gstPct: number;
      lineNetAmt: number; // Taxable net value
      lineGstAmt: number; // GST tax value
      amount: number; // Price (Net + tax)
    }> = [];

    filteredInvoices.forEach((inv) => {
      // Calculate invoice totals to fetch distributed pre-tax discounts
      const result = calcTotals(inv.items, inv.profileSnapshot || profile, inv.discount || 0);
      result.lines.forEach((line) => {
        lines.push({
          id: line.id || crypto.randomUUID(),
          invoiceNo: inv.invoiceNo,
          date: inv.date,
          description: line.description || '—',
          hsn: line.hsn || '—',
          qty: line.qty || 0,
          unit: line.unit || 'PCS',
          netRate: line.netRate || 0,
          gstPct: line.gstPct || 0,
          lineNetAmt: line.lineNetAmt || 0,
          lineGstAmt: line.lineGstAmt || 0,
          amount: line.amount || 0,
        });
      });
    });

    // GST Slab Summary aggregation
    const slabGroups: Record<number, { gstPct: number; netRate: number; taxVal: number; price: number }> = {};
    let grandTotalNet = 0;
    let grandTotalTax = 0;
    let grandTotalPrice = 0;

    lines.forEach((line) => {
      const slab = line.gstPct;
      if (!slabGroups[slab]) {
        slabGroups[slab] = { gstPct: slab, netRate: 0, taxVal: 0, price: 0 };
      }
      slabGroups[slab].netRate += line.lineNetAmt;
      slabGroups[slab].taxVal += line.lineGstAmt;
      slabGroups[slab].price += line.amount;

      grandTotalNet += line.lineNetAmt;
      grandTotalTax += line.lineGstAmt;
      grandTotalPrice += line.amount;
    });

    const gstSlabSummaries = Object.values(slabGroups).sort((a, b) => a.gstPct - b.gstPct);

    return {
      lines,
      gstSlabSummaries,
      grandTotalNet,
      grandTotalTax,
      grandTotalPrice,
    };
  }, [filteredInvoices, profile]);

  // Format currency helpers
  const formatCurrency = (val: number) => Number(val || 0).toFixed(2);

  // Period label header text
  const periodLabel = useMemo(() => {
    if (periodType === 'daily') {
      return `Daily Report: ${selectedDate || '—'}`;
    }
    if (periodType === 'weekly') {
      const [sy, sm, sd] = weekStartDate.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd);
      const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
      const endStr = `${String(end.getDate()).padStart(2, '0')}-${String(end.getMonth() + 1).padStart(2, '0')}-${end.getFullYear()}`;
      const startStr = `${String(start.getDate()).padStart(2, '0')}-${String(start.getMonth() + 1).padStart(2, '0')}-${start.getFullYear()}`;
      return `Weekly Report: ${startStr} to ${endStr}`;
    }
    if (periodType === 'monthly') {
      if (!selectedMonth) return 'Monthly Report';
      const [y, m] = selectedMonth.split('-');
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${months[parseInt(m) - 1]} ${y} Report`;
    }
    if (periodType === 'yearly') {
      return `Calendar Year Report: ${selectedYear}`;
    }
    if (periodType === 'financial_yearly') {
      return `Financial Year Report: ${financialYearStart}-${financialYearStart + 1}`;
    }
    if (periodType === 'custom') {
      const startParts = customStartDate.split('-');
      const endParts = customEndDate.split('-');
      const startStr = startParts.length === 3 ? `${startParts[2]}-${startParts[1]}-${startParts[0]}` : customStartDate;
      const endStr = endParts.length === 3 ? `${endParts[2]}-${endParts[1]}-${endParts[0]}` : customEndDate;
      return `Custom Period Report: ${startStr} to ${endStr}`;
    }
    return 'Sales Report';
  }, [periodType, selectedDate, weekStartDate, selectedMonth, selectedYear, financialYearStart, customStartDate, customEndDate]);

  // Export handlers
  const handleExportPDF = async () => {
    const el = document.getElementById('report-print-area');
    if (!el) return;

    showToast('Preparing PDF document...');
    try {
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

      const cleanTitle = periodLabel.replace(/[\s\/\\]+/g, '_');
      const filename = `${profile.name.replace(/\s+/g, '_')}_${cleanTitle}.pdf`;

      if (window.electronAPI) {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const res = await window.electronAPI.saveFile(filename, pdfBase64);
        if (res.success) {
          showToast(`PDF saved to ${res.filePath}`, 'success');
        } else if (!res.canceled) {
          showToast('Failed to save PDF file.', 'error');
        }
      } else {
        pdf.save(filename);
        showToast('PDF downloaded successfully!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error exporting PDF: ' + err.message, 'error');
    }
  };

  const handleExportImage = async () => {
    const el = document.getElementById('report-print-area');
    if (!el) return;

    showToast('Preparing PNG image...');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const cleanTitle = periodLabel.replace(/[\s\/\\]+/g, '_');
      const filename = `${profile.name.replace(/\s+/g, '_')}_${cleanTitle}.png`;
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

  const handleExportCSV = () => {
    if (reportData.lines.length === 0) {
      showToast('No transaction details to export', 'error');
      return;
    }

    const headers = ['SR No', 'Invoice No', 'Date', 'Product Description', 'HSN Code', 'Qty', 'Unit', 'Net Rate (Pre-tax)', 'GST Rate (%)', 'Tax Value (GST Amt)', 'Price (Total)'];
    const rows = reportData.lines.map((line, idx) => [
      idx + 1,
      `"${line.invoiceNo}"`,
      `"${line.date}"`,
      `"${line.description.replace(/"/g, '""')}"`,
      `"${line.hsn}"`,
      line.qty,
      `"${line.unit}"`,
      line.netRate.toFixed(2),
      `${line.gstPct}%`,
      line.lineGstAmt.toFixed(2),
      line.amount.toFixed(2),
    ]);

    // Append GST Slab Summaries at the bottom of CSV
    rows.push([]);
    rows.push(['GST Slab Summaries']);
    rows.push(['GST Rate', 'Total Net Rate (Taxable Value)', 'Total Tax Value', 'Total Price']);
    reportData.gstSlabSummaries.forEach((sum) => {
      rows.push([
        `${sum.gstPct}%`,
        sum.netRate.toFixed(2),
        sum.taxVal.toFixed(2),
        sum.price.toFixed(2)
      ]);
    });

    rows.push([]);
    rows.push(['Grand Totals']);
    rows.push(['Total Net Rate', 'Total Tax Value', 'Total Sale (Incl. Tax)']);
    rows.push([
      reportData.grandTotalNet.toFixed(2),
      reportData.grandTotalTax.toFixed(2),
      reportData.grandTotalPrice.toFixed(2)
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanTitle = periodLabel.replace(/[\s\/\\]+/g, '_');
    link.setAttribute('href', url);
    link.setAttribute('download', `${profile.name.replace(/\s+/g, '_')}_${cleanTitle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV report exported!', 'success');
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--color-text-muted)', width: '100%' }}>
        <style>{`
          @keyframes report-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{
          width: '24px',
          height: '24px',
          border: '2px solid rgba(255,255,255,0.1)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'report-spin 1s linear infinite',
          marginRight: '12px'
        }} />
        <span>Consolidating reports...</span>
      </div>
    );
  }

  return (
    <div className="invoice-editor">
      {/* Filters Sidebar/Form panel */}
      <div className="editor-form-panel" style={{ width: '360px', minWidth: '360px', maxWidth: '360px' }}>
        <div className="form-section">
          <div className="form-section-title">Report Filters</div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Period Type</label>
            <select
              className="form-input"
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
              style={{ background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '8px' }}
            >
              <option value="daily">Daily Report</option>
              <option value="weekly">Weekly Report</option>
              <option value="monthly">Monthly Report</option>
              <option value="yearly">Calendar Yearly Report</option>
              <option value="financial_yearly">Financial Yearly Report</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Daily Date Selector */}
          {periodType === 'daily' && (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Select Date</label>
              <input
                type="date"
                className="form-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          )}

          {/* Weekly Selector */}
          {periodType === 'weekly' && (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Week Starting Date</label>
              <input
                type="date"
                className="form-input"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
              />
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Shows sales for 7 days starting from this date
              </span>
            </div>
          )}

          {/* Monthly Month Selector */}
          {periodType === 'monthly' && (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Select Month & Year</label>
              <input
                type="month"
                className="form-input"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          )}

          {/* Yearly Calendar Selector */}
          {periodType === 'yearly' && (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Select Calendar Year</label>
              <select
                className="form-input"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{ background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '8px' }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Financial Year Selector */}
          {periodType === 'financial_yearly' && (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Select Financial Year</label>
              <select
                className="form-input"
                value={financialYearStart}
                onChange={(e) => setFinancialYearStart(Number(e.target.value))}
                style={{ background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '8px' }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    April {y} – March {y + 1}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom Date Range */}
          {periodType === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Totals Summary Panel inside sidebar */}
        <div className="form-totals-panel" style={{ marginTop: 'auto' }}>
          <div className="form-section-title" style={{ borderBottomColor: 'rgba(255,255,255,0.05)' }}>
            Consolidated Summary
          </div>
          <div className="totals-row">
            <span>Invoices Consolidated</span>
            <span className="val">{filteredInvoices.length}</span>
          </div>
          <div className="totals-row">
            <span>Total Taxable Sales</span>
            <span className="val">₹{formatCurrency(reportData.grandTotalNet)}</span>
          </div>
          <div className="totals-row">
            <span>Total GST Collected</span>
            <span className="val">₹{formatCurrency(reportData.grandTotalTax)}</span>
          </div>
          <div className="totals-row grand">
            <span>Gross Sales (Price)</span>
            <span className="val">₹{formatCurrency(reportData.grandTotalPrice)}</span>
          </div>
        </div>

        {/* CSV Export Button */}
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '16px' }}
          onClick={handleExportCSV}
          disabled={reportData.lines.length === 0}
        >
          <Download size={14} /> Export CSV Report
        </button>
      </div>

      {/* Main Print and Layout Sheet View */}
      <div className="preview-interactive-panel">
        <div className="preview-header-bar" style={{ width: '760px' }}>
          <h3>A4 Print Preview</h3>
          <div className="preview-actions">
            <button className="btn-icon" onClick={handleExportPDF} title="Save PDF" disabled={reportData.lines.length === 0}>
              <FileText size={14} />
            </button>
            <button className="btn-icon" onClick={handleExportImage} title="Save PNG Image" disabled={reportData.lines.length === 0}>
              <ImageIcon size={14} />
            </button>
            <button className="btn-icon" onClick={handlePrint} title="Print Report" disabled={reportData.lines.length === 0}>
              <Printer size={14} />
            </button>
          </div>
        </div>

        {/* Printable Report Wrapper Sheet */}
        <div className="bill-wrapper" id="report-print-area">
          <style>{`
            #report-print-area {
              background-color: #ffffff;
              color: #000000;
              width: 760px;
              min-height: 1075px; /* A4 Ratio */
              padding: 40px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.15);
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              box-sizing: border-box;
            }
            .report-title-section {
              text-align: center;
              margin-bottom: 24px;
              border-bottom: 2px solid #333333;
              padding-bottom: 12px;
            }
            .report-biz-name {
              font-size: 20px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .report-biz-sub {
              font-size: 10px;
              color: #555555;
              margin-top: 4px;
            }
            .report-main-title {
              font-size: 16px;
              font-weight: 700;
              margin-top: 10px;
              color: #111111;
              text-decoration: underline;
              text-transform: uppercase;
            }
            .report-meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              font-size: 11px;
              margin-bottom: 24px;
              background-color: #f9f9f9;
              padding: 12px;
              border-radius: 4px;
              border: 1px solid #eeeeee;
            }
            .report-meta-grid label {
              font-weight: 700;
              color: #444444;
              margin-right: 6px;
            }
            .report-table-title {
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
              margin: 16px 0 8px 0;
              letter-spacing: 0.5px;
              color: #222222;
              border-left: 3px solid #333333;
              padding-left: 8px;
            }
            .report-sheet-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
              font-size: 11px;
            }
            .report-sheet-table th {
              background-color: #f3f3f3;
              color: #111111;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 9px;
              padding: 8px;
              border: 1px solid #dddddd;
              text-align: center;
            }
            .report-sheet-table td {
              padding: 8px;
              border: 1px solid #dddddd;
            }
            .report-sheet-table td.center {
              text-align: center;
            }
            .report-sheet-table td.right {
              text-align: right;
              font-family: var(--font-mono), monospace;
            }
            .report-summary-box {
              margin-top: auto; /* Push summaries to the bottom */
              border-top: 2px solid #333333;
              padding-top: 16px;
            }
            .report-grand-totals {
              margin-top: 16px;
              background-color: #f5f5f5;
              padding: 12px;
              border-radius: 4px;
              border: 1px solid #dddddd;
              font-size: 12px;
            }
            .grand-total-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              color: #333333;
            }
            .grand-total-row.major {
              font-weight: 800;
              font-size: 14px;
              border-top: 1px solid #cccccc;
              margin-top: 6px;
              padding-top: 8px;
              color: #000000;
            }
            .grand-total-row span.val {
              font-family: var(--font-mono), monospace;
              font-weight: 700;
            }
            @media print {
              body * {
                visibility: hidden;
              }
              #report-print-area, #report-print-area * {
                visibility: visible;
              }
              #report-print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 210mm;
                min-height: 297mm;
                box-shadow: none;
                padding: 15mm;
              }
            }
          `}</style>

          {/* Business Profile Title Section */}
          <div className="report-title-section">
            <div className="report-biz-name">{profile.bizName || 'CENTRA GST'}</div>
            {profile.tagline && <div className="report-biz-sub">{profile.tagline}</div>}
            <div className="report-main-title">{periodLabel}</div>
          </div>

          {/* Report Metadata info */}
          <div className="report-meta-grid">
            <div>
              <div><label>GST No:</label>{profile.gstNo || 'Not Setup'}</div>
              <div><label>Phone:</label>{profile.phone || '—'}</div>
              <div><label>Address:</label>{profile.address1} {profile.address2 ? `, ${profile.address2}` : ''}</div>
            </div>
            <div>
              <div><label>Generated On:</label>{new Date().toLocaleString()}</div>
              <div><label>Invoices count:</label>{filteredInvoices.length}</div>
              <div><label>Report Status:</label>Consolidated Tax Report</div>
            </div>
          </div>

          {/* Transaction items list */}
          <div className="report-table-title">Consolidated Transaction Details</div>
          <table className="report-sheet-table">
            <thead>
              <tr>
                <th style={{ width: '6%' }}>SR. No</th>
                <th style={{ width: '14%' }}>Invoice Info</th>
                <th style={{ width: '30%', textAlign: 'left' }}>Product Description</th>
                <th style={{ width: '13%' }}>Net Rate</th>
                <th style={{ width: '10%' }}>GST</th>
                <th style={{ width: '12%' }}>Tax Value</th>
                <th style={{ width: '15%' }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {reportData.lines.length > 0 ? (
                reportData.lines.map((line, idx) => (
                  <tr key={`${line.invoiceNo}-${line.id}-${idx}`}>
                    <td className="center">{idx + 1}</td>
                    <td className="center">
                      <div style={{ fontWeight: 600 }}>{line.invoiceNo}</div>
                      <div style={{ fontSize: '9px', opacity: 0.7 }}>{line.date}</div>
                    </td>
                    <td>
                      <div>{line.description}</div>
                      <div style={{ fontSize: '9px', opacity: 0.65 }}>
                        HSN: {line.hsn} • Qty: {line.qty} {line.unit}
                      </div>
                    </td>
                    <td className="right">₹{formatCurrency(line.lineNetAmt)}</td>
                    <td className="center">{line.gstPct}%</td>
                    <td className="right">₹{formatCurrency(line.lineGstAmt)}</td>
                    <td className="right">₹{formatCurrency(line.amount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="center" style={{ padding: '24px', color: '#666' }}>
                    No invoices generated in the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* GST Slab aggregation and Grand Totals (Summary box) */}
          <div className="report-summary-box">
            <div className="report-table-title" style={{ margin: '0 0 8px 0' }}>GST Slab summary</div>
            <table className="report-sheet-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>GST Rate Slab</th>
                  <th style={{ width: '25%' }}>Total Net Rate</th>
                  <th style={{ width: '25%' }}>Total Tax Value</th>
                  <th style={{ width: '25%' }}>Total Price (Incl. Tax)</th>
                </tr>
              </thead>
              <tbody>
                {reportData.gstSlabSummaries.length > 0 ? (
                  reportData.gstSlabSummaries.map((sum) => (
                    <tr key={sum.gstPct}>
                      <td className="center" style={{ fontWeight: 600 }}>{sum.gstPct}%</td>
                      <td className="right">₹{formatCurrency(sum.netRate)}</td>
                      <td className="right">₹{formatCurrency(sum.taxVal)}</td>
                      <td className="right">₹{formatCurrency(sum.price)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="center" style={{ padding: '12px', color: '#666' }}>
                      No tax-slab summaries available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Grand Totals summary card */}
            <div className="report-grand-totals">
              <div className="grand-total-row">
                <span>Total Taxable Net Rate (Sales)</span>
                <span className="val">₹{formatCurrency(reportData.grandTotalNet)}</span>
              </div>
              <div className="grand-total-row">
                <span>Total Tax Value (GST Collected)</span>
                <span className="val">₹{formatCurrency(reportData.grandTotalTax)}</span>
              </div>
              <div className="grand-total-row major">
                <span>Total Sales (Including Tax)</span>
                <span className="val">₹{formatCurrency(reportData.grandTotalPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
