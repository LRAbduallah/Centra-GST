import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportsScreen from '../ReportsScreen';
import { testProfile, testInvoice } from './fixtures';
import { Invoice } from '../../types';
import { db } from '../../db';

// Mock the db client
vi.mock('../../db', () => ({
  db: {
    getInvoices: vi.fn(),
  },
}));

vi.mock('html2canvas', () => ({ default: vi.fn() }));

// Mock URL methods for CSV download testing
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();


const mockDb = db as any;

// Create test invoices for different dates to test periods
const invoices: Invoice[] = [
  // June 1st 2026 (Monthly report month)
  testInvoice,
  // June 20th 2026 (Daily report day)
  {
    ...testInvoice,
    id: 'inv-002',
    invoiceNo: 'VIS2',
    date: '20-06-2026',
    items: [
      {
        id: 'item-003',
        hsn: '9003',
        description: 'Spectacles frame',
        qty: 1,
        netRate: 1000,
        gstPct: 5,
        unit: 'PCS'
      }
    ],
  },
  // March 15th 2026 (Financial Year 2025-2026 boundary check)
  {
    ...testInvoice,
    id: 'inv-003',
    invoiceNo: 'VIS3',
    date: '15-03-2026',
    items: [
      {
        id: 'item-004',
        hsn: '9001',
        description: 'Lenses generic',
        qty: 1,
        netRate: 118,
        gstPct: 18,
        unit: 'PCS'
      }
    ],
  },
  // April 15th 2026 (Financial Year 2026-2027 start)
  {
    ...testInvoice,
    id: 'inv-004',
    invoiceNo: 'VIS4',
    date: '15-04-2026',
    items: [
      {
        id: 'item-005',
        hsn: '9001',
        description: 'Lenses financial start',
        qty: 1,
        netRate: 118,
        gstPct: 18,
        unit: 'PCS'
      }
    ],
  }
];

const showToast = vi.fn();

function renderReports(profile = testProfile, invList = invoices) {
  mockDb.getInvoices.mockResolvedValue(invList);
  return render(<ReportsScreen profile={profile} showToast={showToast} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ReportsScreen Filters and Summaries', () => {
  it('RS1: Renders loading state initially and then displays data', async () => {
    mockDb.getInvoices.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<ReportsScreen profile={testProfile} showToast={showToast} />);
    expect(screen.getByText(/Consolidating reports/i)).toBeInTheDocument();
  });

  it('RS2: Filters by Monthly Period by default and displays matched invoices', async () => {
    renderReports();
    // Default is June 2026 (Monthly)
    expect(await screen.findByText('June 2026 Report')).toBeInTheDocument();
    
    // VIS1 and VIS2 are in June 2026, VIS3 (March) and VIS4 (April) are not
    expect(screen.getAllByText('VIS1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('VIS2').length).toBeGreaterThan(0);
    expect(screen.queryByText('VIS3')).not.toBeInTheDocument();
    expect(screen.queryByText('VIS4')).not.toBeInTheDocument();
  });

  it('RS3: Filters by Daily Period correctly', async () => {
    const { container } = renderReports();
    expect(await screen.findByText('June 2026 Report')).toBeInTheDocument();

    const periodSelect = container.querySelector('select') as HTMLSelectElement;
    await userEvent.selectOptions(periodSelect, 'daily');

    // Change date to 20-06-2026 (yyyy-mm-dd format is 2026-06-20)
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeTruthy();
    
    fireEvent.change(dateInput, { target: { value: '2026-06-20' } });

    await waitFor(() => {
      expect(screen.getByText('Daily Report: 2026-06-20')).toBeInTheDocument();
      expect(screen.getByText('VIS2')).toBeInTheDocument();
      expect(screen.queryByText('VIS1')).not.toBeInTheDocument();
    });
  });

  it('RS4: Filters by Financial Year correctly', async () => {
    const { container } = renderReports();
    expect(await screen.findByText('June 2026 Report')).toBeInTheDocument();

    const periodSelect = container.querySelector('select') as HTMLSelectElement;
    await userEvent.selectOptions(periodSelect, 'financial_yearly');

    // Wait for the selects to render
    await waitFor(() => {
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBeGreaterThan(1);
    });

    const selects = container.querySelectorAll('select');
    const fySelect = selects[1] as HTMLSelectElement;
    await userEvent.selectOptions(fySelect, '2025');

    await waitFor(() => {
      expect(screen.getByText('Financial Year Report: 2025-2026')).toBeInTheDocument();
      // Only VIS3 is in March 2026 (financial year 2025-2026)
      expect(screen.getByText('VIS3')).toBeInTheDocument();
      expect(screen.queryByText('VIS1')).not.toBeInTheDocument();
      expect(screen.queryByText('VIS4')).not.toBeInTheDocument();
    });
  });

  it('RS5: Renders GST Slab Summaries aggregated correctly', async () => {
    renderReports();
    // Default is Monthly (June 2026)
    expect(await screen.findByText('June 2026 Report')).toBeInTheDocument();

    // Check GST Slab Summaries for 18% (from VIS1) and 5% (from VIS2)
    expect(screen.getAllByText('5%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('18%').length).toBeGreaterThan(0);

    // Verify grand totals exist
    expect(screen.getByText('Total Taxable Net Rate (Sales)')).toBeInTheDocument();
    expect(screen.getByText('Total Tax Value (GST Collected)')).toBeInTheDocument();
    expect(screen.getByText('Total Sales (Including Tax)')).toBeInTheDocument();
  });

  it('RS6: Renders empty state when no invoices match query', async () => {
    renderReports(testProfile, []);
    expect(await screen.findByText(/No invoices generated in the selected period/i)).toBeInTheDocument();
  });

  it('RS7: Filters Weekly Period correctly at boundaries', async () => {
    const weeklyInvoices: Invoice[] = [
      { ...testInvoice, id: 'winv-1', date: '01-06-2026', invoiceNo: 'W1' }, // start day
      { ...testInvoice, id: 'winv-2', date: '07-06-2026', invoiceNo: 'W2' }, // end day (start + 6)
      { ...testInvoice, id: 'winv-3', date: '08-06-2026', invoiceNo: 'W3' }, // start + 7 (out of bounds)
    ];

    const { container } = renderReports(testProfile, weeklyInvoices);
    await waitFor(() => {
      expect(screen.queryByText(/Consolidating reports/i)).not.toBeInTheDocument();
    });
    const periodSelect = container.querySelector('select') as HTMLSelectElement;
    await userEvent.selectOptions(periodSelect, 'weekly');

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-06-01' } });

    await waitFor(() => {
      expect(screen.getAllByText('W1')[0]).toBeInTheDocument();
      expect(screen.getAllByText('W2')[0]).toBeInTheDocument();
      expect(screen.queryByText('W3')).not.toBeInTheDocument();
    });
  });

  it('RS8: Filters Custom Date Range correctly at boundaries', async () => {
    const customInvoices: Invoice[] = [
      { ...testInvoice, id: 'cinv-1', date: '04-06-2026', invoiceNo: 'C1' }, // before custom start
      { ...testInvoice, id: 'cinv-2', date: '05-06-2026', invoiceNo: 'C2' }, // exactly start date
      { ...testInvoice, id: 'cinv-3', date: '15-06-2026', invoiceNo: 'C3' }, // exactly end date
      { ...testInvoice, id: 'cinv-4', date: '16-06-2026', invoiceNo: 'C4' }, // after custom end
    ];

    const { container } = renderReports(testProfile, customInvoices);
    await waitFor(() => {
      expect(screen.queryByText(/Consolidating reports/i)).not.toBeInTheDocument();
    });
    const periodSelect = container.querySelector('select') as HTMLSelectElement;
    await userEvent.selectOptions(periodSelect, 'custom');

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-06-05' } });
    fireEvent.change(dateInputs[1], { target: { value: '2026-06-15' } });

    await waitFor(() => {
      expect(screen.queryByText('C1')).not.toBeInTheDocument();
      expect(screen.getAllByText('C2')[0]).toBeInTheDocument();
      expect(screen.getAllByText('C3')[0]).toBeInTheDocument();
      expect(screen.queryByText('C4')).not.toBeInTheDocument();
    });
  });

  it('RS9: Filters Calendar Yearly vs Financial Yearly transitions correctly', async () => {
    const transitionInvoices: Invoice[] = [
      { ...testInvoice, id: 'tinv-1', date: '31-03-2026', invoiceNo: 'T1' }, // Last day of FY 2025-2026
      { ...testInvoice, id: 'tinv-2', date: '01-04-2026', invoiceNo: 'T2' }, // First day of FY 2026-2027
    ];

    const { container } = renderReports(testProfile, transitionInvoices);
    await waitFor(() => {
      expect(screen.queryByText(/Consolidating reports/i)).not.toBeInTheDocument();
    });
    const periodSelect = container.querySelector('select') as HTMLSelectElement;
    
    // Choose Financial Year 2025
    await userEvent.selectOptions(periodSelect, 'financial_yearly');
    const fySelect = container.querySelectorAll('select')[1] as HTMLSelectElement;
    await userEvent.selectOptions(fySelect, '2025');

    await waitFor(() => {
      expect(screen.getAllByText('T1')[0]).toBeInTheDocument();
      expect(screen.queryByText('T2')).not.toBeInTheDocument();
    });

    // Choose Calendar Year 2026
    await userEvent.selectOptions(periodSelect, 'yearly');
    const calSelect = container.querySelectorAll('select')[1] as HTMLSelectElement;
    await userEvent.selectOptions(calSelect, '2026');

    await waitFor(() => {
      expect(screen.getAllByText('T1')[0]).toBeInTheDocument();
      expect(screen.getAllByText('T2')[0]).toBeInTheDocument();
    });
  });

  it('RS10: Trigger CSV export calls browser downloads URL methods', async () => {
    renderReports();
    expect(await screen.findByText('June 2026 Report')).toBeInTheDocument();

    const csvButton = screen.getByText(/Export CSV Report/i);
    expect(csvButton).not.toBeDisabled();
    
    await userEvent.click(csvButton);
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });
});

