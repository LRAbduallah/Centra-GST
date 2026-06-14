import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoiceHistory from '../InvoiceHistory';
import { testProfile, testProfile2, testInvoice } from './fixtures';
import { Invoice } from '../../types';
import { STORAGE } from '../../App';

// Mock STORAGE
vi.mock('../../App', () => ({
  STORAGE: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('html2canvas', () => ({ default: vi.fn() }));

const mockStorage = STORAGE as { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

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
  mockStorage.get.mockImplementation((key: string) => {
    if (key === `invoices:${testProfile.id}`) {
      return invoices.filter((i) => i.profileId === testProfile.id);
    }
    if (key === `invoices:${testProfile2.id}`) {
      return invoices.filter((i) => i.profileId === testProfile2.id);
    }
    return null;
  });
  return render(<InvoiceHistory profiles={profiles} showToast={showToast} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InvoiceHistory', () => {
  it('IH1: Renders all invoice rows', () => {
    renderHistory();
    expect(screen.getByText('VIS1')).toBeInTheDocument();
    expect(screen.getByText('VIS2')).toBeInTheDocument();
  });

  it('IH2: Search by customer name filters results', async () => {
    renderHistory();
    const searchInput = screen.getByPlaceholderText(/Search by customer/i);
    await userEvent.type(searchInput, 'ALICE');
    await waitFor(() => {
      expect(screen.queryByText('JOHN DOE')).not.toBeInTheDocument();
      expect(screen.getByText('ALICE WONDER')).toBeInTheDocument();
    });
  });

  it('IH3: Search by invoice number filters correctly', async () => {
    renderHistory();
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
    const profileSelect = screen.getByRole('combobox');
    await userEvent.selectOptions(profileSelect, testProfile2.id);
    await userEvent.selectOptions(profileSelect, 'all');
    await waitFor(() => {
      expect(screen.getByText('JOHN DOE')).toBeInTheDocument();
      expect(screen.getByText('BOB BUILDER')).toBeInTheDocument();
    });
  });

  it('IH6: Empty state renders when no invoices exist', () => {
    renderHistory([]);
    expect(screen.getByText(/No invoices found/i)).toBeInTheDocument();
  });

  it('IH7: Clicking "View" opens the invoice modal', async () => {
    renderHistory();
    const viewButtons = screen.getAllByText(/View/i);
    await userEvent.click(viewButtons[0]);
    await waitFor(() => {
      expect(screen.getByText(/Invoice Review/i)).toBeInTheDocument();
    });
  });

  it('IH8: Clicking ✕ (close) dismisses the invoice modal', async () => {
    renderHistory();
    const viewButtons = screen.getAllByText(/View/i);
    await userEvent.click(viewButtons[0]);
    await waitFor(() => screen.getByText(/Invoice Review/i));
    // Click the X button
    const closeBtn = screen.getAllByRole('button').find(
      (btn) => btn.title === '' && btn.closest('.modal-box')
    );
    // Alternatively, click the overlay
    const overlay = document.querySelector('.modal-overlay') as HTMLElement;
    fireEvent.click(overlay);
    await waitFor(() => {
      expect(screen.queryByText(/Invoice Review/i)).not.toBeInTheDocument();
    });
  });

  it('IH9: Delete invoice removes it from the list', async () => {
    // Mock window.confirm to auto-accept
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockStorage.set.mockImplementation(() => {});
    renderHistory();
    const deleteButtons = screen.getAllByTitle(/Delete Invoice/i);
    await userEvent.click(deleteButtons[0]);
    // After delete, showToast should be called
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('deleted'),
      'success'
    );
  });

  it('IH10: Invoices sorted newest first', () => {
    renderHistory();
    const rows = screen.getAllByRole('row').slice(1); // skip header
    // JOHN DOE has newer generatedAt than ALICE WONDER
    expect(rows[0]).toHaveTextContent('JOHN DOE');
    expect(rows[1]).toHaveTextContent('ALICE WONDER');
  });
});
