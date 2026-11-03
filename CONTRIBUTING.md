# Contributing to Freecalidraw

Thank you for your interest in contributing to Freecalidraw. We welcome contributions, bug fixes, architecture discussions, and documentation improvements.

---

## Code of conduct

Freecalidraw is an open, welcoming community. Treat all participants with respect, empathy, and professional courtesy.

---

## Development workflow

### Prerequisites
* Node.js 20 or higher
* npm 10 or higher
* Docker & Docker Compose (optional for containerized deployment)

### Setup
1. Fork and clone the repository:
   ```bash
   git clone https://github.com/your-username/freecalidraw.git
   cd freecalidraw
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server and local collaboration relay:
   ```bash
   npm start
   ```
   * Frontend: `http://localhost:5173/`
   * Collaboration relay: `ws://localhost:3002`

---

## Submitting changes

1. Create a descriptive feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Ensure the production build passes without TypeScript errors:
   ```bash
   npm run build
   ```
3. Commit using conventional commit format:
   * `feat: add multi-page presentation export`
   * `fix: prevent board race condition on rename`
   * `docs: update deployment instructions`
4. Push to your branch and open a Pull Request.

---

## Core design principles

1. **Zero telemetry**: Never send canvas content, board names, or user activity to external servers or analytics.
2. **Offline-first**: All fonts, locales, and diagram engines must be self-hosted with zero CDN runtime dependencies.
3. **End-to-end encryption**: Collaboration payloads must be encrypted client-side using Web Crypto AES-GCM before reaching any transport relay.
4. **Resilient storage**: Avoid destructive scene updates and prevent cross-board state leakage.
