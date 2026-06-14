import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsScreen from '../SettingsScreen';
import { testProfile, testProduct, testProduct2 } from './fixtures';


// Mock URL.createObjectURL (not in jsdom)
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

const showToast = vi.fn();
const onUpdateCatalog = vi.fn();
const onAddToInvoice = vi.fn();

const defaultProps = {
  profiles: [testProfile],
  onUpdateProfile: vi.fn(),
  onAddProfile: vi.fn(),
  onDeleteProfile: vi.fn(),
  catalog: [testProduct, testProduct2],
  onUpdateCatalog,
  onAddToInvoice,
  showToast,
};

function renderSettings(overrides = {}) {
  return render(<SettingsScreen {...defaultProps} {...overrides} />);
}

/** Click the "Product Catalog" tab to reveal catalog UI */
async function openCatalogTab() {
  await userEvent.click(screen.getByText('Product Catalog'));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SettingsScreen — Catalog CRUD', () => {
  it('SC1: Existing catalog products are visible in the catalog tab', async () => {
    renderSettings();
    await openCatalogTab();
    expect(screen.getByText('Anti-Reflective Lens')).toBeInTheDocument();
    expect(screen.getByText('Rimless Frame')).toBeInTheDocument();
  });

  it('SC2: Adding a product with empty name shows error toast', async () => {
    renderSettings();
    await openCatalogTab();
    // Click "Add Product" without filling the name
    await userEvent.click(screen.getByRole('button', { name: /Add Product/i }));
    expect(showToast).toHaveBeenCalledWith('Product name is required', 'error');
  });

  it('SC3: Adding a valid product calls onUpdateCatalog with the new item', async () => {
    renderSettings({ catalog: [] });
    await openCatalogTab();
    // The name input has placeholder "e.g. Vision Luxe Glasses"
    const nameInput = screen.getByPlaceholderText(/Vision Luxe Glasses/i);
    await userEvent.type(nameInput, 'Blue Light Glasses');
    await userEvent.click(screen.getByRole('button', { name: /Add Product/i }));
    expect(onUpdateCatalog).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Blue Light Glasses' }),
      ])
    );
    expect(showToast).toHaveBeenCalledWith('Product added!', 'success');
  });

  it('SC4: Clicking the edit icon pre-populates the form with the product name', async () => {
    renderSettings();
    await openCatalogTab();
    // Edit buttons are icon-only (.btn-ghost in catalog-row-item .history-actions)
    // They appear after the "+ Invoice" button in each catalog row
    // Use querySelectorAll to get the edit buttons
    const editBtns = document.querySelectorAll('.catalog-row-item .btn-ghost');
    expect(editBtns.length).toBeGreaterThan(0);
    fireEvent.click(editBtns[0]);
    // After click, the name input should be populated with the first product's name
    const nameInput = screen.getByPlaceholderText(/Vision Luxe Glasses/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Anti-Reflective Lens');
  });

  it('SC5: Deleting a product (confirmed) calls onUpdateCatalog without it', async () => {
    renderSettings();
    await openCatalogTab();
    // Delete buttons are .btn-danger-ghost in catalog-row-item
    const deleteBtns = document.querySelectorAll('.catalog-row-item .btn-danger-ghost');
    expect(deleteBtns.length).toBeGreaterThan(0);
    fireEvent.click(deleteBtns[0]);
    // ConfirmModal appears — click the "Delete" confirm button
    await waitFor(() => screen.getByText(/Remove.*from the catalog/i));
    const confirmBtn = screen.getByRole('button', { name: /^Delete$/i });
    await userEvent.click(confirmBtn);
    // onUpdateCatalog should be called with the first product removed
    await waitFor(() => {
      expect(onUpdateCatalog).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'Rimless Frame' })])
      );
      expect(onUpdateCatalog.mock.calls[0][0]).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'Anti-Reflective Lens' })])
      );
    });
    expect(showToast).toHaveBeenCalledWith('Product deleted.', 'success');
  });

  it('SC6: Export CSV creates a download link and shows success toast', async () => {
    renderSettings();
    await openCatalogTab();
    await userEvent.click(screen.getByText(/Export CSV/i));
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Catalog CSV exported!', 'success');
  });

  it('SC7: "+ Invoice" button calls onAddToInvoice with the correct product', async () => {
    renderSettings();
    await openCatalogTab();
    // "+ Invoice" buttons - one per catalog item
    const invoiceBtns = screen.getAllByText('+ Invoice');
    await userEvent.click(invoiceBtns[0]);
    expect(onAddToInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Anti-Reflective Lens' })
    );
  });
});
