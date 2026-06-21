/**
 * E2E: Invoice Creation Flow
 * Tests the full invoice creation cycle from customer details to saved history entry.
 */
import { test, expect, fillProfileWizard, clickNewInvoice, generateInvoice } from './fixtures/electron.fixture';

test.describe('Invoice Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Fresh launch → "Set Up My Business" button (no profiles yet)
    await page.click('button:has-text("Set Up My Business")');
    await fillProfileWizard(page, { name: 'Vision Opticals', invoicePrefix: 'VIS' });
    await page.waitForSelector('text=New Invoice', { timeout: 10_000 });
  });

  test('E6: Customer name is auto-uppercased when typed', async ({ page }) => {
    const customerInput = page.locator('[placeholder*="JOHN DOE"]');
    await customerInput.type('john doe');
    await expect(customerInput).toHaveValue('JOHN DOE');
  });

  test('E7: Mobile and optional GST fields accept input', async ({ page }) => {
    await page.fill('[placeholder*="9876543210"]', '9123456789');
    await expect(page.locator('[placeholder*="9876543210"]')).toHaveValue('9123456789');
  });

  test('E10: Enter key on last netRate field adds a new row', async ({ page }) => {
    const rowsBefore = await page.locator('[placeholder="Description"]').count();
    await page.locator('.editor-table [placeholder="0.00"]').last().press('Enter');
    const rowsAfter = await page.locator('[placeholder="Description"]').count();
    expect(rowsAfter).toBe(rowsBefore + 1);
  });

  test('E11: Live totals panel updates when net rate is entered', async ({ page }) => {
    await page.locator('.editor-table [placeholder="0.00"]').first().fill('1000');
    // Grand total = 1000 (tax-inclusive)
    await expect(page.locator('.totals-row.grand .val')).toContainText('1000.00', { timeout: 3_000 });
  });

  test('E12: Clicking "Generate Invoice" locks inputs and shows success toast', async ({ page }) => {
    await page.fill('[placeholder*="JOHN DOE"]', 'TEST CUSTOMER');
    await page.locator('[placeholder="Description"]').first().fill('Lens');
    await page.locator('[placeholder="0.00"]').first().fill('500');
    await generateInvoice(page);
    await expect(page.locator('.toast-message.success:has-text("Invoice generated")')).toBeVisible({ timeout: 4_000 });
    await expect(page.locator('[placeholder*="JOHN DOE"]')).toBeDisabled({ timeout: 2_000 });
  });

  test('E13: Generated invoice appears in Invoice History', async ({ page }) => {
    await page.fill('[placeholder*="JOHN DOE"]', 'HISTORY USER');
    await page.locator('[placeholder="Description"]').first().fill('Frame');
    await page.locator('[placeholder="0.00"]').first().fill('800');
    await generateInvoice(page);
    await page.waitForSelector('.toast-message.success:has-text("Invoice generated")', { timeout: 5_000 });
    // Navigate to history via sidebar
    await page.locator('.nav-item:has-text("Invoice History")').click();
    await expect(page.locator('text=HISTORY USER')).toBeVisible({ timeout: 5_000 });
  });

  test('E14: Invoice counter increments in topbar after generation', async ({ page }) => {
    const topbarBefore = await page.locator('.topbar-info').textContent();
    await page.fill('[placeholder*="JOHN DOE"]', 'COUNTER TEST');
    await page.locator('[placeholder="Description"]').first().fill('Lens');
    await page.locator('[placeholder="0.00"]').first().fill('100');
    await generateInvoice(page);
    await page.waitForSelector('.toast-message.success:has-text("Invoice generated")', { timeout: 5_000 });
    await clickNewInvoice(page);
    const topbarAfter = await page.locator('.topbar-info').textContent();
    expect(topbarAfter).not.toBe(topbarBefore);
  });
});
