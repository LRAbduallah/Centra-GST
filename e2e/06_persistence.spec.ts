/**
 * E2E: Data Persistence
 * Tests that data survives an app restart (close + reopen).
 * This is the most critical test for the SQLite migration regression gate.
 */
import { test as base, expect, fillProfileWizard, generateInvoice } from './fixtures/electron.fixture';
import { _electron as electron, ElectronApplication } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Custom fixture that uses a PERSISTENT (not temp) userData directory
// so we can close and reopen the app in the same test
const test = base.extend<{ persistentUserData: string }>({
  persistentUserData: async ({}, use) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'centragst-persist-'));
    await use(dir);
    fs.rmSync(dir, { recursive: true, force: true });
  },
});

async function launchApp(userDataDir: string) {
  const app = await electron.launch({
    args: [path.join(__dirname, '../electron/main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ELECTRON_USER_DATA: userDataDir,
    },
  });
  app.process().stdout?.on('data', data => {
    const str = data.toString().trim();
    if (str) console.log(`MAIN STDOUT: ${str}`);
  });
  app.process().stderr?.on('data', data => {
    const str = data.toString().trim();
    if (str) console.error(`MAIN STDERR: ${str}`);
  });
  return app;
}

// Retrieves the window page and accepts the terms automatically if displayed
async function getPageAndAcceptTerms(app: ElectronApplication) {
  const page = await app.firstWindow();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  // Wait for database loading screen to disappear
  await page.waitForSelector('text=Loading Database...', { state: 'hidden', timeout: 10_000 });

  try {
    // Wait up to 3 seconds for either disclaimer, welcome setup button, or dashboard sidebar to be visible
    await Promise.any([
      page.waitForSelector('.disclaimer-scroll-box', { state: 'visible', timeout: 3000 }),
      page.waitForSelector('text=Set Up My Business', { state: 'visible', timeout: 3000 }),
      page.waitForSelector('.sidebar-footer', { state: 'visible', timeout: 3000 })
    ]);
  } catch (e) {
    // Ignore
  }

  const disclaimer = page.locator('.disclaimer-scroll-box');
  try {
    if (await disclaimer.isVisible()) {
      await disclaimer.evaluate(el => {
        el.scrollTop = el.scrollHeight;
        el.dispatchEvent(new Event('scroll'));
      });
      await page.waitForTimeout(200);
      await page.check('#accept-terms-checkbox');
      await page.click('button:has-text("Accept & Continue")');
      await page.waitForSelector('.disclaimer-scroll-box', { state: 'hidden', timeout: 5000 });
    }
  } catch (err) {
    // Ignore
  }
  return page;
}

test.describe('Data Persistence Across Restarts', () => {
  test('E32: Invoice persists after app close and reopen', async ({ persistentUserData }) => {
    // Session 1: Create profile + invoice
    let app = await launchApp(persistentUserData);
    let page = await getPageAndAcceptTerms(app);
    await page.click('button:has-text("Set Up My Business")');
    await fillProfileWizard(page, { name: 'PersistBiz', invoicePrefix: 'PST' });
    await page.waitForSelector('text=New Invoice', { timeout: 8_000 });
    await page.fill('[placeholder*="JOHN DOE"]', 'PERSIST USER');
    await page.locator('[placeholder="Description"]').first().fill('Persisted Lens');
    await page.locator('[placeholder="0.00"]').first().fill('999');
    await generateInvoice(page);
    await page.waitForSelector('.toast-message.success:has-text("Invoice generated")');
    await app.close();

    // Wait a bit to ensure locks are fully released
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Session 2: Reopen and verify invoice exists
    app = await launchApp(persistentUserData);
    page = await getPageAndAcceptTerms(app);
    await page.click('text=Invoice History');
    await expect(page.locator('text=PERSIST USER')).toBeVisible({ timeout: 5_000 });
    await app.close();
  });

  test('E33: Profile settings persist after restart', async ({ persistentUserData }) => {
    // Session 1: Create profile
    let app = await launchApp(persistentUserData);
    let page = await getPageAndAcceptTerms(app);
    await page.click('button:has-text("Set Up My Business")');
    await fillProfileWizard(page, { name: 'ProfilePersist', bizName: 'ProfilePersist Pvt Ltd', invoicePrefix: 'PP' });
    await page.waitForSelector('text=New Invoice', { timeout: 8_000 });
    await app.close();

    // Wait a bit to ensure locks are fully released
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Session 2: Verify profile data
    app = await launchApp(persistentUserData);
    page = await getPageAndAcceptTerms(app);
    await expect(page.locator('.sidebar-footer')).toContainText('ProfilePersist Pvt Ltd', { timeout: 5_000 });
    await app.close();
  });

  test('E34: Catalog items persist after restart', async ({ persistentUserData }) => {
    // Session 1: Create profile + catalog item
    let app = await launchApp(persistentUserData);
    let page = await getPageAndAcceptTerms(app);
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

    // Wait a bit to ensure locks are fully released
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Session 2: Catalog still has the product
    app = await launchApp(persistentUserData);
    page = await getPageAndAcceptTerms(app);
    await page.click('text=Settings');
    await page.locator('.settings-tab:has-text("Product Catalog")').click();
    await expect(page.locator('text=Persistent Lens')).toBeVisible({ timeout: 5_000 });
    await app.close();
  });
});
