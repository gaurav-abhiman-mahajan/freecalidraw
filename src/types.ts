import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

export interface BoardMetadata {
  id: string;
  name: string;
  updatedAt: number;
  createdAt: number;
  elementCount: number;
}

export interface BoardData {
  id: string;
  name: string;
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  updatedAt: number;
  createdAt: number;
}

export interface PeerUser {
  userId: string;
  username: string;
  color: string;
  cursor?: {
    x: number;
    y: number;
  };
  lastSeen?: number;
}

export interface CollabSession {
  active: boolean;
  roomId: string | null;
  encryptionKey: string | null;
  username: string;
  userColor: string;
  peers: PeerUser[];
  status: "disconnected" | "connecting" | "connected";
}
