import React from "react";
import { PeerUser } from "../types";
import { sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";
import { AppState } from "@excalidraw/excalidraw/types";

interface PeerCursorsProps {
  peers: PeerUser[];
  appState: Partial<AppState> | null;
}

export const PeerCursors: React.FC<PeerCursorsProps> = ({ peers, appState }) => {
  if (!appState || peers.length === 0) return null;

  return (
    <div className="peer-cursors-overlay" style={{ pointerEvents: "none" }}>
      {peers.map((peer) => {
        if (!peer.cursor) return null;

        // Convert scene coordinates to current viewport coordinates
        try {
          const { x, y } = sceneCoordsToViewportCoords(
            { sceneX: peer.cursor.x, sceneY: peer.cursor.y },
            appState as AppState
          );

          // If out of bounds or invalid
          if (isNaN(x) || isNaN(y)) return null;

          return (
            <div
              key={peer.userId}
              className="peer-cursor-pointer"
              style={{
                position: "absolute",
                transform: `translate(${x}px, ${y}px)`,
                transition: "transform 0.08s ease-out",
                zIndex: 999999,
              }}
            >
              {/* Colored Cursor SVG */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                  fill={peer.color}
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
              </svg>
              {/* Username Badge */}
              <span
                className="peer-cursor-label"
                style={{
                  backgroundColor: peer.color,
                }}
              >
                {peer.username}
              </span>
            </div>
          );
        } catch {
          return null;
        }
      })}
    </div>
  );
};
