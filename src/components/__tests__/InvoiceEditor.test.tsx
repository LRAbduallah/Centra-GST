import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoiceEditor from '../InvoiceEditor';
import { testProfile, testProduct, testProduct2 } from './fixtures';
import { Product } from '../../types';


// Mock html2canvas and jsPDF (not needed for these tests)
vi.mock('html2canvas', () => ({ default: vi.fn() }));
vi.mock('jspdf', () => ({ jsPDF: vi.fn(() => ({ addImage: vi.fn(), output: vi.fn(), save: vi.fn() })) }));

const defaultProps = {
  profile: testProfile,
  catalog: [testProduct, testProduct2],
  onSaveProfile: vi.fn(),
  onUpdateCatalog: vi.fn(),
  showToast: vi.fn(),
  pendingCatalogAdd: null,
  clearPendingCatalogAdd: vi.fn(),
};

function renderEditor(overrides = {}) {
  return render(<InvoiceEditor {...defaultProps} {...overrides} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────
// Live Totals & Form Validation
// ─────────────────────────────────────────────
describe('InvoiceEditor — Live Totals & Form', () => {
  it('C1: entering netRate=100 shows grand total of ₹100.00', async () => {
    renderEditor();
    const rateInput = screen.getAllByPlaceholderText('0.00')[0];
    await userEvent.clear(rateInput);
    await userEvent.type(rateInput, '100');
    // Grand total row should show ₹100.00 (tax-inclusive)
    await waitFor(() => {
      expect(screen.getByText(/Grand Total/i).closest('div')).toHaveTextContent('₹100.00');
    });
  });

  it('C2: changing qty from 1 to 3 triples the grand total', async () => {
    renderEditor();
    const rateInput = screen.getAllByPlaceholderText('0.00')[0];
    await userEvent.clear(rateInput);
    await userEvent.type(rateInput, '100');
    const qtyInput = screen.getAllByPlaceholderText('1')[0];
    await userEvent.clear(qtyInput);
    await userEvent.type(qtyInput, '3');
    await waitFor(() => {
      expect(screen.getByText(/Grand Total/i).closest('div')).toHaveTextContent('₹300.00');
    });
  });

  it('C4: Generate Invoice without customer name shows error toast', async () => {
    renderEditor();
    const btn = screen.getByText(/Generate Invoice/i);
    await userEvent.click(btn);
    expect(defaultProps.showToast).toHaveBeenCalledWith(
      expect.stringContaining('Customer name'),
      'error'
    );
  });

  it('C5: Generate Invoice with blank description shows error toast', async () => {
    renderEditor();
    const customerInput = screen.getByPlaceholderText(/JOHN DOE/i);
    await userEvent.type(customerInput, 'JANE SMITH');
    // Leave description blank, try to generate
    const btn = screen.getByText(/Generate Invoice/i);
    await userEvent.click(btn);
    expect(defaultProps.showToast).toHaveBeenCalledWith(
      expect.stringContaining('descriptions and rates'),
      'error'
    );
  });

  it('C6: After successful Generate, all inputs are disabled (locked)', async () => {
    renderEditor();
    const customerInput = screen.getByPlaceholderText(/JOHN DOE/i);
    await userEvent.type(customerInput, 'LOCKED USER');
    // Fill one item
    const descInput = screen.getAllByPlaceholderText('Description')[0];
    fireEvent.change(descInput, { target: { value: 'Test Item' } });
    const rateInput = screen.getAllByPlaceholderText('0.00')[0];
    fireEvent.change(rateInput, { target: { value: '100' } });
    // Generate
    const btn = screen.getByText(/Generate Invoice/i);
    await userEvent.click(btn);
    // Confirm inside the modal
    await waitFor(() => screen.getByText(/Generate & Save/i));
    await userEvent.click(screen.getByText(/Generate & Save/i));
    await waitFor(() => {
      expect(customerInput).toBeDisabled();
    });
  });

  it('C7: New Invoice button after generation resets all fields', async () => {
    renderEditor();
    const customerInput = screen.getByPlaceholderText(/JOHN DOE/i);
    await userEvent.type(customerInput, 'RESET USER');
    const descInput = screen.getAllByPlaceholderText('Description')[0];
    fireEvent.change(descInput, { target: { value: 'Item' } });
    const rateInput = screen.getAllByPlaceholderText('0.00')[0];
    fireEvent.change(rateInput, { target: { value: '100' } });
    await userEvent.click(screen.getByText(/Generate Invoice/i));
    // Confirm inside the modal
    await waitFor(() => screen.getByText(/Generate & Save/i));
    await userEvent.click(screen.getByText(/Generate & Save/i));
    await waitFor(() => screen.getByText(/New Invoice/i));
    // Click "New Invoice" — this opens the ConfirmModal
    await userEvent.click(screen.getByText(/New Invoice/i));
    // Confirm inside the modal
    await waitFor(() => screen.getByText(/Yes, New Invoice/i));
    await userEvent.click(screen.getByText(/Yes, New Invoice/i));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/JOHN DOE/i)).toHaveValue('');
    });
  });

  it('C8: "Add blank row" button increases line item count', async () => {
    renderEditor();
    const rowsBefore = screen.getAllByPlaceholderText('Description').length;
    await userEvent.click(screen.getByText(/Add Blank Row/i));
    const rowsAfter = screen.getAllByPlaceholderText('Description').length;
    expect(rowsAfter).toBe(rowsBefore + 1);
  });

  it('C9: Deleting the only row shows error toast, count stays at 1', async () => {
    renderEditor();
    const deleteButtons = screen.getAllByText('×');
    await userEvent.click(deleteButtons[0]);
    expect(defaultProps.showToast).toHaveBeenCalledWith(
      expect.stringContaining('At least one item'),
      'error'
    );
    expect(screen.getAllByPlaceholderText('Description').length).toBe(1);
  });
});

// ─────────────────────────────────────────────
// Catalog Browser Modal
// ─────────────────────────────────────────────
describe('InvoiceEditor — Catalog Browser Modal', () => {
  it('CB1: "Add From Catalog" button opens the modal', async () => {
    renderEditor();
    await userEvent.click(screen.getByText(/Add From Catalog/i));
    expect(screen.getByText(/Browse Product Catalog/i)).toBeInTheDocument();
  });

  it('CB2: Catalog items are rendered in the modal', async () => {
    renderEditor();
    await userEvent.click(screen.getByText(/Add From Catalog/i));
    expect(screen.getByText('Anti-Reflective Lens')).toBeInTheDocument();
    expect(screen.getByText('Rimless Frame')).toBeInTheDocument();
  });

  it('CB3: Selecting a product updates the count in Add Selected button', async () => {
    renderEditor();
    await userEvent.click(screen.getByText(/Add From Catalog/i));
    await userEvent.click(screen.getByText('Anti-Reflective Lens'));
    expect(screen.getByText(/Add Selected \(1\)/i)).toBeInTheDocument();
  });

  it('CB4: Search filters products by name', async () => {
    renderEditor();
    await userEvent.click(screen.getByText(/Add From Catalog/i));
    const searchInput = screen.getByPlaceholderText(/Filter catalog products/i);
    await userEvent.type(searchInput, 'Rimless');
    await waitFor(() => {
      expect(screen.queryByText('Anti-Reflective Lens')).not.toBeInTheDocument();
      expect(screen.getByText('Rimless Frame')).toBeInTheDocument();
    });
  });

  it('CB5: "Add Selected" button is disabled when nothing is selected', async () => {
    renderEditor();
    await userEvent.click(screen.getByText(/Add From Catalog/i));
    const addBtn = screen.getByText(/Add Selected \(0\)/i);
    expect(addBtn).toBeDisabled();
  });

  it('CB6: Adding 2 products adds 2 line item rows (blank first row replaced)', async () => {
    renderEditor();
    await userEvent.click(screen.getByText(/Add From Catalog/i));
    await userEvent.click(screen.getByText('Anti-Reflective Lens'));
    await userEvent.click(screen.getByText('Rimless Frame'));
    await userEvent.click(screen.getByText(/Add Selected \(2\)/i));
    await waitFor(() => {
      // 2 rows populated with product names
      const descriptions = screen.getAllByPlaceholderText('Description');
      const values = descriptions.map((el) => (el as HTMLInputElement).value);
      expect(values).toContain('Anti-Reflective Lens');
      expect(values).toContain('Rimless Frame');
    });
  });

  it('CB9: Cancel button closes the modal', async () => {
    renderEditor();
    await userEvent.click(screen.getByText(/Add From Catalog/i));
    await userEvent.click(screen.getByText(/^Cancel$/i));
    await waitFor(() => {
      expect(screen.queryByText(/Browse Product Catalog/i)).not.toBeInTheDocument();
    });
  });

  it('CB10: Empty catalog shows the empty state message', async () => {
    renderEditor({ catalog: [] });
    await userEvent.click(screen.getByText(/Add From Catalog/i));
    expect(screen.getByText(/No catalog items found/i)).toBeInTheDocument();
  });
});

describe('InvoiceEditor — Enhanced Mock Scenarios', () => {
  it('C10: Pre-tax discount input live updates calculations in totals panel', async () => {
    const { container } = renderEditor();
    // Set item rate to 118 (with default 18% GST, pre-tax net = 100)
    const rateInput = screen.getAllByPlaceholderText('0.00')[0];
    await userEvent.clear(rateInput);
    await userEvent.type(rateInput, '118');

    // Enter a pre-tax discount of ₹20
    const totalsPanel = container.querySelector('.form-totals-panel') as HTMLElement;
    const discountInput = totalsPanel.querySelector('input[type="number"]') as HTMLInputElement;
    await userEvent.clear(discountInput);
    await userEvent.type(discountInput, '20');

    await waitFor(() => {
      // Sub Total before discount = 100.00
      // Taxable Sub Total after discount = 80.00
      // GST collected = 80 * 18% = 14.40
      // Grand Total = 80 + 14.4 = 94.4 -> rounded 94.00
      expect(screen.getByText('Taxable Sub Total (After Discount)').closest('div')).toHaveTextContent('₹80.00');
      expect(screen.getByText('GST Tax Amount').closest('div')).toHaveTextContent('₹14.40');
      expect(screen.getByText('Grand Total').closest('div')).toHaveTextContent('₹94.00');
    });
  });

  it('C11: Customer Address and Place of Supply inputs render correctly in live preview', async () => {
    const { container } = renderEditor();
    
    const addressInput = container.querySelector('textarea') as HTMLTextAreaElement;
    await userEvent.type(addressInput, 'Chennai, Tamil Nadu');

    const supplyInput = container.querySelector('input[placeholder*="TAMIL NADU"]') as HTMLInputElement;
    await userEvent.type(supplyInput, 'TAMIL NADU (33)');

    await waitFor(() => {
      // Address and Place of Supply should render in live preview
      const preview = container.querySelector('#bill-preview') as HTMLElement;
      expect(within(preview).getByText(/Chennai, Tamil Nadu/i)).toBeInTheDocument();
      expect(within(preview).getByText(/TAMIL NADU \(33\)/i)).toBeInTheDocument();
    });
  });

  it('C12: Item UOM edits and item-level GST slab selections recalculate rates correctly', async () => {
    const { container } = renderEditor();

    // Check UOM input and type 'BOX'
    const uomInput = screen.getAllByPlaceholderText('PCS')[0];
    await userEvent.clear(uomInput);
    await userEvent.type(uomInput, 'BOX');

    // Set item-level GST select to 5% instead of default 18%
    const gstSelect = container.querySelector('.editor-table select') as HTMLSelectElement;
    await userEvent.selectOptions(gstSelect, '5');

    // Type tax-inclusive rate 105
    const firstRow = container.querySelector('.editor-table tbody tr') as HTMLTableRowElement;
    const rateInput = firstRow.querySelectorAll('input[type="number"]')[1] as HTMLInputElement;
    await userEvent.clear(rateInput);
    await userEvent.type(rateInput, '105');

    await waitFor(() => {
      // Taxable Net rate should calculate as 100.00 (105 / 1.05) and display in preview
      expect(screen.getAllByText('₹100.00')[0]).toBeInTheDocument();
      expect(screen.getAllByText('@5%')[0]).toBeInTheDocument();
    });
  });
});

