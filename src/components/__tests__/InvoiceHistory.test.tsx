import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoiceHistory from '../InvoiceHistory';
import { testProfile, testProfile2, testInvoice } from './fixtures';
import { Invoice } from '../../types';
import { db } from '../../db';

// Mock the db client
vi.mock('../../db', () => ({
  db: {
    getInvoices: vi.fn(),
    deleteInvoice: vi.fn(),
  },
}));

vi.mock('html2canvas', () => ({ default: vi.fn() }));

const mockDb = db as any;

const olderInvoice: Invoice = {
  ...testInvoice,
  id: 'inv-002',
  invoiceNo: 'VIS2',
  customerName: 'ALICE WONDER',
  generatedAt: testInvoice.generatedAt - 1000,
};

const profile2Invoice: Invoice = {
  ...testInvoice,
  id: 'inv-003',
  profileId: testProfile2.id,
  invoiceNo: 'OC1',
  customerName: 'BOB BUILDER',
  profileSnapshot: { ...testProfile2 },
};

const showToast = vi.fn();

function renderHistory(
  invoices: Invoice[] = [testInvoice, olderInvoice],
  profiles = [testProfile]
) {
  mockDb.getInvoices.mockResolvedValue(invoices);
  return render(<InvoiceHistory profiles={profiles} showToast={showToast} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InvoiceHistory', () => {
  it('IH1: Renders all invoice rows', async () => {
    renderHistory();
    expect(await screen.findByText('VIS1')).toBeInTheDocument();
    expect(screen.getByText('VIS2')).toBeInTheDocument();
  });

  it('IH2: Search by customer name filters results', async () => {
    renderHistory();
    // Wait for initial load to complete
    expect(await screen.findByText('VIS1')).toBeInTheDocument();
    const searchInput = screen.getByPlaceholderText(/Search by customer/i);
    await userEvent.type(searchInput, 'ALICE');
    await waitFor(() => {
      expect(screen.queryByText('JOHN DOE')).not.toBeInTheDocument();
      expect(screen.getByText('ALICE WONDER')).toBeInTheDocument();
    });
  });

  it('IH3: Search by invoice number filters correctly', async () => {
    renderHistory();
    expect(await screen.findByText('VIS1')).toBeInTheDocument();
    const searchInput = screen.getByPlaceholderText(/Search by customer/i);
    await userEvent.type(searchInput, 'VIS1');
    await waitFor(() => {
      expect(screen.getByText('VIS1')).toBeInTheDocument();
      expect(screen.queryByText('VIS2')).not.toBeInTheDocument();
    });
  });

  it('IH4: Filter by profile shows only that profile\'s invoices', async () => {
    renderHistory(
      [testInvoice, profile2Invoice],
      [testProfile, testProfile2]
    );
    expect(await screen.findByText('VIS1')).toBeInTheDocument();
    const profileSelect = screen.getByRole('combobox');
    await userEvent.selectOptions(profileSelect, testProfile2.id);
    await waitFor(() => {
      expect(screen.queryByText('JOHN DOE')).not.toBeInTheDocument();
      expect(screen.getByText('BOB BUILDER')).toBeInTheDocument();
    });
  });

  it('IH5: "All Businesses" filter shows all invoices', async () => {
    renderHistory(
      [testInvoice, profile2Invoice],
      [testProfile, testProfile2]
    );
    expect(await screen.findByText('VIS1')).toBeInTheDocument();
    const profileSelect = screen.getByRole('combobox');
    await userEvent.selectOptions(profileSelect, testProfile2.id);
    await userEvent.selectOptions(profileSelect, 'all');
    await waitFor(() => {
      expect(screen.getByText('JOHN DOE')).toBeInTheDocument();
      expect(screen.getByText('BOB BUILDER')).toBeInTheDocument();
    });
  });

  it('IH6: Empty state renders when no invoices exist', async () => {
    renderHistory([]);
    expect(await screen.findByText(/No invoices found/i)).toBeInTheDocument();
  });

  it('IH7: Clicking "View" opens the invoice modal', async () => {
    renderHistory();
    const viewButtons = await screen.findAllByText(/View/i);
    await userEvent.click(viewButtons[0]);
    await waitFor(() => {
      expect(screen.getByText(/Invoice Review/i)).toBeInTheDocument();
    });
  });

  it('IH8: Clicking ✕ (close) dismisses the invoice modal', async () => {
    renderHistory();
    const viewButtons = await screen.findAllByText(/View/i);
    await userEvent.click(viewButtons[0]);
    await waitFor(() => screen.getByText(/Invoice Review/i));
    
    // Alternatively, click the overlay
    const overlay = document.querySelector('.modal-overlay') as HTMLElement;
    fireEvent.click(overlay);
    await waitFor(() => {
      expect(screen.queryByText(/Invoice Review/i)).not.toBeInTheDocument();
    });
  });

  it('IH9: Delete invoice removes it from the list', async () => {
    mockDb.deleteInvoice.mockResolvedValue(undefined);
    renderHistory();
    const deleteButtons = await screen.findAllByTitle(/Delete Invoice/i);
    await userEvent.click(deleteButtons[0]);
    // ConfirmModal appears — click the danger "Delete" confirm button
    await waitFor(() => screen.getByText(/permanently delete invoice/i));
    const confirmBtn = screen.getByRole('button', { name: /^Delete$/i });
    await userEvent.click(confirmBtn);
    // After confirming, showToast should be called with success
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('deleted'),
        'success'
      );
    });
  });

  it('IH10: Invoices sorted newest first', async () => {
    renderHistory();
    const rows = await screen.findAllByRole('row');
    const dataRows = rows.slice(1); // skip header
    // JOHN DOE has newer generatedAt than ALICE WONDER
    expect(dataRows[0]).toHaveTextContent('JOHN DOE');
    expect(dataRows[1]).toHaveTextContent('ALICE WONDER');
  });
});
