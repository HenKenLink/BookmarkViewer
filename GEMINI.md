# 🤖 AI Assistant Instructions (GEMINI.md)
This document provides context and guidelines to help you (the AI coding assistant) write correct, idiomatic, and maintainable code for this repository.

## 📚 Project Overview
This is a cross-browser extension (Chrome & Firefox) built for viewing and managing browser bookmarks. It is powered by the **WXT** framework, providing a modern, vite-powered development experience for browser extensions.

## 🛠️ Tech Stack & Tooling
- **Extension Framework**: [WXT](https://wxt.dev/)
- **UI Library**: React 19
- **Language**: TypeScript
- **Package Manager**: `pnpm`
- **Component Library**: Material-UI v7 & Emotion
- **State Management**: Zustand
- **Routing**: React Router v7 (`react-router-dom`)
- **Other Key Dependencies**: CodeMirror (for code editing/viewing), Sonner (toast notifications), JSZip & FileSaver (data export).

## 📁 Directory Structure
The project leverages WXT's convention-based `entrypoints/` directory to define the extension's moving parts:
- **`entrypoints/background/`** - The extension's background script / Service Worker. Handles long-running tasks, event listening, and state synchronization.
- **`entrypoints/popup/`** - The UI rendered when clicking the extension icon in the browser toolbar. Contains its own React app (`App.tsx`, `store.ts`, `Components/`).
- **`entrypoints/viewer/`** - The main React application for the full-page bookmark viewer. Features its own routing (`Pages/`), UI components (`Components/`), and state (`store/`).
- **`entrypoints/notification-overlay/`** - A content script or UI overlay injected into web pages to display notifications.
- **`entrypoints/global/`** - Shared utilities, global constants, types, message-passing helpers, and logger used across multiple entrypoints.
- **`assets/`** & **`public/`** - Static assets and icons.

## 📝 Coding Guidelines & Conventions
When assisting with this project, please adhere to the following rules:

### 1. General & TypeScript
- **TypeScript First**: Always use strict typing. Avoid `any`; use `unknown` if necessary, or define proper interfaces/types in `entrypoints/global/types.ts`.
- **Modularity**: Keep utility functions pure and extract shared logic into `entrypoints/global/` or module-specific `utils/` directories.
- **ES Modules**: Use ES modules syntax (`import`/`export`).

### 2. Extension APIs & WXT
- Use the standard `browser.*` or `chrome.*` APIs for extension functionality (e.g., `browser.storage.local`, `browser.bookmarks`). WXT handles the necessary polyfills automatically.
- **Messaging**: Be cautious of asynchronous messaging across boundaries (e.g., popup to background, or content script to background). Use the utility functions defined in `entrypoints/global/message.ts` if available.
- **Browser Compatibility**: Always consider compatibility between **Chrome** and **Firefox**. Use WXT's built-in features and constants (like `__CHROME__`) to handle browser-specific logic if necessary. Ensure the UI remains consistent across different browser engines (Blink and Gecko).
- Respect Manifest V3 constraints, particularly regarding the Service Worker lifecycle.

### 3. React & UI (MUI)
- **Functional Components**: Write functional React components using Hooks.
- **Material-UI**: Use MUI components for the UI. Prefer MUI's `sx` prop or styled-components via Emotion for custom styling over raw CSS files (unless dealing with content script overlays like `notification-overlay/style.css`).
- **State Management**: Keep UI component state local using `useState`. For complex or shared state, use **Zustand** stores (e.g., `viewer/store` and `popup/store.ts`).
- **Alerts/Toasts**: Use `sonner` for displaying toast notifications to the user.

### 4. Code Style
- Follow the existing formatting. (Look at neighboring files to mimic their style).
- Use clear and descriptive variable names (e.g., PascalCase for React components, camelCase for functions/utilities).
- Add comments only for complex business logic, regex, or non-obvious cross-communication between extension entrypoints. Do not add redundant comments for obvious React patterns.

## 🚀 Common Commands
The project uses `pnpm` as its package manager.
- `pnpm install` - Install dependencies
- `pnpm dev` - Start the WXT dev server with Hot-Module Replacement (HMR) for Chrome.
- `pnpm dev:firefox` - Start the dev server for Firefox.
- `pnpm build` - Build the production extension.
- `pnpm compile` - Run TypeScript type checking.

---
**Note to AI:** Always read existing related files (using your `read` or `glob` tools) before planning or implementing code changes to ensure you adhere to the project's exact implementation details.
