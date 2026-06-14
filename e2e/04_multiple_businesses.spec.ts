/**
 * E2E: Multiple Business Profiles
 * Tests profile switching, isolated catalogs, and cross-profile invoice history.
 */
import { test, expect, fillProfileWizard, clickNewInvoice } from './fixtures/electron.fixture';

/** Navigate to Settings → Profiles tab */
async function goToSettingsProfiles(page: any) {
  await page.locator('.nav-item:has-text("Settings")').click();
  await page.waitForSelector('.settings-tab-bar', { timeout: 5_000 });
  await page.locator('.settings-tab:has-text("Business Profiles")').click();
}

/** Navigate to Settings → Catalog tab */
async function goToSettingsCatalog(page: any) {
  await page.locator('.nav-item:has-text("Settings")').click();
  await page.waitForSelector('.settings-tab-bar', { timeout: 5_000 });
  await page.locator('.settings-tab:has-text("Product Catalog")').click();
}

test.describe('Multiple Business Profiles', () => {
  test.beforeEach(async ({ page }) => {
    // Create first profile
    await page.click('button:has-text("Set Up My Business")');
    await fillProfileWizard(page, { name: 'Vision Opticals', invoicePrefix: 'VIS' });
    await page.waitForSelector('text=New Invoice', { timeout: 10_000 });
  });

  test('E22: Adding a second profile shows both in the sidebar dropdown', async ({ page }) => {
    await goToSettingsProfiles(page);
    // "Add Business" button appears in the Profiles tab (not the startup screen)
    await page.locator('.settings-card button:has-text("Add Business")').click();
    await fillProfileWizard(page, { name: 'OptiCare Solutions', invoicePrefix: 'OC' });
    await page.waitForSelector('text=New Invoice', { timeout: 10_000 });
    // The sidebar profile dropdown should have both options
    const dropdown = page.locator('.profile-switcher .profile-select');
    await expect(dropdown).toBeVisible();
    const options = await dropdown.locator('option').allTextContents();
    expect(options.some((o: string) => o.includes('Vision Opticals'))).toBe(true);
    expect(options.some((o: string) => o.includes('OptiCare Solutions'))).toBe(true);
  });

  test('E23: Switching profiles updates the sidebar footer active business', async ({ page }) => {
    // Add second profile
    await goToSettingsProfiles(page);
    await page.locator('.settings-card button:has-text("Add Business")').click();
    await fillProfileWizard(page, { name: 'OptiCare', invoicePrefix: 'OC' });
    await page.waitForSelector('text=New Invoice', { timeout: 10_000 });
    // Switch back to first profile via dropdown
    await page.locator('.profile-switcher .profile-select').selectOption({ label: 'Vision Opticals' });
    await expect(page.locator('.sidebar-footer .value').first()).toContainText('Vision Opticals', { timeout: 3_000 });
  });

  test('E24: Invoice created in profile 2 appears in history for that profile', async ({ page }) => {
    // Add second profile
    await goToSettingsProfiles(page);
    await page.locator('.settings-card button:has-text("Add Business")').click();
    await fillProfileWizard(page, { name: 'OptiCare', invoicePrefix: 'OC' });
    await page.waitForSelector('text=New Invoice', { timeout: 10_000 });
    // Create invoice under profile 2
    await page.locator('.nav-item:has-text("Invoice")').first().click();
    await page.fill('[placeholder*="JOHN DOE"]', 'OPTICARE CUSTOMER');
    await page.locator('[placeholder="Description"]').first().fill('Frame');
    await page.locator('[placeholder="0.00"]').first().fill('500');
    await page.click('button:has-text("Generate Invoice")');
    await page.waitForSelector('.toast-message.success', { timeout: 5_000 });
    // Check history
    await page.locator('.nav-item:has-text("Invoice History")').click();
    await expect(page.locator('text=OPTICARE CUSTOMER')).toBeVisible({ timeout: 5_000 });
  });

  test('E25: Invoice History "All Businesses" shows invoices from both profiles', async ({ page }) => {
    // Create invoice in profile 1
    await page.locator('.nav-item:has-text("Invoice")').first().click();
    await page.fill('[placeholder*="JOHN DOE"]', 'PROFILE1 CUSTOMER');
    await page.locator('[placeholder="Description"]').first().fill('Lens');
    await page.locator('[placeholder="0.00"]').first().fill('100');
    await page.click('button:has-text("Generate Invoice")');
    await page.waitForSelector('.toast-message.success', { timeout: 5_000 });
    // Add profile 2 — dismiss ConfirmModal first
    await clickNewInvoice(page);
    await goToSettingsProfiles(page);
    await page.locator('.settings-card button:has-text("Add Business")').click();
    await fillProfileWizard(page, { name: 'SecondBiz', invoicePrefix: 'SB' });
    await page.waitForSelector('text=New Invoice', { timeout: 10_000 });
    // Create invoice in profile 2
    await page.fill('[placeholder*="JOHN DOE"]', 'PROFILE2 CUSTOMER');
    await page.locator('[placeholder="Description"]').first().fill('Frame');
    await page.locator('[placeholder="0.00"]').first().fill('200');
    await page.click('button:has-text("Generate Invoice")');
    await page.waitForSelector('.toast-message.success', { timeout: 5_000 });
    // Check History — All
    await page.locator('.nav-item:has-text("Invoice History")').click();
    await expect(page.locator('text=PROFILE1 CUSTOMER')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=PROFILE2 CUSTOMER')).toBeVisible({ timeout: 5_000 });
  });

  test('E26: Filtering by profile 1 hides profile 2 invoices', async ({ page }) => {
    // Create invoice in profile 1, then add profile 2 with its own invoice
    await page.locator('.nav-item:has-text("Invoice")').first().click();
    await page.fill('[placeholder*="JOHN DOE"]', 'P1 CUSTOMER');
    await page.locator('[placeholder="Description"]').first().fill('Lens');
    await page.locator('[placeholder="0.00"]').first().fill('100');
    await page.click('button:has-text("Generate Invoice")');
    await page.waitForSelector('.toast-message.success', { timeout: 5_000 });
    await clickNewInvoice(page);
    await goToSettingsProfiles(page);
    await page.locator('.settings-card button:has-text("Add Business")').click();
    await fillProfileWizard(page, { name: 'FilterBiz', invoicePrefix: 'FB' });
    await page.waitForSelector('text=New Invoice', { timeout: 10_000 });
    await page.fill('[placeholder*="JOHN DOE"]', 'P2 CUSTOMER');
    await page.locator('[placeholder="Description"]').first().fill('Frame');
    await page.locator('[placeholder="0.00"]').first().fill('200');
    await page.click('button:has-text("Generate Invoice")');
    await page.waitForSelector('.toast-message.success', { timeout: 5_000 });
    // Go to history, filter by profile 1
    await page.locator('.nav-item:has-text("Invoice History")').click();
    const profileSelect = page.locator('.history-filter-bar select.profile-select');
    await profileSelect.selectOption({ label: 'Vision Opticals' });
    await expect(page.locator('text=P1 CUSTOMER')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('text=P2 CUSTOMER')).not.toBeVisible({ timeout: 2_000 });
  });

  test('E27: Each profile has its own isolated catalog', async ({ page }) => {
    // Add product to profile 1
    await goToSettingsCatalog(page);
    await page.locator('[placeholder="e.g. Vision Luxe Glasses"]').fill('Profile1 Lens');
    await page.locator('[placeholder="e.g. 1500"]').fill('1000');
    await page.locator('button:has-text("Add Product")').click();
    await page.waitForSelector('.catalog-grid h4:has-text("Profile1 Lens")');
    // Add profile 2
    await goToSettingsProfiles(page);
    await page.locator('.settings-card button:has-text("Add Business")').click();
    await fillProfileWizard(page, { name: 'IsolatedBiz', invoicePrefix: 'IB' });
    await page.waitForSelector('text=New Invoice', { timeout: 10_000 });
    // Check profile 2 catalog → should NOT contain Profile1 Lens
    await goToSettingsCatalog(page);
    await expect(page.locator('.catalog-grid h4:has-text("Profile1 Lens")')).not.toBeVisible({ timeout: 3_000 });
    // Should show empty state
    await expect(page.locator('text=No Products setup yet')).toBeVisible({ timeout: 2_000 });
  });
});
