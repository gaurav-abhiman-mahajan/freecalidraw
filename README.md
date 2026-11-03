# Freecalidraw

Freecalidraw is an open source, privacy-first, self-hosted virtual whiteboard with multi-board management, client-side end-to-end encrypted collaboration, and geometric SVG and Mermaid diagram conversion.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](docker-compose.yml)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](package.json)
[![Offline Capable](https://img.shields.io/badge/Offline-100%25-brightgreen.svg)]()
[![Zero Telemetry](https://img.shields.io/badge/Telemetry-Zero-orange.svg)]()

---

## Key capabilities

* **Infinite hand-drawn canvas**: High-performance 2D sketching engine with hand-drawn aesthetic powered by Rough.js.
* **Multi-board management**: Create, switch, rename, duplicate, and delete multiple independent whiteboards locally in your browser without requiring account creation.
* **1:1 SVG to diagram conversion**: Parse vector geometries from SVGs (Mermaid, PlantUML, draw.io, Visio, Graphviz) into native Excalidraw shapes, connectors, and labels with automatic spatial binding.
* **Mermaid architecture support**: Native compilation of Mermaid flowcharts, sequence diagrams, class diagrams, and C4 architecture definitions into editable canvas elements.
* **End-to-end encrypted collaboration**: Real-time multiplayer synchronization over WebSockets with 256-bit AES-GCM client-side encryption. Server relay operates on blind ciphertext with zero knowledge of drawing contents.
* **Unified file open handling**: Cleanly open `.excalidraw`, `.json`, `.png`, and any `.svg` file without `IMAGE_NOT_CONTAINS_SCENE_DATA` errors.
* **100% offline & self-hosted**: All fonts (Virgil, Cascadia, Assistant, Excalifont) and assets are bundled locally. Zero external CDN or cloud dependencies.
* **Always-on Docker deployment**: Production multi-stage Docker container with automated healthcheck and `restart: always` policy.

---

## Feature comparison

| Feature | Excalidraw Free | Excalidraw+ (Paid SaaS) | Freecalidraw (Open Source) |
| :--- | :--- | :--- | :--- |
| **Pricing** | Free | $7 / user / mo | **Free & Open Source (MIT)** |
| **Hosting** | Cloud (excalidraw.com) | Cloud (plus.excalidraw.com) | **Self-hosted / Local / Docker** |
| **Multi-board storage** | Single active board | Cloud folders & workspaces | **Built-in multi-board local switcher** |
| **Board renaming & management** | Limited | Yes | **Yes (instant inline renamer)** |
| **SVG to connected diagram** | No (inserts static image) | No | **Yes (1:1 shape & connector parsing)** |
| **Mermaid architecture import** | Basic | Basic | **Yes (both source and vector SVG)** |
| **Real-time collaboration** | Ephemeral | Cloud workspace | **Yes (E2EE 256-bit AES-GCM relay)** |
| **Offline runtime** | Partial (requires CDN) | No | **100% Offline (bundled assets)** |
| **Zero telemetry / data lock-in** | No | No | **Yes (zero external tracking)** |

---

## Quickstart

### Option 1: Docker (Recommended for continuous local service)

Clone the repository and launch the container in detached mode:
```bash
git clone https://github.com/gaurav-abhiman-mahajan/freecalidraw.git
cd freecalidraw
docker compose up --build -d
```

The application is immediately available at:
* Standard port 80: [http://localhost/](http://localhost/)
* Secondary port 8090: [http://localhost:8090/](http://localhost:8090/)

### Option 2: Local development with Node.js

```bash
# 1. Install dependencies
npm install

# 2. Start the development server and collaboration relay
npm start
```
* Vite web app: `http://localhost:5173/`
* Collaboration WebSocket relay: `ws://localhost:3002`

---

## Local domain alias setup (`http://freecalidraw.local`)

To access Freecalidraw via `http://freecalidraw.local` without ports:

### Windows
1. Double-click [setup-domain.bat](file:///g:/Gamoventure/Organisation/excalidraw-clone/setup-domain.bat) in the project root.
2. When prompted by Windows UAC, click **Yes** to append the local mapping to `C:\Windows\System32\drivers\etc\hosts`.

### macOS / Linux
Add the host entries to `/etc/hosts`:
```bash
echo "127.0.0.1 freecalidraw.local" | sudo tee -a /etc/hosts
```

Then visit [http://freecalidraw.local](http://freecalidraw.local) in your browser.

---

## Architecture

```
freecalidraw/
├── src/
│   ├── components/
│   │   ├── TopBar.tsx           # Multi-board selector, inline renamer, quick actions
│   │   ├── CollabModal.tsx      # E2EE collaboration dialog and room sharing
│   │   ├── ExportModal.tsx      # High-resolution PNG, SVG, JSON exporter
│   │   └── MermaidModal.tsx     # SVG breakability check & diagram import UI
│   ├── services/
│   │   ├── storage.ts           # Multi-board persistence and legacy migration
│   │   ├── crypto.ts            # Web Crypto API 256-bit AES-GCM E2EE
│   │   ├── collab.ts            # WebSocket synchronization and presence engine
│   │   ├── mermaidSvg.ts        # Mermaid syntax parser and SVG normalizer
│   │   └── svgDiagramConverter.ts # 1:1 vector SVG to Excalidraw diagram converter
│   ├── styles/
│   │   └── app.css              # Theme styling and modal layout rules
│   ├── App.tsx                  # Canvas controller and open-file interceptor
│   └── main.tsx                 # React entry point and font bindings
├── server/
│   ├── collab-server.js         # Lightweight WebSocket collaboration relay
│   └── prod-server.js           # Production Express static & WebSocket server
├── public/                      # Bundled offline fonts and locale dictionaries
├── Dockerfile                   # Multi-stage production container definition
├── docker-compose.yml           # Always-on container specification
└── LICENSE                      # MIT License
```

---

## Security and encryption

Freecalidraw collaboration sessions use client-side end-to-end encryption:
1. When starting a collaboration session, the browser generates an ephemeral 256-bit AES-GCM secret key via the native Web Crypto API.
2. The key is attached exclusively to the URL fragment (`#room=...&key=...`). URL fragments are never transmitted to HTTP servers or captured in server logs.
3. Every scene change and cursor update is encrypted in the browser with AES-GCM before being dispatched over WebSockets.
4. The relay server handles only opaque binary ciphertext. It cannot read or modify the canvas state.

---

## License

Freecalidraw is licensed under the [MIT License](LICENSE).
