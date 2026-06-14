/**
 * E2E: Catalog Management
 * Tests adding, editing, deleting products and using the catalog browser in invoice editor.
 */
import { test, expect, fillProfileWizard, confirmModal } from './fixtures/electron.fixture';

/** Navigate to Settings → Catalog tab via the sidebar nav items */
async function goToSettingsCatalog(page: any) {
  await page.locator('.nav-item:has-text("Settings")').click();
  await page.waitForSelector('.settings-tab-bar', { timeout: 5_000 });
  await page.locator('.settings-tab:has-text("Product Catalog")').click();
  await page.waitForSelector('[placeholder="e.g. Vision Luxe Glasses"]', { timeout: 5_000 });
}

test.describe('Catalog Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('button:has-text("Set Up My Business")');
    await fillProfileWizard(page, { name: 'Vision Opticals', invoicePrefix: 'VIS' });
    await page.waitForSelector('text=New Invoice', { timeout: 10_000 });
  });

  test('E15: Catalog tab shows the product input form', async ({ page }) => {
    await goToSettingsCatalog(page);
    await expect(page.locator('[placeholder="e.g. Vision Luxe Glasses"]')).toBeVisible();
  });

  test('E16: Add a product and it appears in the catalog list', async ({ page }) => {
    await goToSettingsCatalog(page);
    await page.locator('[placeholder="e.g. Vision Luxe Glasses"]').fill('Photochromic Lens');
    await page.locator('[placeholder="e.g. 1500"]').fill('2500');
    await page.locator('[placeholder="Sunglasses, Frames, Lenses..."]').fill('Lenses');
    await page.locator('button:has-text("Add Product")').click();
    await expect(page.locator('.catalog-grid h4:has-text("Photochromic Lens")')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('.toast-message.success').last()).toBeVisible({ timeout: 3_000 });
  });

  test('E17: Edit a product and the updated rate is shown', async ({ page }) => {
    // Add a product first
    await goToSettingsCatalog(page);
    await page.locator('[placeholder="e.g. Vision Luxe Glasses"]').fill('Blue Block Lens');
    await page.locator('[placeholder="e.g. 1500"]').fill('1800');
    await page.locator('button:has-text("Add Product")').click();
    await page.waitForSelector('.catalog-grid h4:has-text("Blue Block Lens")');
    // Click the edit button (btn-ghost in catalog-row-item)
    await page.locator('.catalog-row-item .btn-ghost').first().click();
    // Form is now pre-filled — update rate
    await page.locator('[placeholder="e.g. 1500"]').fill('2200');
    await page.locator('button:has-text("Update Product")').click();
    await expect(page.locator('text=2200')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('.toast-message.success').last()).toBeVisible({ timeout: 3_000 });
  });

  test('E18: Delete a product removes it from the list', async ({ page }) => {
    await goToSettingsCatalog(page);
    await page.locator('[placeholder="e.g. Vision Luxe Glasses"]').fill('Delete Me Lens');
    await page.locator('[placeholder="e.g. 1500"]').fill('100');
    await page.locator('button:has-text("Add Product")').click();
    await page.waitForSelector('.catalog-grid h4:has-text("Delete Me Lens")');
    // Click the danger delete button — ConfirmModal will appear, confirm it
    await confirmModal(
      page,
      page.locator('.catalog-row-item .btn-danger-ghost').first(),
      'Delete'
    );
    await expect(page.locator('.catalog-grid h4:has-text("Delete Me Lens")')).not.toBeVisible({ timeout: 3_000 });
    await expect(page.locator('.toast-message.success').last()).toBeVisible({ timeout: 3_000 });
  });

  test('E19: Added product appears in invoice description autocomplete', async ({ page }) => {
    await goToSettingsCatalog(page);
    await page.locator('[placeholder="e.g. Vision Luxe Glasses"]').fill('Zeiss Lens');
    await page.locator('[placeholder="e.g. 1500"]').fill('3000');
    await page.locator('button:has-text("Add Product")').click();
    await page.waitForSelector('.catalog-grid h4:has-text("Zeiss Lens")');
    // Go to New Invoice
    await page.locator('.nav-item:has-text("Invoice")').first().click();
    const descInput = page.locator('[placeholder="Description"]').first();
    await descInput.click();
    await descInput.type('Zeiss');
    await expect(page.locator('.autocomplete-list')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('.autocomplete-item:has-text("Zeiss Lens")')).toBeVisible();
  });

  test('E20: Catalog Browser modal shows the product', async ({ page }) => {
    await goToSettingsCatalog(page);
    await page.locator('[placeholder="e.g. Vision Luxe Glasses"]').fill('Modal Test Lens');
    await page.locator('[placeholder="e.g. 1500"]').fill('900');
    await page.locator('button:has-text("Add Product")').click();
    await page.waitForSelector('.catalog-grid h4:has-text("Modal Test Lens")');
    await page.locator('.nav-item:has-text("Invoice")').first().click();
    await page.locator('button:has-text("Add From Catalog")').click();
    await expect(page.locator('text=Browse Product Catalog')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('.modal-box h4:has-text("Modal Test Lens")')).toBeVisible();
  });

  test('E21: Selecting 2 products in modal adds 2 line items', async ({ page }) => {
    // Add 2 catalog products
    await goToSettingsCatalog(page);
    await page.locator('[placeholder="e.g. Vision Luxe Glasses"]').fill('Lens A');
    await page.locator('[placeholder="e.g. 1500"]').fill('500');
    await page.locator('button:has-text("Add Product")').click();
    await page.waitForSelector('.catalog-grid h4:has-text("Lens A")');
    await page.locator('[placeholder="e.g. Vision Luxe Glasses"]').fill('Lens B');
    await page.locator('[placeholder="e.g. 1500"]').fill('600');
    await page.locator('button:has-text("Add Product")').click();
    await page.waitForSelector('.catalog-grid h4:has-text("Lens B")');

    await page.locator('.nav-item:has-text("Invoice")').first().click();
    await page.locator('button:has-text("Add From Catalog")').click();
    await page.waitForSelector('.modal-box', { timeout: 3_000 });

    await page.locator('.modal-box .profile-row-item:has-text("Lens A")').click();
    await page.locator('.modal-box .profile-row-item:has-text("Lens B")').click();
    await page.locator('button:has-text("Add Selected (2)")').click();

    const rowsAfter = await page.locator('[placeholder="Description"]').count();
    expect(rowsAfter).toBeGreaterThanOrEqual(2);
    await expect(page.locator('.toast-message.success').last()).toBeVisible({ timeout: 3_000 });
  });
});
