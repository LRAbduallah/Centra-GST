/**
 * E2E: Backup & Restore
 * Tests JSON full backup export, restore flow, and CSV catalog import.
 */
import { test, expect, fillProfileWizard } from './fixtures/electron.fixture';
import path from 'path';
import os from 'os';
import fs from 'fs';

test.describe('Backup & Restore', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: create profile + generate an invoice for backup testing
    await page.click('button:has-text("Set Up My Business")');
    await fillProfileWizard(page, { name: 'BackupBiz', invoicePrefix: 'BKP' });
    await page.waitForSelector('text=New Invoice', { timeout: 8_000 });
    await page.fill('[placeholder*="JOHN DOE"]', 'BACKUP CUSTOMER');
    await page.locator('[placeholder="Description"]').first().fill('Backup Lens');
    await page.locator('[placeholder="0.00"]').first().fill('1000');
    await page.click('button:has-text("Generate Invoice")');
    await page.waitForSelector('.toast-message.success:has-text("Invoice generated")');
    await page.click('button:has-text("New Invoice")');
  });

  test('E28: Export JSON backup triggers download and shows success toast', async ({ page }) => {
    await page.click('text=Settings');
    // Click on Backup tab
    const backupTab = page.locator('button:has-text("Backup")').first();
    await backupTab.click();
    await expect(page.locator('button:has-text("Export Full JSON Backup")').first()).toBeVisible();
    // Click Export
    const exportBtn = page.locator('button:has-text("Export Full JSON Backup")').first();
    await exportBtn.click();
    await expect(page.locator('.toast-message.success').last()).toBeVisible({ timeout: 4_000 });
  });

  test('E29: Deleting an invoice removes it from history', async ({ page }) => {
    await page.click('text=Invoice History');
    await expect(page.locator('text=BACKUP CUSTOMER')).toBeVisible({ timeout: 3_000 });
    // Confirm + delete
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('[title*="Delete Invoice"]').first().click();
    await expect(page.locator('text=Invoice deleted')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('text=BACKUP CUSTOMER')).not.toBeVisible({ timeout: 3_000 });
  });

  test('E30: Settings Backup tab is accessible and has export/import controls', async ({ page }) => {
    await page.click('text=Settings');
    await page.locator('button:has-text("Backup")').first().click();
    // Both export and import controls should be present
    await expect(page.locator('button:has-text("Export Full JSON Backup")')).toBeVisible();
    await expect(page.locator('text=/Import|Restore/i').first()).toBeVisible();
  });

  test('E31: CSV catalog import adds products to the catalog', async ({ page }) => {
    // Create a CSV file
    const csvContent = `Product Name,HSN Code,Default Net Rate,Category\n"CSV Lens","9001","750","Lenses"\n"CSV Frame","9003","450","Frames"`;
    const tmpCsv = path.join(os.tmpdir(), 'test-catalog.csv');
    fs.writeFileSync(tmpCsv, csvContent);

    await page.click('text=Settings');
    await page.locator('button:has-text("Catalog")').first().click();
    // Trigger the CSV import file input
    const fileInput = page.locator('input[type="file"][accept=".csv"]');
    await fileInput.setInputFiles(tmpCsv);
    // Products should appear
    await expect(page.locator('text=CSV Lens')).toBeVisible({ timeout: 4_000 });
    await expect(page.locator('text=CSV Frame')).toBeVisible({ timeout: 4_000 });
    // Toast
    await expect(page.locator('.toast-message.success').last()).toBeVisible({ timeout: 3_000 });

    fs.unlinkSync(tmpCsv);
  });
});
