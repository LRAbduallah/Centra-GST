/**
 * E2E: Onboarding Flow
 * Tests the first-run experience: startup screen → profile creation → New Invoice screen
 */
import { test, expect, fillProfileWizard } from './fixtures/electron.fixture';

test.describe('Onboarding Flow', () => {
  test('E1: Fresh launch shows startup / welcome screen', async ({ page }) => {
    // With empty userData, no profiles exist → welcome screen shown
    await expect(page.locator('text=Welcome to InvoiceForge')).toBeVisible();
  });

  test('E2: Clicking "Set Up My Business" opens the profile modal', async ({ page }) => {
    await page.click('button:has-text("Set Up My Business")');
    // Modal with step indicator should appear
    await expect(page.locator('.modal-body')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=Step 1: Business Identity')).toBeVisible();
  });

  test('E3: Filling wizard step 0 and clicking Next advances to step 2', async ({ page }) => {
    await page.click('button:has-text("Set Up My Business")');
    await page.waitForSelector('.modal-body', { timeout: 5_000 });
    // Fill Step 0
    await page.locator('[placeholder="e.g. Vision Opticals (Nagercoil)"]').fill('Test Biz');
    await page.locator('[placeholder="VISION OPTICALS"]').fill('Test Business Ltd');
    await page.locator('.modal-footer button:has-text("Next")').click();
    // Step 2 should appear
    await expect(page.locator('text=Step 2: Contact Details')).toBeVisible({ timeout: 3_000 });
  });

  test('E4: After completing wizard, navigates to New Invoice screen', async ({ page }) => {
    await page.click('button:has-text("Set Up My Business")');
    await fillProfileWizard(page, { name: 'Vision Opticals', invoicePrefix: 'VIS' });
    await expect(page.locator('text=New Invoice')).toBeVisible({ timeout: 8_000 });
  });

  test('E5: Topbar shows correct business name after setup', async ({ page }) => {
    await page.click('button:has-text("Set Up My Business")');
    await fillProfileWizard(page, { name: 'Vision Opticals', invoicePrefix: 'VIS' });
    await page.waitForSelector('text=New Invoice', { timeout: 8_000 });
    // Profile name should appear in topbar or sidebar
    await expect(page.locator('.sidebar-footer')).toContainText('Vision Opticals Pvt Ltd');
  });
});
