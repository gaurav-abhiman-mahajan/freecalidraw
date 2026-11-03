import React, { useState } from "react";
import { X, Download, Copy, Image, FileCode, FileText, Check } from "lucide-react";
import { downloadPng, copyPngToClipboard, downloadSvg, downloadJson } from "../services/export";
import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  currentBoardName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  elements,
  appState,
  files,
  currentBoardName,
}) => {
  const [format, setFormat] = useState<"png" | "svg" | "json">("png");
  const [withBackground, setWithBackground] = useState(true);
  const [withDarkMode, setWithDarkMode] = useState(appState.theme === "dark");
  const [scale, setScale] = useState<number>(2);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExportDownload = async () => {
    setIsExporting(true);
    try {
      const filename = currentBoardName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "diagram";
      if (format === "png") {
        await downloadPng(elements, appState, files, {
          filename,
          exportBackground: withBackground,
          exportWithDarkMode: withDarkMode,
          scale,
        });
      } else if (format === "svg") {
        await downloadSvg(elements, appState, files, {
          filename,
          exportBackground: withBackground,
          exportWithDarkMode: withDarkMode,
          scale,
        });
      } else {
        downloadJson(elements, appState, files, filename);
      }
      onClose();
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export diagram.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyClipboard = async () => {
    setIsExporting(true);
    try {
      if (format === "png") {
        await copyPngToClipboard(elements, appState, files, {
          exportBackground: withBackground,
          exportWithDarkMode: withDarkMode,
          scale,
        });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Copy error:", err);
      alert("Failed to copy image to clipboard.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <Download size={20} className="modal-title-icon" />
            <h2>Export Diagram</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Format selection */}
          <div className="format-selection-group">
            <label className="section-label">Select Format:</label>
            <div className="format-options">
              <button
                className={`format-card ${format === "png" ? "active" : ""}`}
                onClick={() => setFormat("png")}
              >
                <Image size={24} />
                <span className="format-name">PNG</span>
                <span className="format-desc">High-res raster image</span>
              </button>

              <button
                className={`format-card ${format === "svg" ? "active" : ""}`}
                onClick={() => setFormat("svg")}
              >
                <FileCode size={24} />
                <span className="format-name">SVG</span>
                <span className="format-desc">Scalable vector graphics</span>
              </button>

              <button
                className={`format-card ${format === "json" ? "active" : ""}`}
                onClick={() => setFormat("json")}
              >
                <FileText size={24} />
                <span className="format-name">Excalidraw</span>
                <span className="format-desc">Editable project JSON</span>
              </button>
            </div>
          </div>

          {/* Options for PNG & SVG */}
          {format !== "json" && (
            <div className="export-settings-panel">
              <label className="section-label">Export Options:</label>

              <div className="setting-checkbox-row">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={withBackground}
                    onChange={(e) => setWithBackground(e.target.checked)}
                  />
                  <span>Include canvas background</span>
                </label>
              </div>

              <div className="setting-checkbox-row">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={withDarkMode}
                    onChange={(e) => setWithDarkMode(e.target.checked)}
                  />
                  <span>Export in dark mode theme</span>
                </label>
              </div>

              {format === "png" && (
                <div className="setting-scale-row">
                  <span className="scale-label">Resolution Scale:</span>
                  <div className="scale-buttons">
                    {[1, 2, 3].map((s) => (
                      <button
                        key={s}
                        className={`scale-btn ${scale === s ? "active" : ""}`}
                        onClick={() => setScale(s)}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="modal-actions-between">
            {format === "png" ? (
              <button
                className="btn-secondary"
                onClick={handleCopyClipboard}
                disabled={isExporting}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? "Copied to Clipboard" : "Copy to Clipboard"}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="modal-actions-right">
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleExportDownload}
                disabled={isExporting}
              >
                <Download size={16} />
                <span>Download {format.toUpperCase()}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
