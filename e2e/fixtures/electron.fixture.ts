/**
 * Playwright E2E fixture: Electron app launcher
 *
 * Launches the real Electron desktop app pointing at the pre-built dist/index.html.
 * Each test gets a fresh app window with an isolated temp userData directory.
 *
 * Requires: `npm run build` to have been run first.
 */
import { test as base, expect } from '@playwright/test';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';

export type ElectronFixture = {
  app: ElectronApplication;
  page: Page;
};

export const test = base.extend<ElectronFixture>({
  app: async ({}, use) => {
    const tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'invoiceforge-e2e-'));

    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_USER_DATA: tmpUserData,
      },
    });

    await use(electronApp);

    await electronApp.close();
    fs.rmSync(tmpUserData, { recursive: true, force: true });
  },

  page: async ({ app }, use) => {
    const window = await app.firstWindow();
    window.on('console', msg => console.log('PAGE LOG:', msg.text()));
    window.on('pageerror', err => console.error('PAGE ERROR:', err.message));
    await window.waitForLoadState('domcontentloaded');
    await window.waitForSelector('.app-shell', { timeout: 15_000 });
    await use(window);
  },
});

export { expect };

/**
 * Completes the 4-step ProfileModal wizard using exact placeholder values.
 *
 * Step 0 – Business Identity  : Profile Label, Business Name
 * Step 1 – Contact & GST      : GSTIN, Address Line 1, Phone
 * Step 2 – GST & Invoice Config: Invoice Prefix (GST defaults are valid by default)
 * Step 3 – Footer & Terms     : Optional → click "Save Business"
 */
export async function fillProfileWizard(page: Page, overrides: Record<string, string> = {}) {
  const data = {
    name: overrides.name || 'Vision Opticals',
    bizName: overrides.bizName || 'Vision Opticals Pvt Ltd',
    gstNo: overrides.gstNo || '33AAYFV2352E1ZZ',
    address1: overrides.address1 || '123 MG Road, Bengaluru',
    phone: overrides.phone || '9876543210',
    invoicePrefix: overrides.invoicePrefix || 'VIS',
  };

  // Wait for the modal body to appear
  await page.waitForSelector('.modal-body', { timeout: 8_000 });

  // ── Step 0: Business Identity ──────────────────────────────────────────
  await page.locator('[placeholder="e.g. Vision Opticals (Nagercoil)"]').fill(data.name);
  await page.locator('[placeholder="VISION OPTICALS"]').fill(data.bizName);
  await clickNext(page);

  // ── Step 1: Contact & GST ──────────────────────────────────────────────
  await page.locator('[placeholder="33AAYFV2352E1ZZ"]').fill(data.gstNo);
  await page.locator('[placeholder="961, OPP: Dr.J. Mathias KP Road"]').fill(data.address1);
  await page.locator('[placeholder="04652-220560"]').fill(data.phone);
  await clickNext(page);

  // ── Step 2: GST & Invoice Config ───────────────────────────────────────
  // Default GST=18, CGST=9, SGST=9 → valid (9+9=18), Next button is enabled
  // Fill invoice prefix
  await page.locator('[placeholder="e.g. VO-"]').fill(data.invoicePrefix);
  await clickNext(page);

  // ── Step 3: Footer & Terms (optional) → Save Business ─────────────────
  await page.locator('.modal-footer button:has-text("Save Business")').click();

  // Wait for modal to close
  await page.waitForSelector('.modal-body', { state: 'hidden', timeout: 8_000 });
}

async function clickNext(page: Page) {
  const btn = page.locator('.modal-footer button:has-text("Next")');
  await btn.waitFor({ timeout: 3_000 });
  await btn.click();
  await page.waitForTimeout(300);
}
