/**
 * E2E: Data Persistence
 * Tests that data survives an app restart (close + reopen).
 * This is the most critical test for the SQLite migration regression gate.
 */
import { test as base, expect, fillProfileWizard } from './fixtures/electron.fixture';
import { _electron as electron } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Custom fixture that uses a PERSISTENT (not temp) userData directory
// so we can close and reopen the app in the same test
const test = base.extend<{ persistentUserData: string }>({
  persistentUserData: async ({}, use) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'invoiceforge-persist-'));
    await use(dir);
    fs.rmSync(dir, { recursive: true, force: true });
  },
});

async function launchApp(userDataDir: string) {
  return electron.launch({
    args: [path.join(__dirname, '../electron/main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ELECTRON_USER_DATA: userDataDir,
    },
  });
}

test.describe('Data Persistence Across Restarts', () => {
  test('E32: Invoice persists after app close and reopen', async ({ persistentUserData }) => {
    // Session 1: Create profile + invoice
    let app = await launchApp(persistentUserData);
    let page = await app.firstWindow();
    await page.waitForSelector('.app-shell', { timeout: 10_000 });
    await page.click('button:has-text("Set Up My Business")');
    await fillProfileWizard(page, { name: 'PersistBiz', invoicePrefix: 'PST' });
    await page.waitForSelector('text=New Invoice', { timeout: 8_000 });
    await page.fill('[placeholder*="JOHN DOE"]', 'PERSIST USER');
    await page.locator('[placeholder="Description"]').first().fill('Persisted Lens');
    await page.locator('[placeholder="0.00"]').first().fill('999');
    await page.click('button:has-text("Generate Invoice")');
    await page.waitForSelector('.toast-message.success');
    await app.close();

    // Session 2: Reopen and verify invoice exists
    app = await launchApp(persistentUserData);
    page = await app.firstWindow();
    await page.waitForSelector('.app-shell', { timeout: 10_000 });
    await page.click('text=Invoice History');
    await expect(page.locator('text=PERSIST USER')).toBeVisible({ timeout: 5_000 });
    await app.close();
  });

  test('E33: Profile settings persist after restart', async ({ persistentUserData }) => {
    // Session 1: Create profile
    let app = await launchApp(persistentUserData);
    let page = await app.firstWindow();
    await page.waitForSelector('.app-shell', { timeout: 10_000 });
    await page.click('button:has-text("Set Up My Business")');
    await fillProfileWizard(page, { name: 'ProfilePersist', bizName: 'ProfilePersist Pvt Ltd', invoicePrefix: 'PP' });
    await page.waitForSelector('text=New Invoice', { timeout: 8_000 });
    await app.close();

    // Session 2: Verify profile data
    app = await launchApp(persistentUserData);
    page = await app.firstWindow();
    await page.waitForSelector('.app-shell', { timeout: 10_000 });
    await expect(page.locator('.sidebar-footer')).toContainText('ProfilePersist Pvt Ltd', { timeout: 5_000 });
    await app.close();
  });

  test('E34: Catalog items persist after restart', async ({ persistentUserData }) => {
    // Session 1: Create profile + catalog item
    let app = await launchApp(persistentUserData);
    let page = await app.firstWindow();
    await page.waitForSelector('.app-shell', { timeout: 10_000 });
    await page.click('button:has-text("Set Up My Business")');
    await fillProfileWizard(page, { name: 'CatalogPersist', invoicePrefix: 'CP' });
    await page.waitForSelector('text=New Invoice', { timeout: 8_000 });
    await page.click('text=Settings');
    await page.locator('.settings-tab:has-text("Product Catalog")').click();
    await page.locator('[placeholder="e.g. Vision Luxe Glasses"]').fill('Persistent Lens');
    await page.locator('[placeholder="e.g. 1500"]').fill('1500');
    await page.click('button:has-text("Add Product")');
    await page.waitForSelector('text=Persistent Lens');
    await app.close();

    // Session 2: Catalog still has the product
    app = await launchApp(persistentUserData);
    page = await app.firstWindow();
    await page.waitForSelector('.app-shell', { timeout: 10_000 });
    await page.click('text=Settings');
    await page.locator('.settings-tab:has-text("Product Catalog")').click();
    await expect(page.locator('text=Persistent Lens')).toBeVisible({ timeout: 5_000 });
    await app.close();
  });
});
