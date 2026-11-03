import React, { useState } from "react";
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
} from "lucide-react";
import { BoardMetadata, CollabSession } from "../types";

interface TopBarProps {
  currentBoardName: string;
  onRenameBoard: (newName: string) => void;
  boards: BoardMetadata[];
  activeBoardId: string;
  onSelectBoard: (id: string) => void;
  onCreateBoard: () => void;
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

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedName.trim()) {
      onRenameBoard(editedName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <header className="excalidraw-top-bar">
      <div className="top-bar-left">
        {/* Brand / Logo */}
        <div className="brand-logo" title="Excalidraw Local">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
          <span className="brand-text">Excalidraw</span>
        </div>

        {/* Board Switcher Dropdown */}
        <div className="board-selector-wrapper">
          <button
            className="board-dropdown-btn"
            onClick={() => setShowBoardsDropdown(!showBoardsDropdown)}
            title="Switch whiteboard"
          >
            <FolderOpen size={16} />
            <span className="current-board-name">{currentBoardName}</span>
          </button>

          {showBoardsDropdown && (
            <div className="boards-dropdown-menu">
              <div className="boards-dropdown-header">
                <span>Saved Whiteboards</span>
                <button
                  className="btn-new-board-mini"
                  onClick={() => {
                    onCreateBoard();
                    setShowBoardsDropdown(false);
                  }}
                  title="Create new whiteboard"
                >
                  <Plus size={14} /> New
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
                        setEditedName(b.name);
                      }}
                    >
                      <span className="board-item-name">{b.name}</span>
                      <span className="board-item-elements">{b.elementCount} items</span>
                    </button>
                    {boards.length > 1 && (
                      <button
                        className="board-item-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete whiteboard "${b.name}"?`)) {
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

        {/* Inline Board Renamer */}
        {isEditingName ? (
          <form onSubmit={handleNameSubmit} className="rename-form">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSubmit}
              autoFocus
              className="rename-input"
            />
          </form>
        ) : (
          <button
            className="btn-edit-title"
            onClick={() => {
              setEditedName(currentBoardName);
              setIsEditingName(true);
            }}
            title="Click to rename board"
          >
            <Edit2 size={12} />
          </button>
        )}

        {/* Save Status Indicator */}
        <div className="save-status" title={saveStatus === "saved" ? "All changes saved locally" : "Saving..."}>
          {saveStatus === "saved" ? (
            <>
              <Check size={13} className="text-success" />
              <span>Saved</span>
            </>
          ) : (
            <>
              <span className="spinner-dots" />
              <span>Saving...</span>
            </>
          )}
        </div>
      </div>

      <div className="top-bar-right">
        {/* Mermaid / SVG Importer Button */}
        <button className="topbar-action-btn" onClick={onOpenMermaid} title="Import Mermaid diagram or SVG">
          <FileCode size={16} />
          <span>Mermaid / SVG</span>
        </button>

        {/* Collaboration Badge / Button */}
        <button
          className={`collab-btn ${collabSession.active ? "collab-active" : ""}`}
          onClick={onOpenCollab}
          title="Real-time Collaboration"
        >
          {collabSession.active ? (
            <>
              <span className="pulse-indicator" />
              <ShieldCheck size={16} />
              <span>Live ({collabSession.peers.length + 1})</span>
            </>
          ) : (
            <>
              <Users size={16} />
              <span>Collaborate</span>
            </>
          )}
        </button>

        {/* Export Button */}
        <button className="topbar-action-btn" onClick={onOpenExport} title="Export image / file">
          <Download size={16} />
          <span>Export</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          className="topbar-action-btn icon-only"
          onClick={onToggleTheme}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </header>
  );
};
