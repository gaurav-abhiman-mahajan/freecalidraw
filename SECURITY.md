# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security & Privacy Model

Freecalidraw is designed with a strict privacy-first, zero-knowledge architecture:

1. **Client-Side Storage**: All whiteboard drawings, metadata, and board titles are stored locally in the browser's IndexedDB and `localStorage`. No canvas content is stored in remote databases or sent to external cloud services.
2. **256-bit AES-GCM End-to-End Encryption**:
   - Collaboration rooms generate a cryptographic 256-bit AES-GCM key in the user's browser via the native Web Crypto API (`window.crypto.subtle`).
   - The key is appended strictly to the URL fragment (`#room=...&key=...`). Under RFC 3986, URL fragments are never sent across the network to HTTP servers and are never stored in server logs.
   - Drawing operations, scene elements, and cursor positions are encrypted client-side with AES-GCM before transport.
3. **Blind WebSocket Relay**:
   - The WebSocket relay server handles only opaque binary ciphertext.
   - The server has no knowledge of the encryption keys, room plaintext, or whiteboard contents.
4. **Zero Telemetry**:
   - Freecalidraw contains no analytics scripts, tracking pixels, or external telemetry hooks.
   - All fonts (Virgil, Cascadia, Assistant) and icons are bundled locally with zero CDN runtime requests.

## Reporting a Vulnerability

If you discover a security vulnerability or cryptographic flaw in Freecalidraw, please do not disclose it publicly in issues or discussions.

Instead, please report it via one of the following channels:
* Open a private security advisory on GitHub under the **Security** tab of the repository.
* Contact the maintainer directly via GitHub or email: `gaurav.mahajan@example.com` (or create a private repository advisory).

Please include:
* A description of the vulnerability and its potential impact.
* Detailed steps to reproduce the issue (proof-of-concept script, sample payload, or test case).
* Recommendations for remediation, if available.

We commit to acknowledging receipt of reports within 48 hours and providing updates as fixes are developed.
