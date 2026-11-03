# Excalidraw Local Replica

A local-first, full-featured replica of [Excalidraw](https://excalidraw.com) built for offline and local-network diagramming, multi-board management, and end-to-end encrypted real-time collaboration.

## Features

* **Complete drawing toolkit**: Hand-drawn sketchy rendering powered by Rough.js. Includes rectangles, diamonds, ellipses, arrows, lines, freehand drawing, text, image imports, eraser, laser pointer, frames, and embeddable web elements.
* **Full styling options**: Stroke colors, canvas background colors, fill styles (hachure, cross-hatch, solid, zigzag), stroke width, stroke style (solid, dashed, dotted), sloppiness / roughness, roundness, and opacity.
* **Canvas manipulations**: Zoom (+, -, 100%, zoom to fit), panning, grid mode, zen mode, view/read-only mode, dark/light theme toggle, undo/redo history stack.
* **Multi-board management**: Save, switch, rename, duplicate, and delete multiple independent whiteboards directly within the browser using local-first storage.
* **Export suite**: Export to PNG (transparent or with background, 1x/2x/3x scale, dark mode support), SVG (vector paths with fonts), and native `.excalidraw` project JSON files. Direct copy to clipboard supported for PNG.
* **Self-hosted & offline**: All fonts (Virgil, Cascadia, Excalifont, Assistant, Comic Shanns, Lilita, Nunito, Xiaolai) and locale assets are bundled locally in `public/`. No external CDN dependency.
* **Real-time collaboration**: Built-in WebSocket relay server with client-side 256-bit AES-GCM end-to-end encryption (E2EE), zero-login shareable room links, and live peer cursor overlays.

## Project Structure

```
excalidraw-clone/
├── public/                 # Self-hosted fonts, chunks, and locales
├── server/
│   └── collab-server.js    # WebSocket collaboration relay on port 3002
├── src/
│   ├── components/
│   │   ├── TopBar.tsx      # Multi-board selector, save status, collab & export triggers
│   │   ├── CollabModal.tsx # E2EE collaboration room controls & link sharing
│   │   ├── ExportModal.tsx # PNG / SVG / JSON export dialog
│   │   └── PeerCursors.tsx # Real-time peer cursors and username badges
│   ├── services/
│   │   ├── collab.ts       # WebSocket client with cursor & element diff broadcasting
│   │   ├── crypto.ts       # Web Crypto API AES-GCM 256-bit encryption / decryption
│   │   ├── export.ts       # Standalone PNG, SVG, and JSON exporters
│   │   └── storage.ts      # Multi-board local persistence and state restoration
│   ├── styles/
│   │   └── app.css         # UI styles and theme definitions
│   ├── types.ts            # Type definitions
│   ├── App.tsx             # Main canvas orchestration
│   └── main.tsx            # React application entry point
├── package.json
└── vite.config.ts
```

## Running the Application

### 1. Install dependencies
```bash
npm install
```

### 2. Start the application (Vite Dev Server + Collaboration Relay)
```bash
npm start
```
* Web application runs at: `http://localhost:5173`
* Collaboration relay runs at: `ws://localhost:3002`

Alternatively, run each process individually:
```bash
# Run web client only
npm run dev

# Run collaboration relay server only
npm run server
```

### 3. Production Build
```bash
npm run build
npm run preview
```
