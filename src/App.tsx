import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Excalidraw,
  reconcileElements,
  CaptureUpdateAction,
  MainMenu,
  WelcomeScreen,
} from "@excalidraw/excalidraw";
import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { AppState, BinaryFiles, ExcalidrawImperativeAPI, Collaborator } from "@excalidraw/excalidraw/types";

import { TopBar } from "./components/TopBar";
import { CollabModal } from "./components/CollabModal";
import { ExportModal } from "./components/ExportModal";
import { MermaidModal } from "./components/MermaidModal";

import {
  listBoards,
  loadBoard,
  saveBoard,
  createBoard,
  deleteBoard,
  renameBoard,
  getActiveBoardId,
  setActiveBoardId,
} from "./services/storage";
import { CollabManager } from "./services/collab";
import {
  generateSecretKey,
  createRoomUrl,
  parseRoomUrl,
  clearRoomUrl,
} from "./services/crypto";
import { BoardMetadata, CollabSession, PeerUser } from "./types";

export const App: React.FC = () => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);

  // Stable initial data loaded once before mount
  const [initialData] = useState(() => {
    const activeId = getActiveBoardId();
    const board = loadBoard(activeId);
    return {
      elements: board ? board.elements : [],
      appState: board ? { ...board.appState, theme: "light" as const } : { theme: "light" as const },
      files: board ? board.files : {},
    };
  });

  const [boards, setBoards] = useState<BoardMetadata[]>([]);
  const [activeBoardIdState, setActiveBoardIdState] = useState<string>(() => getActiveBoardId());
  const [currentBoardName, setCurrentBoardName] = useState<string>(() => {
    const board = loadBoard(getActiveBoardId());
    return board ? board.name : "Whiteboard";
  });
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Modals state
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMermaidModalOpen, setIsMermaidModalOpen] = useState(false);

  // Cached state for export modal (updated only when export modal opens)
  const [exportData, setExportData] = useState<{
    elements: readonly ExcalidrawElement[];
    appState: Partial<AppState>;
    files: BinaryFiles;
  }>({
    elements: [],
    appState: {},
    files: {},
  });

  // Collaboration state
  const [collabSession, setCollabSession] = useState<CollabSession>({
    active: false,
    roomId: null,
    encryptionKey: null,
    username: "User " + Math.floor(1000 + Math.random() * 9000),
    userColor: "#6965db",
    peers: [],
    status: "disconnected",
  });

  const collabManagerRef = useRef<CollabManager | null>(null);
  const saveTimeoutRef = useRef<any>(null);
  const isRemoteSyncRef = useRef<boolean>(false);
  const activeBoardIdRef = useRef<string>(activeBoardIdState);
  const currentBoardNameRef = useRef<string>(currentBoardName);

  activeBoardIdRef.current = activeBoardIdState;
  currentBoardNameRef.current = currentBoardName;

  // Initialize collab manager
  useEffect(() => {
    const manager = new CollabManager({
      onSyncElements: (remoteElements) => {
        if (!excalidrawAPI) return;
        isRemoteSyncRef.current = true;
        const localElements = excalidrawAPI.getSceneElements();
        const merged = reconcileElements(localElements, remoteElements as any, excalidrawAPI.getAppState());
        excalidrawAPI.updateScene({
          elements: merged,
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        setTimeout(() => {
          isRemoteSyncRef.current = false;
        }, 50);
      },
      onPeersUpdated: (peers: PeerUser[]) => {
        setCollabSession((prev) => ({ ...prev, peers }));

        // Map peers to Excalidraw's native collaborators
        if (excalidrawAPI) {
          const collaboratorsMap = new Map();
          for (const peer of peers) {
            if (peer.cursor) {
              collaboratorsMap.set(peer.userId, {
                pointer: {
                  x: peer.cursor.x,
                  y: peer.cursor.y,
                  tool: "pointer",
                  renderCursor: true,
                },
                username: peer.username,
                color: {
                  background: peer.color,
                  stroke: peer.color,
                },
              });
            }
          }
          excalidrawAPI.updateScene({ collaborators: collaboratorsMap as any });
        }
      },
      onConnectionStatus: (status) => {
        setCollabSession((prev) => ({
          ...prev,
          status,
          active: status === "connected",
        }));
      },
    });

    collabManagerRef.current = manager;
    setCollabSession((prev) => ({
      ...prev,
      username: manager.getUsername(),
      userColor: manager.getUserColor(),
    }));

    // Check if URL has #room=roomId,secretKey
    const roomInfo = parseRoomUrl();
    if (roomInfo) {
      manager.connect(roomInfo.roomId, roomInfo.key);
      setCollabSession((prev) => ({
        ...prev,
        roomId: roomInfo.roomId,
        encryptionKey: roomInfo.key,
        active: true,
      }));
    }

    return () => {
      manager.disconnect();
    };
  }, [excalidrawAPI]);

  // Load boards on startup
  useEffect(() => {
    const allBoards = listBoards();
    setBoards(allBoards);
    const activeId = getActiveBoardId();
    const board = loadBoard(activeId);
    if (board && (board.appState.theme === "dark" || board.appState.theme === "light")) {
      setTheme(board.appState.theme);
    }
  }, []);

  // Switch boards
  const handleSelectBoard = (id: string) => {
    const board = loadBoard(id);
    if (!board || !excalidrawAPI) return;

    setActiveBoardId(id);
    setActiveBoardIdState(id);
    setCurrentBoardName(board.name);

    excalidrawAPI.updateScene({
      elements: board.elements,
      appState: {
        ...excalidrawAPI.getAppState(),
        ...board.appState,
        theme,
      },
    });
    if (board.files && Object.keys(board.files).length > 0) {
      excalidrawAPI.addFiles(Object.values(board.files));
    }
    excalidrawAPI.history.clear();
  };

  const handleCreateBoard = () => {
    const newBoard = createBoard("Untitled Board");
    setBoards(listBoards());
    handleSelectBoard(newBoard.id);
  };

  const handleDeleteBoard = (id: string) => {
    const nextActiveId = deleteBoard(id);
    setBoards(listBoards());
    handleSelectBoard(nextActiveId);
  };

  const handleRenameBoard = (newName: string) => {
    setCurrentBoardName(newName);
    renameBoard(activeBoardIdState, newName);
    setBoards(listBoards());
  };

  // Canvas change handler: performs autosaving without forcing re-renders on every frame
  const handleChange = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles
    ) => {
      // Collab broadcast if active and not an incoming remote update
      if (
        collabSession.active &&
        !isRemoteSyncRef.current &&
        collabManagerRef.current
      ) {
        collabManagerRef.current.broadcastElements(elements);
      }

      // Debounced local persistence
      setSaveStatus("saving");
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        const activeId = activeBoardIdRef.current;
        const boardName = currentBoardNameRef.current;
        if (activeId) {
          saveBoard(activeId, boardName, elements, appState, files);
          setBoards(listBoards());
          setSaveStatus("saved");
        }
      }, 400);
    },
    [collabSession.active]
  );

  // Pointer movement tracking for peer cursors
  const handlePointerUpdate = (payload: {
    pointer: { x: number; y: number; tool: "pointer" | "laser" };
    button: "down" | "up";
  }) => {
    if (collabSession.active && collabManagerRef.current) {
      collabManagerRef.current.broadcastCursor(payload.pointer.x, payload.pointer.y);
    }
  };

  // Start collaboration session
  const handleStartCollab = async (username: string) => {
    if (!collabManagerRef.current) return;
    const roomId = "room_" + Math.random().toString(36).substring(2, 10);
    const secretKey = await generateSecretKey();

    collabManagerRef.current.setUsername(username);
    collabManagerRef.current.connect(roomId, secretKey);

    createRoomUrl(roomId, secretKey);
    setCollabSession((prev) => ({
      ...prev,
      roomId,
      encryptionKey: secretKey,
      username,
      active: true,
    }));

    // Initial broadcast of elements
    if (excalidrawAPI) {
      collabManagerRef.current.broadcastElements(excalidrawAPI.getSceneElements());
    }
  };

  const handleStopCollab = () => {
    if (collabManagerRef.current) {
      collabManagerRef.current.disconnect();
    }
    clearRoomUrl();
    setCollabSession((prev) => ({
      ...prev,
      active: false,
      roomId: null,
      encryptionKey: null,
      peers: [],
      status: "disconnected",
    }));
  };

  // Toggle Theme
  const handleToggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({
        appState: {
          ...excalidrawAPI.getAppState(),
          theme: next,
        },
      });
    }
  };

  // Open Export Modal
  const handleOpenExport = () => {
    if (excalidrawAPI) {
      setExportData({
        elements: excalidrawAPI.getSceneElements(),
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
      });
    }
    setIsExportModalOpen(true);
  };

  return (
    <div className={`excalidraw-app-container ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
      <TopBar
        currentBoardName={currentBoardName}
        onRenameBoard={handleRenameBoard}
        boards={boards}
        activeBoardId={activeBoardIdState}
        onSelectBoard={handleSelectBoard}
        onCreateBoard={handleCreateBoard}
        onDeleteBoard={handleDeleteBoard}
        saveStatus={saveStatus}
        collabSession={collabSession}
        onOpenCollab={() => setIsCollabModalOpen(true)}
        onOpenExport={handleOpenExport}
        onOpenMermaid={() => setIsMermaidModalOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <div className="excalidraw-canvas-wrapper">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={initialData}
          onChange={handleChange}
          onPointerUpdate={handlePointerUpdate}
          isCollaborating={collabSession.active}
          theme={theme}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: true,
              loadScene: true,
              saveToActiveFile: true,
              toggleTheme: true,
              export: {
                saveFileToDisk: true,
              },
            },
          }}
        >
          <MainMenu>
            <MainMenu.DefaultItems.LoadScene />
            <MainMenu.DefaultItems.SaveToActiveFile />
            <MainMenu.DefaultItems.Export />
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.CommandPalette />
            <MainMenu.DefaultItems.Help />
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.Separator />
            <MainMenu.Item
              onSelect={() => setIsMermaidModalOpen(true)}
            >
              Insert Mermaid / SVG
            </MainMenu.Item>
            <MainMenu.Item
              onSelect={() => setIsCollabModalOpen(true)}
            >
              Live collaboration
            </MainMenu.Item>
            <MainMenu.Item
              onSelect={handleOpenExport}
            >
              Export image & JSON
            </MainMenu.Item>
            <MainMenu.DefaultItems.ChangeCanvasBackground />
          </MainMenu>
          <WelcomeScreen />
        </Excalidraw>
      </div>

      {/* Collaboration Dialog */}
      <CollabModal
        isOpen={isCollabModalOpen}
        onClose={() => setIsCollabModalOpen(false)}
        collabSession={collabSession}
        onStartCollab={handleStartCollab}
        onStopCollab={handleStopCollab}
      />

      {/* Export Dialog */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        elements={exportData.elements}
        appState={exportData.appState}
        files={exportData.files}
        currentBoardName={currentBoardName}
      />

      {/* Mermaid / SVG Import Dialog */}
      <MermaidModal
        isOpen={isMermaidModalOpen}
        onClose={() => setIsMermaidModalOpen(false)}
        excalidrawAPI={excalidrawAPI}
      />
    </div>
  );
};
