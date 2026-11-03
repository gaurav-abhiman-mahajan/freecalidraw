import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, "../dist");
const PORT = process.env.PORT || 3000;

// MIME types lookup
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
};

// HTTP Static File Server (SPA router)
const server = http.createServer((req, res) => {
  // Ignore query string for file path
  const urlPath = req.url.split("?")[0];
  let safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  if (safePath === "/" || safePath === "\\") {
    safePath = "/index.html";
  }

  let filePath = path.join(DIST_DIR, safePath);

  // Check if requested file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      filePath = path.join(DIST_DIR, "index.html");
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Caching headers
    if (safePath.startsWith("/assets/") || safePath.startsWith("/fonts/")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      res.setHeader("Cache-Control", "no-cache");
    }

    res.writeHead(200, { "Content-Type": contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// WebSocket Collaboration Server (attached to same HTTP server)
const wss = new WebSocketServer({ server });

const rooms = new Map();
const clientMeta = new Map();

wss.on("connection", (ws) => {
  ws.on("message", (rawMessage) => {
    try {
      const data = JSON.parse(rawMessage.toString());
      const { type, roomId } = data;

      if (!roomId) return;

      if (type === "join-room") {
        const { userId, username, color } = data;
        let room = rooms.get(roomId);
        if (!room) {
          room = new Set();
          rooms.set(roomId, room);
        }
        room.add(ws);
        clientMeta.set(ws, { roomId, userId, username, color });

        broadcastToRoom(roomId, ws, {
          type: "user-joined",
          userId,
          username,
          color,
          userCount: room.size,
        });

        const peers = [];
        for (const peerWs of room) {
          if (peerWs !== ws) {
            const meta = clientMeta.get(peerWs);
            if (meta) peers.push(meta);
          }
        }
        ws.send(
          JSON.stringify({
            type: "room-joined",
            roomId,
            userCount: room.size,
            peers,
          })
        );
        return;
      }

      if (rooms.has(roomId)) {
        broadcastToRoom(roomId, ws, data);
      }
    } catch (err) {
      console.error("WebSocket message parse error:", err);
    }
  });

  ws.on("close", () => {
    const meta = clientMeta.get(ws);
    if (meta) {
      const { roomId, userId } = meta;
      clientMeta.delete(ws);
      const room = rooms.get(roomId);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          rooms.delete(roomId);
        } else {
          broadcastToRoom(roomId, ws, {
            type: "user-left",
            userId,
            userCount: room.size,
          });
        }
      }
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });
});

function broadcastToRoom(roomId, senderWs, payload) {
  const room = rooms.get(roomId);
  if (!room) return;
  const serialized = JSON.stringify(payload);
  for (const client of room) {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(serialized);
    }
  }
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Excalidraw Unified Production Server listening on http://0.0.0.0:${PORT}`);
});

// Graceful container shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    process.exit(0);
  });
});
