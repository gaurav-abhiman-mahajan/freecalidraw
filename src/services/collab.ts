import { encryptPayload, decryptPayload } from "./crypto";
import { PeerUser } from "../types";
import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

export interface CollabCallbacks {
  onSyncElements: (elements: readonly ExcalidrawElement[]) => void;
  onPeersUpdated: (peers: PeerUser[]) => void;
  onConnectionStatus: (status: "disconnected" | "connecting" | "connected") => void;
}

export class CollabManager {
  private ws: WebSocket | null = null;
  private roomId: string | null = null;
  private encryptionKey: string | null = null;
  private userId: string;
  private username: string;
  private userColor: string;
  private peers: Map<string, PeerUser> = new Map();
  private callbacks: CollabCallbacks;
  private isConnecting = false;
  private reconnectTimer: any = null;

  constructor(callbacks: CollabCallbacks) {
    this.callbacks = callbacks;
    this.userId = "user_" + Math.random().toString(36).substring(2, 9);
    this.username = "User " + Math.floor(1000 + Math.random() * 9000);
    this.userColor = getRandomColor();
  }

  public getUserId(): string {
    return this.userId;
  }

  public getUsername(): string {
    return this.username;
  }

  public setUsername(name: string): void {
    this.username = name;
  }

  public getUserColor(): string {
    return this.userColor;
  }

  public setUserColor(color: string): void {
    this.userColor = color;
  }

  public connect(roomId: string, encryptionKey: string, serverUrl?: string): void {
    this.disconnect();
    this.roomId = roomId;
    this.encryptionKey = encryptionKey;
    this.isConnecting = true;
    this.callbacks.onConnectionStatus("connecting");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const port = window.location.port;
    // In dev mode (Vite on port 5173), fallback to standalone relay on 3002
    // In production container (port 3000, 80, or behind reverse proxy), connect to same host/port
    const defaultWsUrl =
      port === "5173"
        ? `${protocol}//${window.location.hostname}:3002`
        : `${protocol}//${window.location.host}/ws`;

    const wsUrl = serverUrl || defaultWsUrl;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.callbacks.onConnectionStatus("connected");
        // Join room
        this.sendMessage({
          type: "join-room",
          roomId: this.roomId,
          userId: this.userId,
          username: this.username,
          color: this.userColor,
        });
      };

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          await this.handleMessage(data);
        } catch (err) {
          console.error("Error processing websocket message:", err);
        }
      };

      this.ws.onclose = () => {
        this.callbacks.onConnectionStatus("disconnected");
        this.peers.clear();
        this.callbacks.onPeersUpdated([]);
      };

      this.ws.onerror = (err) => {
        console.warn("WebSocket error:", err);
        this.callbacks.onConnectionStatus("disconnected");
      };
    } catch (e) {
      console.error("WebSocket connection failed:", e);
      this.callbacks.onConnectionStatus("disconnected");
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.roomId = null;
    this.encryptionKey = null;
    this.peers.clear();
    this.callbacks.onPeersUpdated([]);
    this.callbacks.onConnectionStatus("disconnected");
  }

  public async broadcastElements(elements: readonly ExcalidrawElement[]): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.roomId || !this.encryptionKey) {
      return;
    }

    try {
      // Encrypt the scene elements with the room key
      const ciphertext = await encryptPayload(elements, this.encryptionKey);
      this.sendMessage({
        type: "sync-elements",
        roomId: this.roomId,
        senderId: this.userId,
        payload: ciphertext,
      });
    } catch (err) {
      console.error("Failed to encrypt elements for broadcast:", err);
    }
  }

  public broadcastCursor(x: number, y: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.roomId) {
      return;
    }

    this.sendMessage({
      type: "cursor-move",
      roomId: this.roomId,
      senderId: this.userId,
      cursor: { x, y },
      username: this.username,
      color: this.userColor,
    });
  }

  private sendMessage(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private async handleMessage(data: any): Promise<void> {
    if (data.type === "room-joined") {
      this.peers.clear();
      if (Array.isArray(data.peers)) {
        for (const p of data.peers) {
          this.peers.set(p.userId, {
            userId: p.userId,
            username: p.username,
            color: p.color,
          });
        }
      }
      this.callbacks.onPeersUpdated(Array.from(this.peers.values()));
      return;
    }

    if (data.type === "user-joined") {
      this.peers.set(data.userId, {
        userId: data.userId,
        username: data.username,
        color: data.color,
      });
      this.callbacks.onPeersUpdated(Array.from(this.peers.values()));
      return;
    }

    if (data.type === "user-left") {
      this.peers.delete(data.userId);
      this.callbacks.onPeersUpdated(Array.from(this.peers.values()));
      return;
    }

    if (data.type === "cursor-move" && data.senderId !== this.userId) {
      const peer = this.peers.get(data.senderId);
      if (peer) {
        peer.cursor = data.cursor;
        peer.username = data.username || peer.username;
        peer.color = data.color || peer.color;
        peer.lastSeen = Date.now();
        this.callbacks.onPeersUpdated(Array.from(this.peers.values()));
      } else {
        this.peers.set(data.senderId, {
          userId: data.senderId,
          username: data.username || "Peer",
          color: data.color || "#6965db",
          cursor: data.cursor,
          lastSeen: Date.now(),
        });
        this.callbacks.onPeersUpdated(Array.from(this.peers.values()));
      }
      return;
    }

    if (data.type === "sync-elements" && data.senderId !== this.userId) {
      if (!this.encryptionKey) return;
      try {
        const decryptedElements = await decryptPayload<readonly ExcalidrawElement[]>(
          data.payload,
          this.encryptionKey
        );
        if (Array.isArray(decryptedElements)) {
          this.callbacks.onSyncElements(decryptedElements);
        }
      } catch (err) {
        console.error("Failed to decrypt incoming scene elements:", err);
      }
    }
  }
}

function getRandomColor(): string {
  const colors = [
    "#e03131",
    "#2f9e44",
    "#1971c2",
    "#f08c00",
    "#9c36b5",
    "#099268",
    "#e8590c",
    "#1098ad",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
