import { WebSocketServer, WebSocket } from "ws";
import http from "http";

const PORT = process.env.PORT || 3002;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Excalidraw Collaboration Relay Server is active.\n");
});

const wss = new WebSocketServer({ server });

// Map of roomId -> Set of client WebSockets
const rooms = new Map();
// Map of client WebSocket -> { roomId, userId, username, color }
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

        // Notify other clients about the new peer
        broadcastToRoom(roomId, ws, {
          type: "user-joined",
          userId,
          username,
          color,
          userCount: room.size,
        });

        // Send current user count and existing peers to the joined client
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

      // For sync messages (encrypted scene elements, cursors, etc.), broadcast to room peers
      if (rooms.has(roomId)) {
        broadcastToRoom(roomId, ws, data);
      }
    } catch (err) {
      console.error("Failed to parse websocket message:", err);
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
    console.error("WebSocket client error:", err);
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

server.listen(PORT, () => {
  console.log(`Excalidraw Collaboration Relay Server running on port ${PORT}`);
});
