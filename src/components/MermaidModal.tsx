import React, { useState, useRef, useEffect } from "react";
import {
  X,
  FileCode,
  Image,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  HelpCircle,
  Network,
  Info,
} from "lucide-react";
import {
  inspectMermaidSvg,
  insertSvgAsImage,
  insertSvgAsConnectedDiagram,
  insertMermaidTextAsElements,
  isMermaidSyntax,
  SvgInspectionResult,
} from "../services/mermaidSvg";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

interface MermaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  initialContent?: string;
}

const SAMPLE_ARCHITECTURE_MERMAID = `flowchart TD
    Client["Web Browser / Client"]
    LB["Load Balancer (Nginx)"]
    API1["API Service A"]
    API2["API Service B"]
    Queue[("Message Queue (RabbitMQ)")]
    DB[("Primary Database (PostgreSQL)")]
    Cache[("Redis Cache")]

    Client -->|HTTPS| LB
    LB --> API1
    LB --> API2
    API1 --> Cache
    API2 --> DB
    API1 -->|Async Events| Queue
    Queue --> API2`;

export const MermaidModal: React.FC<MermaidModalProps> = ({
  isOpen,
  onClose,
  excalidrawAPI,
  initialContent,
}) => {
  const [activeTab, setActiveTab] = useState<"svg" | "syntax">("svg");
  const [inputContent, setInputContent] = useState<string>("");
  const [inspection, setInspection] = useState<SvgInspectionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialContent) {
        setInputContent(initialContent);
        if (initialContent.includes("<svg")) {
          setActiveTab("svg");
          setInspection(inspectMermaidSvg(initialContent));
        } else if (isMermaidSyntax(initialContent)) {
          setActiveTab("syntax");
          setInspection(null);
        }
      } else {
        if (!inputContent) {
          setInspection(null);
        }
      }
      setErrorMsg(null);
    }
  }, [isOpen, initialContent]);

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setInputContent(text);
    setErrorMsg(null);
    if (text.trim().startsWith("<svg") || text.includes("<svg")) {
      const result = inspectMermaidSvg(text);
      setInspection(result);
    } else {
      setInspection(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleTextChange(content);
        setActiveTab("svg");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          handleTextChange(content);
          setActiveTab("svg");
        }
      };
      reader.readAsText(file);
    }
  };

  // Action 1: Insert as Image (always available for SVG)
  const handleInsertAsImage = async () => {
    if (!excalidrawAPI || !inputContent.trim()) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await insertSvgAsImage(inputContent, excalidrawAPI);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to insert SVG image.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Action 2: Convert to Connected Diagram Elements (1:1 replica with boxes, arrows, labels)
  const handleInsertAsDiagram = async () => {
    if (!excalidrawAPI || !inputContent.trim()) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      if (activeTab === "syntax" || isMermaidSyntax(inputContent.trim())) {
        await insertMermaidTextAsElements(inputContent.trim(), excalidrawAPI);
      } else {
        await insertSvgAsConnectedDiagram(inputContent, excalidrawAPI);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to convert diagram into connected elements.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isInputSvg = inputContent.trim().includes("<svg");
  const isInputMermaid = isMermaidSyntax(inputContent.trim());
  const canConvertDiagram =
    isInputMermaid || (inspection && inspection.isBreakable);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content mermaid-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <Network size={20} className="modal-title-icon" />
            <h2>Import SVG & Architecture Diagrams</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Tab Selector */}
          <div className="mermaid-tabs">
            <button
              className={`mermaid-tab-btn ${activeTab === "svg" ? "active" : ""}`}
              onClick={() => setActiveTab("svg")}
            >
              <Image size={15} />
              <span>Import SVG File / XML</span>
            </button>
            <button
              className={`mermaid-tab-btn ${activeTab === "syntax" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("syntax");
                if (!inputContent || inputContent.includes("<svg")) {
                  setInputContent(SAMPLE_ARCHITECTURE_MERMAID);
                  setInspection(null);
                }
              }}
            >
              <FileCode size={15} />
              <span>Mermaid Code Syntax</span>
            </button>
          </div>

          {activeTab === "svg" && (
            <div
              className="svg-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={28} className="dropzone-icon" />
              <p>Drag and drop any <strong>.svg</strong> file here, or click to browse</p>
              <span className="dropzone-sub">
                Supports Mermaid SVGs, architecture diagrams, draw.io, Visio, and standard vector SVGs
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,image/svg+xml"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* Text Area */}
          <div className="form-group">
            <label>
              {activeTab === "svg"
                ? "Or paste raw SVG markup directly:"
                : "Paste Mermaid diagram code (flowchart, architecture, sequence):"}
            </label>
            <textarea
              className="mermaid-textarea"
              rows={activeTab === "svg" && inspection ? 5 : 7}
              placeholder={
                activeTab === "svg"
                  ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">...</svg>'
                  : "flowchart TD\n  Client --> Gateway\n  Gateway --> ServiceA"
              }
              value={inputContent}
              onChange={(e) => handleTextChange(e.target.value)}
            />
          </div>

          {/* SVG Diagram Analysis & Breakability Card */}
          {inspection && (
            <div className="inspection-card">
              <div className="inspection-header-row">
                <h4>Diagram Compatibility & Breakability Check</h4>
                {inspection.isBreakable ? (
                  <span className="badge badge-success">
                    <CheckCircle2 size={13} />
                    Breakable to Diagram Elements
                  </span>
                ) : (
                  <span className="badge badge-warning">
                    <Info size={13} />
                    Image Import Only
                  </span>
                )}
              </div>

              <div className="breakdown-grid">
                <div className="breakdown-chip">
                  <span className="chip-label">Dimensions</span>
                  <span className="chip-val">
                    {Math.round(inspection.width)} × {Math.round(inspection.height)} px
                  </span>
                </div>
                <div className="breakdown-chip">
                  <span className="chip-label">Boxes & Nodes</span>
                  <span className="chip-val">{inspection.breakdown.boxCount}</span>
                </div>
                <div className="breakdown-chip">
                  <span className="chip-label">Connectors / Arrows</span>
                  <span className="chip-val">{inspection.breakdown.connectorCount}</span>
                </div>
                <div className="breakdown-chip">
                  <span className="chip-label">Labels</span>
                  <span className="chip-val">{inspection.breakdown.labelCount}</span>
                </div>
              </div>

              <div className="inspection-status-line">
                {inspection.isBreakable ? (
                  <div className="status-success-message">
                    <Sparkles size={14} className="text-primary" />
                    <span>
                      {inspection.hasMermaidSource
                        ? "Embedded Mermaid source detected. Ready for 1:1 conversion into editable shapes with active connections."
                        : `Ready for conversion: ${inspection.breakdown.boxCount} boxes, ${inspection.breakdown.connectorCount} connectors, and ${inspection.breakdown.labelCount} labels.`}
                    </span>
                  </div>
                ) : (
                  <div className="status-info-message">
                    <HelpCircle size={14} className="text-muted" />
                    <span>
                      {inspection.breakdown.reason} You can still insert it as an exact vector SVG image.
                    </span>
                  </div>
                )}
              </div>

              {inspection.warnings.length > 0 && (
                <div className="inspection-warnings">
                  {inspection.warnings.map((w, idx) => (
                    <div key={idx} className="warning-line">
                      <AlertTriangle size={13} className="text-warning" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="error-banner">
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="modal-actions-between">
            <button className="btn-secondary" onClick={onClose} disabled={isProcessing}>
              Cancel
            </button>

            <div className="modal-actions-right">
              {/* Option A: Convert to 1:1 Connected Diagram Elements (Optional, enabled when breakable) */}
              <button
                className="btn-primary"
                onClick={handleInsertAsDiagram}
                disabled={isProcessing || !canConvertDiagram}
                title={
                  !canConvertDiagram
                    ? "Cannot convert: No diagram shapes or connectors detected"
                    : "Converts the SVG into native connected boxes, arrows, and labels on canvas"
                }
              >
                <Sparkles size={16} />
                <span>
                  {activeTab === "syntax"
                    ? "Generate Diagram"
                    : "Convert to Connected Diagram"}
                </span>
              </button>

              {/* Option B: Insert as Vector SVG Image */}
              {isInputSvg && (
                <button
                  className="btn-secondary"
                  onClick={handleInsertAsImage}
                  disabled={isProcessing}
                  title="Inserts the SVG directly onto the canvas as a vector image element"
                >
                  <Image size={16} />
                  <span>Insert as SVG Image</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
