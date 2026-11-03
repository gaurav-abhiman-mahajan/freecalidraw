# Excalidraw Local Replica

A local-first, containerized replica of [Excalidraw](https://excalidraw.com) built for offline and local-network diagramming, multi-board management, and end-to-end encrypted real-time collaboration.

## Features

* **Complete drawing toolkit**: Hand-drawn sketchy rendering powered by Rough.js. Includes rectangles, diamonds, ellipses, arrows, lines, freehand drawing, text, image imports, eraser, laser pointer, frames, and embeddable web elements.
* **Full styling options**: Stroke colors, canvas background colors, fill styles (hachure, cross-hatch, solid, zigzag), stroke width, stroke style (solid, dashed, dotted), sloppiness / roughness, roundness, and opacity.
* **Canvas manipulations**: Zoom (+, -, 100%, zoom to fit), panning, grid mode, zen mode, view/read-only mode, dark/light theme toggle, undo/redo history stack.
* **Multi-board management**: Save, switch, rename, duplicate, and delete multiple independent whiteboards directly within the browser using local-first storage.
* **Export suite**: Export to PNG (transparent or with background, 1x/2x/3x scale, dark mode support), SVG (vector paths with fonts), and native `.excalidraw` project JSON files. Direct copy to clipboard supported for PNG.
* **Self-hosted & offline**: All fonts (Virgil, Cascadia, Excalifont, Assistant, Comic Shanns, Lilita, Nunito, Xiaolai) and locale assets are bundled locally in `public/`. No external CDN dependency.
* **Real-time collaboration**: Unified WebSocket relay server with client-side 256-bit AES-GCM end-to-end encryption (E2EE), zero-login shareable room links, and live peer cursor overlays.
* **Always-on container**: Dockerized production deployment with `restart: always` policy, integrated static asset server, and automated health checks.
* **Local domain alias**: Accessible directly via `http://excalidraw.local` without specifying port numbers.

---

## Local Domain Alias Setup (`http://excalidraw.local`)

To open Excalidraw with `http://excalidraw.local` instead of an IP or port:

### Option 1: Double-click batch script
Double-click [scripts/setup-domain.bat](file:///g:/Gamoventure/Organisation/excalidraw-clone/scripts/setup-domain.bat) in File Explorer. When prompted by Windows User Account Control (UAC), click **Yes**.

### Option 2: Run via Elevated PowerShell
Open PowerShell as Administrator and run:
```powershell
Add-Content -Path "$env:windir\System32\drivers\etc\hosts" -Value "`n127.0.0.1 excalidraw.local`n127.0.0.1 whiteboard.local"
ipconfig /flushdns
```

Once added, open [http://excalidraw.local](http://excalidraw.local) in your browser.

---

## Running with Docker (Always Running)

### Start container in background
```bash
docker compose up -d
```
* URLs:
  * Domain: [http://excalidraw.local](http://excalidraw.local)
  * Default HTTP port: [http://localhost](http://localhost)
  * Explicit port: [http://localhost:8090](http://localhost:8090)
* Restart policy: `always` (automatically relaunches on system boot or unexpected failure)

### Check container logs and status
```bash
docker compose ps
docker compose logs -f
```

### Stop container
```bash
docker compose down
```

---

## Local Development (Without Docker)

### 1. Install dependencies
```bash
npm install
```

### 2. Run dev server & collaboration relay
```bash
npm start
```
* Web application runs at: `http://localhost:5173`
* Collaboration relay runs at: `ws://localhost:3002`
