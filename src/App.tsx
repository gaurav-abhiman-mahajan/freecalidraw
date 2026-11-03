import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Excalidraw,
  reconcileElements,
  CaptureUpdateAction,
  MainMenu,
  WelcomeScreen,
} from "@excalidraw/excalidraw";
import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { AppState, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { TopBar } from "./components/TopBar";
import { CollabModal } from "./components/CollabModal";
import { ExportModal } from "./components/ExportModal";
import { PeerCursors } from "./components/PeerCursors";

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
  const [boards, setBoards] = useState<BoardMetadata[]>([]);
  const [activeBoardIdState, setActiveBoardIdState] = useState<string>("");
  const [currentBoardName, setCurrentBoardName] = useState<string>("Whiteboard");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Modals state
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Cached canvas state for exports
  const [currentElements, setCurrentElements] = useState<readonly ExcalidrawElement[]>([]);
  const [currentAppState, setCurrentAppState] = useState<Partial<AppState>>({});
  const [currentFiles, setCurrentFiles] = useState<BinaryFiles>({});

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
        setCurrentElements(merged);
        setTimeout(() => {
          isRemoteSyncRef.current = false;
        }, 50);
      },
      onPeersUpdated: (peers: PeerUser[]) => {
        setCollabSession((prev) => ({ ...prev, peers }));
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
    const activeId = getActiveBoardId();
    setActiveBoardIdState(activeId);
    const allBoards = listBoards();
    setBoards(allBoards);

    const board = loadBoard(activeId);
    if (board) {
      setCurrentBoardName(board.name);
      setCurrentElements(board.elements);
      setCurrentAppState(board.appState);
      setCurrentFiles(board.files);
      if (board.appState.theme === "dark" || board.appState.theme === "light") {
        setTheme(board.appState.theme);
      }
    }
  }, []);

  // Switch boards
  const handleSelectBoard = (id: string) => {
    const board = loadBoard(id);
    if (!board || !excalidrawAPI) return;

    setActiveBoardId(id);
    setActiveBoardIdState(id);
    setCurrentBoardName(board.name);
    setCurrentElements(board.elements);
    setCurrentAppState(board.appState);
    setCurrentFiles(board.files);

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

  // Canvas change handler with debounced save & collab broadcast
  const handleChange = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles
    ) => {
      setCurrentElements(elements);
      setCurrentAppState(appState);
      setCurrentFiles(files);

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
        if (activeBoardIdState) {
          saveBoard(activeBoardIdState, currentBoardName, elements, appState, files);
          setBoards(listBoards());
          setSaveStatus("saved");
        }
      }, 350);
    },
    [activeBoardIdState, currentBoardName, collabSession.active]
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

  // Prepare initial data
  const initialBoard = loadBoard(activeBoardIdState);

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
        onOpenExport={() => setIsExportModalOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <div className="excalidraw-canvas-wrapper">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={{
            elements: initialBoard ? initialBoard.elements : [],
            appState: initialBoard ? { ...initialBoard.appState, theme } : { theme },
            files: initialBoard ? initialBoard.files : {},
          }}
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
              onSelect={() => setIsCollabModalOpen(true)}
            >
              Live collaboration
            </MainMenu.Item>
            <MainMenu.Item
              onSelect={() => setIsExportModalOpen(true)}
            >
              Export image & JSON
            </MainMenu.Item>
            <MainMenu.DefaultItems.ChangeCanvasBackground />
          </MainMenu>
          <WelcomeScreen />
        </Excalidraw>

        {/* Live Peer Cursors Overlay */}
        <PeerCursors peers={collabSession.peers} appState={currentAppState} />
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
        elements={currentElements}
        appState={currentAppState}
        files={currentFiles}
        currentBoardName={currentBoardName}
      />
    </div>
  );
};
