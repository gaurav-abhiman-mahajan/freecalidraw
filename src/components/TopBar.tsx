import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  FolderOpen,
  Download,
  Plus,
  Check,
  Edit2,
  Trash2,
  Moon,
  Sun,
  ShieldCheck,
  FileCode,
  X,
  Layers,
  ChevronDown,
} from "lucide-react";
import { BoardMetadata, CollabSession } from "../types";

interface TopBarProps {
  currentBoardName: string;
  onRenameBoard: (newName: string) => void;
  boards: BoardMetadata[];
  activeBoardId: string;
  onSelectBoard: (id: string) => void;
  onCreateBoard: (name?: string) => void;
  onDeleteBoard: (id: string) => void;
  saveStatus: "saved" | "saving";
  collabSession: CollabSession;
  onOpenCollab: () => void;
  onOpenExport: () => void;
  onOpenMermaid: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentBoardName,
  onRenameBoard,
  boards,
  activeBoardId,
  onSelectBoard,
  onCreateBoard,
  onDeleteBoard,
  saveStatus,
  collabSession,
  onOpenCollab,
  onOpenExport,
  onOpenMermaid,
  theme,
  onToggleTheme,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(currentBoardName);
  const [showBoardsDropdown, setShowBoardsDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Synchronize editedName whenever currentBoardName changes from outside
  useEffect(() => {
    setEditedName(currentBoardName);
  }, [currentBoardName]);

  // Focus and select input on editing mode
  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowBoardsDropdown(false);
      }
    };
    if (showBoardsDropdown) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showBoardsDropdown]);

  const handleNameSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = editedName.trim();
    if (trimmed && trimmed !== currentBoardName) {
      onRenameBoard(trimmed);
    } else {
      setEditedName(currentBoardName);
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSubmit();
    } else if (e.key === "Escape") {
      setEditedName(currentBoardName);
      setIsEditingName(false);
    }
  };

  return (
    <header className="excalidraw-top-bar">
      <div className="top-bar-left">
        {/* Freecalidraw Brand / Logo */}
        <div className="brand-logo" title="Freecalidraw - Open Source Whiteboard">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
          <div className="brand-info">
            <span className="brand-text">Freecalidraw</span>
            <span className="brand-tag">v1.0 • Open Source</span>
          </div>
        </div>

        {/* Board Switcher Dropdown & Quick Actions */}
        <div className="board-selector-wrapper" ref={dropdownRef}>
          {/* Main Board Display & Click-to-Rename */}
          <div className="board-pill-group">
            <button
              className="board-dropdown-btn"
              onClick={() => setShowBoardsDropdown(!showBoardsDropdown)}
              title="View all saved boards"
            >
              <FolderOpen size={15} />
              <span className="current-board-name">{currentBoardName}</span>
              <ChevronDown size={13} className={`chevron-icon ${showBoardsDropdown ? "open" : ""}`} />
            </button>

            {isEditingName ? (
              <form onSubmit={handleNameSubmit} className="rename-form">
                <input
                  ref={inputRef}
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => handleNameSubmit()}
                  className="rename-input"
                  placeholder="Board name..."
                />
                <button
                  type="submit"
                  className="btn-confirm-rename"
                  title="Save name (Enter)"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  className="btn-cancel-rename"
                  title="Cancel (Esc)"
                  onClick={() => {
                    setEditedName(currentBoardName);
                    setIsEditingName(false);
                  }}
                >
                  <X size={13} />
                </button>
              </form>
            ) : (
              <button
                className="btn-edit-title"
                onClick={() => {
                  setEditedName(currentBoardName);
                  setIsEditingName(true);
                }}
                title="Click to rename current board"
              >
                <Edit2 size={13} />
              </button>
            )}

            {/* Direct "+ New Board" Button on TopBar */}
            <button
              className="btn-new-board-topbar"
              onClick={() => onCreateBoard()}
              title="Create a brand new whiteboard"
            >
              <Plus size={14} />
              <span>New Board</span>
            </button>
          </div>

          {/* Boards Dropdown List */}
          {showBoardsDropdown && (
            <div className="boards-dropdown-menu">
              <div className="boards-dropdown-header">
                <div className="dropdown-title-row">
                  <Layers size={14} />
                  <span>My Whiteboards ({boards.length})</span>
                </div>
                <button
                  className="btn-new-board-mini"
                  onClick={() => {
                    onCreateBoard();
                    setShowBoardsDropdown(false);
                  }}
                  title="Create new whiteboard"
                >
                  <Plus size={13} /> Add Board
                </button>
              </div>

              <div className="boards-dropdown-list">
                {boards.map((b) => (
                  <div
                    key={b.id}
                    className={`board-dropdown-item ${b.id === activeBoardId ? "active" : ""}`}
                  >
                    <button
                      className="board-item-btn"
                      onClick={() => {
                        onSelectBoard(b.id);
                        setShowBoardsDropdown(false);
                      }}
                    >
                      <div className="board-item-info">
                        <span className="board-item-name">{b.name}</span>
                        <span className="board-item-elements">{b.elementCount} shapes</span>
                      </div>
                      {b.id === activeBoardId && (
                        <span className="active-board-badge">Active</span>
                      )}
                    </button>

                    {boards.length > 1 && (
                      <button
                        className="board-item-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete board "${b.name}"? This cannot be undone.`)) {
                            onDeleteBoard(b.id);
                          }
                        }}
                        title="Delete board"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Real-time Save Status */}
        <div className="save-status">
          {saveStatus === "saving" ? (
            <>
              <span className="spinner-dots"></span>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Check size={14} className="text-success" />
              <span>Saved locally</span>
            </>
          )}
        </div>
      </div>

      {/* Top Bar Right: Collab, Mermaid/SVG, Export, Theme */}
      <div className="top-bar-right">
        {/* Import SVG / Mermaid */}
        <button
          className="topbar-action-btn"
          onClick={onOpenMermaid}
          title="Import architecture diagrams, Mermaid code, or SVG vector graphics"
        >
          <FileCode size={15} />
          <span>Import SVG / Mermaid</span>
        </button>

        {/* Live Collaboration Button */}
        <button
          className={`collab-btn ${collabSession.active ? "collab-btn-active" : ""}`}
          onClick={onOpenCollab}
          title={
            collabSession.active
              ? `Collaborating (${collabSession.peers.length + 1} users connected)`
              : "Start end-to-end encrypted collaboration"
          }
        >
          {collabSession.active ? (
            <>
              <span className="live-pulse"></span>
              <Users size={15} />
              <span>Live ({collabSession.peers.length + 1})</span>
              <ShieldCheck size={13} className="e2e-badge" />
            </>
          ) : (
            <>
              <Users size={15} />
              <span>Collaborate</span>
            </>
          )}
        </button>

        {/* Export Modal Button */}
        <button
          className="topbar-action-btn"
          onClick={onOpenExport}
          title="Export diagram as PNG, SVG, or JSON"
        >
          <Download size={15} />
          <span>Export</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          className="topbar-icon-btn"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
};
