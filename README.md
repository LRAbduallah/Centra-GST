# CentraGST

> A fully offline, secure, cross-platform desktop application for GST-compliant invoice generation and business management.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Electron](https://img.shields.io/badge/Electron-29-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite)](https://github.com/WiseLibs/better-sqlite3)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Architecture](#architecture)
- [Testing](#testing)
- [Building for Production](#building-for-production)
- [Auto-Updates](#auto-updates)
- [Security](#security)
- [License](#license)

---

## Overview

**CentraGST** is a production-ready Electron desktop application that lets businesses create, manage, and print GST-compliant invoices — entirely offline. All data is stored locally in a SQLite database file that you control. No cloud. No subscriptions. No data leaves your machine.

The application supports multiple business profiles, a reusable product catalog, GST breakdowns with automatic round-off adjustments, invoice history with search/sort, PDF/print export via the native OS print dialog, and automatic database backups.

---

## Features

### 📄 Invoice Management
- Create GST-compliant invoices with full line-item control (quantity, rate, discount, HSN code, GST %)
- Live invoice preview with real-time recalculation as you type
- Grand total rounding with explicit round-off line display
- Print invoices via the native OS print dialog (no silent print)
- Save invoices to PDF or PNG via a system file-save dialog
- Full invoice history with sort, search, and delete

### 🏢 Multi-Business Support
- Create and manage unlimited business profiles
- Each profile has its own GSTIN, address, bank details, logo, and invoice numbering
- Switch between business profiles instantly
- Profile data is isolated per-business in SQLite

### 📦 Product Catalog
- Maintain a per-business product/service catalog
- Add products directly from Settings
- Catalog browser embedded in the invoice editor — search and click to add line items
- Automatic product ingestion: new items added while invoicing are optionally saved to the catalog

### 🗄️ Local SQLite Database
- On first launch, choose to create a new database file or open an existing one
- Database path is remembered across sessions via `config.json`
- Automatic rolling backups on every app launch (retains last 3 backups)
- Manual backup restore supported from the Settings screen

### 🎨 UI & Experience
- Collapsible navigation sidebar with icon-only mode
- Dark / Light theme toggle with full adaptive styling
- Resizable split-panel layout in the invoice editor
- Custom animated `ConfirmModal` replaces all native `window.confirm` dialogs
- Legal disclaimer screen on first launch (required acceptance)
- Window size and position are remembered across sessions

### 🔒 Security & Stability
- Single-instance lock (prevents duplicate app windows)
- Context isolation + `nodeIntegration: false` (Electron security best practices)
- Content Security Policy (CSP) headers enforced at the session level
- DevTools and right-click context menu disabled in production builds
- Rolling log file (`app.log`) with automatic rotation at 10 MB
- Graceful database connection close on app quit

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | [Electron 29](https://www.electronjs.org/) |
| Frontend Framework | [React 18](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) |
| Bundler | [Vite 5](https://vitejs.dev/) |
| Database | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (SQLite) |
| Icons | [Lucide React](https://lucide.dev/) |
| PDF Export | [jsPDF](https://github.com/parallax/jsPDF) + [html2canvas](https://html2canvas.hertzen.com/) |
| Auto-Updates | [electron-updater](https://www.electron.build/auto-update) |
| Unit Testing | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) |
| E2E Testing | [Playwright](https://playwright.dev/) |
| Packaging | [electron-builder](https://www.electron.build/) |

---

## Project Structure

```
centra-gst/
├── build/
│   ├── icon.png              # 512×512 production app icon
│   └── logo.svg              # Brand SVG logo
├── e2e/                      # Playwright E2E test specs
│   ├── 01_onboarding.spec.ts
│   ├── 02_invoice_creation.spec.ts
│   ├── 03_catalog_management.spec.ts
│   ├── 04_multiple_businesses.spec.ts
│   ├── 05_backup_restore.spec.ts
│   ├── 06_persistence.spec.ts
│   └── fixtures/
│       └── electron.fixture.ts
├── electron/
│   ├── main.js               # Electron main process
│   ├── preload.js            # Secure IPC bridge
│   └── database.js           # SQLite database layer
├── scripts/
│   └── dev.js                # Concurrent Vite + Electron dev runner
├── src/
│   ├── assets/
│   │   └── logo.svg
│   ├── components/
│   │   ├── ConfirmModal.tsx        # Reusable confirm dialog
│   │   ├── DatabaseSetupScreen.tsx # DB onboarding wizard
│   │   ├── DisclaimerScreen.tsx    # Legal disclaimer
│   │   ├── InvoiceEditor.tsx       # Invoice drafting workspace
│   │   ├── InvoiceHistory.tsx      # Saved invoice list
│   │   ├── InvoicePreview.tsx      # Live printable preview
│   │   ├── ProfileModal.tsx        # Business profile modal
│   │   ├── SettingsScreen.tsx      # App settings & catalog
│   │   ├── Sidebar.tsx             # Collapsible navigation
│   │   ├── StartupScreen.tsx       # Launch screen
│   │   └── __tests__/             # Vitest unit tests
│   ├── utils/
│   │   ├── calculations.ts         # GST & total arithmetic
│   │   └── calculations.test.ts
│   ├── App.tsx                     # Root component & routing
│   ├── db.ts                       # Frontend IPC proxy for DB
│   ├── global.d.ts                 # SVG module declarations
│   ├── index.css                   # Global design system
│   ├── main.tsx                    # React entry point
│   └── types.ts                    # TypeScript interfaces
├── index.html
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── vite.config.ts
└── vitest.setup.ts
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Installation

```bash
# Clone the repository
git clone https://github.com/LRAbduallah/Centra-GST.git
cd Centra-GST

# Install dependencies (also rebuilds native modules for Electron)
npm install
```

### Run in Development

```bash
npm run dev
```

This starts the Vite dev server on `http://localhost:5173` and launches Electron pointing to it. Hot module replacement (HMR) is active for the React renderer.

> **First Launch:** You will be prompted to accept the legal disclaimer, then choose a location to create (or open an existing) SQLite database file.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server + Electron in development mode |
| `npm run build` | Compile TypeScript and bundle with Vite |
| `npm run electron:build` | Build renderer then package for macOS (DMG) and Windows (NSIS) |
| `npm test` | Run all Vitest unit tests once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run Vitest with V8 coverage report |
| `npm run test:e2e` | Run all Playwright E2E tests |
| `npm run rebuild` | Rebuild native modules (e.g. after Electron version change) |

---

## Architecture

### Electron + React IPC Model

```
┌─────────────────────────────┐
│   React Renderer (Vite)     │
│                             │
│  src/db.ts  ──────────────► │  window.electronAPI (preload)
└─────────────────────────────┘
            │  contextBridge
            ▼
┌─────────────────────────────┐
│   electron/preload.js       │  Exposes safe IPC methods
└─────────────────────────────┘
            │  ipcRenderer.invoke
            ▼
┌─────────────────────────────┐
│   electron/main.js          │  ipcMain.handle → database.js
│   electron/database.js      │  better-sqlite3 (synchronous)
└─────────────────────────────┘
            │
            ▼
       centragst.db  (local SQLite file, user-chosen path)
```

- **`electron/database.js`**: The only file that touches the SQLite database. Exposes synchronous functions (`getProfiles`, `upsertInvoice`, etc.) called by `main.js` IPC handlers.
- **`electron/preload.js`**: Uses `contextBridge` to expose `window.electronAPI` with named methods. No raw IPC channels exposed to the renderer.
- **`src/db.ts`**: The renderer-side proxy that calls `window.electronAPI.*` methods. React components import from `src/db.ts` and never reference Electron APIs directly.

### Database Schema (SQLite)

| Table | Columns |
|---|---|
| `profiles` | `id`, `data` (JSON blob), `created_at`, `updated_at` |
| `catalog` | `id`, `profile_id`, `data` (JSON blob), `created_at`, `updated_at` |
| `invoices` | `id`, `profile_id`, `data` (JSON blob), `created_at`, `updated_at` |
| `settings` | `key`, `value` |

---

## Testing

### Unit Tests (Vitest)

```bash
npm test               # Run once
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage
```

Unit tests cover:
- `calculations.ts` — GST arithmetic, line totals, round-off
- `InvoiceEditor` — form interactions, line item management
- `InvoiceHistory` — sort, filter, delete flows
- `SettingsScreen` — catalog CRUD, business profile management

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

E2E specs launch the real Electron app in test mode and cover:

| Spec | Scenario |
|---|---|
| `01_onboarding` | Disclaimer acceptance + DB initialization |
| `02_invoice_creation` | Full draft → save → print flow |
| `03_catalog_management` | Product creation, search, add-to-invoice |
| `04_multiple_businesses` | Profile creation, switching, editing |
| `05_backup_restore` | Backup generation + restoration |
| `06_persistence` | Data survival across cold app restarts |

---

## Building for Production

```bash
npm run electron:build
```

Output is placed in `dist-desktop/`:
- **macOS**: `.dmg` installer
- **Windows**: `.exe` NSIS installer (x64)

Build targets are configured in `package.json` under the `"build"` key (electron-builder config).

> **Note:** macOS builds require a Mac; Windows builds require either Windows or a cross-compilation setup.

---

## Auto-Updates

CentraGST uses [electron-updater](https://www.electron.build/auto-update) with GitHub Releases as the update provider.

- Configured in `package.json` `publish` field:
  ```json
  { "provider": "github", "owner": "LRAbduallah", "repo": "Centra-GST" }
  ```
- On packaged app startup, `autoUpdater.checkForUpdatesAndNotify()` is called automatically.
- Updates are only checked in packaged builds (not in development or E2E test mode).

To publish a new release, push a git tag and let the CI pipeline build + attach the artifacts to a GitHub Release.

---

## Security

| Mechanism | Detail |
|---|---|
| `contextIsolation: true` | Renderer process cannot access Node.js APIs directly |
| `nodeIntegration: false` | Standard Electron security hardening |
| Content Security Policy | Enforced via `session.defaultSession.webRequest.onHeadersReceived` + `<meta>` tag |
| Single Instance Lock | `app.requestSingleInstanceLock()` prevents duplicate windows |
| DevTools disabled | `webContents.openDevTools()` is blocked and closed in production |
| Context menu disabled | Right-click menu suppressed in production builds |
| IPC validation | All IPC handlers in `main.js` validate inputs before DB operations |

---

## License

[MIT](./LICENSE) © CentraGST Dev