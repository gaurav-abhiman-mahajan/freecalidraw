import { BoardData, BoardMetadata } from "../types";
import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

const STORAGE_KEY_PREFIX = "freecalidraw_board_";
const BOARDS_INDEX_KEY = "freecalidraw_boards_index";
const ACTIVE_BOARD_KEY = "freecalidraw_active_board";

// Legacy keys for backward compatibility migration
const LEGACY_STORAGE_KEY_PREFIX = "excalidraw_clone_board_";
const LEGACY_BOARDS_INDEX_KEY = "excalidraw_clone_boards_index";
const LEGACY_ACTIVE_BOARD_KEY = "excalidraw_clone_active_board";

const DEFAULT_STARTER_ELEMENTS: readonly ExcalidrawElement[] = [];

// Automatic migration from legacy clone keys to freecalidraw
function migrateLegacyStorage(): void {
  try {
    const legacyIndexRaw = localStorage.getItem(LEGACY_BOARDS_INDEX_KEY);
    const modernIndexRaw = localStorage.getItem(BOARDS_INDEX_KEY);

    if (legacyIndexRaw && !modernIndexRaw) {
      localStorage.setItem(BOARDS_INDEX_KEY, legacyIndexRaw);
      const legacyActiveId = localStorage.getItem(LEGACY_ACTIVE_BOARD_KEY);
      if (legacyActiveId) {
        localStorage.setItem(ACTIVE_BOARD_KEY, legacyActiveId);
      }

      const list: BoardMetadata[] = JSON.parse(legacyIndexRaw);
      for (const item of list) {
        const boardDataRaw = localStorage.getItem(`${LEGACY_STORAGE_KEY_PREFIX}${item.id}`);
        if (boardDataRaw) {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}${item.id}`, boardDataRaw);
        }
      }
    }
  } catch (err) {
    console.warn("Storage migration error:", err);
  }
}

// Run migration once on module load
migrateLegacyStorage();

export function getActiveBoardId(): string {
  const activeId = localStorage.getItem(ACTIVE_BOARD_KEY);
  if (activeId) return activeId;

  const boards = listBoards();
  if (boards.length > 0) {
    localStorage.setItem(ACTIVE_BOARD_KEY, boards[0].id);
    return boards[0].id;
  }

  // Create initial default board
  const newBoard = createBoard("Main Whiteboard");
  return newBoard.id;
}

export function setActiveBoardId(id: string): void {
  localStorage.setItem(ACTIVE_BOARD_KEY, id);
}

export function listBoards(): BoardMetadata[] {
  try {
    const raw = localStorage.getItem(BOARDS_INDEX_KEY);
    if (!raw) return [];
    const list: BoardMetadata[] = JSON.parse(raw);
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function loadBoard(id: string): BoardData | null {
  try {
    let raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
    if (!raw) {
      // Check legacy fallback
      raw = localStorage.getItem(`${LEGACY_STORAGE_KEY_PREFIX}${id}`);
    }
    if (!raw) return null;
    const board: BoardData = JSON.parse(raw);
    return board;
  } catch {
    return null;
  }
}

export function saveBoard(
  id: string,
  name: string,
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles = {}
): BoardData {
  const now = Date.now();
  const cleanAppState: Partial<AppState> = {
    viewBackgroundColor: appState.viewBackgroundColor || "#ffffff",
    currentItemStrokeColor: appState.currentItemStrokeColor,
    currentItemBackgroundColor: appState.currentItemBackgroundColor,
    currentItemFillStyle: appState.currentItemFillStyle,
    currentItemStrokeWidth: appState.currentItemStrokeWidth,
    currentItemStrokeStyle: appState.currentItemStrokeStyle,
    currentItemRoughness: appState.currentItemRoughness,
    currentItemOpacity: appState.currentItemOpacity,
    currentItemFontFamily: appState.currentItemFontFamily,
    currentItemFontSize: appState.currentItemFontSize,
    currentItemTextAlign: appState.currentItemTextAlign,
    theme: appState.theme || "light",
    gridSize: appState.gridSize || null,
  };

  const boardData: BoardData = {
    id,
    name: name.trim() || "Untitled Whiteboard",
    elements: elements.filter((el) => !el.isDeleted),
    appState: cleanAppState,
    files,
    updatedAt: now,
    createdAt: now,
  };

  // If existing board, preserve createdAt
  const existing = loadBoard(id);
  if (existing) {
    boardData.createdAt = existing.createdAt;
  }

  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, JSON.stringify(boardData));

    // Update index
    const index = listBoards();
    const existingIdx = index.findIndex((b) => b.id === id);
    const meta: BoardMetadata = {
      id,
      name: boardData.name,
      updatedAt: now,
      createdAt: boardData.createdAt,
      elementCount: boardData.elements.length,
    };

    if (existingIdx >= 0) {
      index[existingIdx] = meta;
    } else {
      index.unshift(meta);
    }

    localStorage.setItem(BOARDS_INDEX_KEY, JSON.stringify(index));
  } catch (err) {
    console.warn("Local storage write error:", err);
  }

  return boardData;
}

export function createBoard(name?: string): BoardData {
  const existingBoards = listBoards();
  const nextNum = existingBoards.length + 1;
  const boardName = name && name.trim() ? name.trim() : `Board ${nextNum}`;
  const id = "board_" + Math.random().toString(36).substring(2, 10);
  const now = Date.now();
  const board: BoardData = {
    id,
    name: boardName,
    elements: DEFAULT_STARTER_ELEMENTS,
    appState: {
      viewBackgroundColor: "#ffffff",
      theme: "light",
    },
    files: {},
    createdAt: now,
    updatedAt: now,
  };

  saveBoard(board.id, board.name, board.elements, board.appState, board.files);
  setActiveBoardId(board.id);
  return board;
}

export function renameBoard(id: string, newName: string): BoardData | null {
  const board = loadBoard(id);
  if (!board) return null;
  const cleanName = newName.trim() || "Untitled Whiteboard";
  board.name = cleanName;
  board.updatedAt = Date.now();
  return saveBoard(board.id, cleanName, board.elements, board.appState, board.files);
}

export function duplicateBoard(id: string): BoardData | null {
  const source = loadBoard(id);
  if (!source) return null;

  const newId = "board_" + Math.random().toString(36).substring(2, 10);
  const newName = `${source.name} (Copy)`;
  const now = Date.now();

  const clonedBoard: BoardData = {
    id: newId,
    name: newName,
    elements: source.elements,
    appState: { ...source.appState },
    files: { ...source.files },
    createdAt: now,
    updatedAt: now,
  };

  saveBoard(clonedBoard.id, clonedBoard.name, clonedBoard.elements, clonedBoard.appState, clonedBoard.files);
  setActiveBoardId(clonedBoard.id);
  return clonedBoard;
}

export function deleteBoard(id: string): string {
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`);
  localStorage.removeItem(`${LEGACY_STORAGE_KEY_PREFIX}${id}`);

  const index = listBoards().filter((b) => b.id !== id);
  localStorage.setItem(BOARDS_INDEX_KEY, JSON.stringify(index));

  if (getActiveBoardId() === id) {
    if (index.length > 0) {
      setActiveBoardId(index[0].id);
      return index[0].id;
    } else {
      const fallback = createBoard("Main Whiteboard");
      return fallback.id;
    }
  }

  return getActiveBoardId();
}
