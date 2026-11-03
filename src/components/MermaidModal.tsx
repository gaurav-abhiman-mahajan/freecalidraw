import React, { useState, useRef } from "react";
import {
  X,
  FileCode,
  Image,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  inspectMermaidSvg,
  insertSvgAsImage,
  insertMermaidTextAsElements,
  isMermaidSyntax,
  SvgInspectionResult,
} from "../services/mermaidSvg";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

interface MermaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  excalidrawAPI: ExcalidrawImperativeAPI | null;
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
}) => {
  const [activeTab, setActiveTab] = useState<"svg" | "syntax">("svg");
  const [inputContent, setInputContent] = useState<string>("");
  const [inspection, setInspection] = useState<SvgInspectionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleInsertAsElements = async () => {
    if (!excalidrawAPI || !inputContent.trim()) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      let codeToParse = inputContent.trim();
      if (inspection && inspection.hasMermaidSource && inspection.mermaidSource) {
        codeToParse = inspection.mermaidSource;
      }

      await insertMermaidTextAsElements(codeToParse, excalidrawAPI);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to convert Mermaid definition into Excalidraw elements.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isInputSvg = inputContent.trim().includes("<svg");
  const isInputMermaid = isMermaidSyntax(inputContent.trim());
  const canConvertMermaid = isInputMermaid || (inspection && inspection.hasMermaidSource);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content mermaid-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <FileCode size={20} className="modal-title-icon" />
            <h2>Load Mermaid Architecture & SVG</h2>
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
                if (!inputContent) {
                  setInputContent(SAMPLE_ARCHITECTURE_MERMAID);
                }
              }}
            >
              <FileCode size={15} />
              <span>Mermaid Syntax (Code)</span>
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
              <p>Drag and drop a <strong>.svg</strong> file here, or click to browse</p>
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
                ? "Or paste raw SVG markup below:"
                : "Paste Mermaid diagram code (flowchart, architecture, sequence):"}
            </label>
            <textarea
              className="mermaid-textarea"
              rows={7}
              placeholder={
                activeTab === "svg"
                  ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">...</svg>'
                  : "flowchart TD\n  Client --> Gateway\n  Gateway --> ServiceA"
              }
              value={inputContent}
              onChange={(e) => handleTextChange(e.target.value)}
            />
          </div>

          {/* Compatibility Analysis Card */}
          {inspection && (
            <div className="inspection-card">
              <h4>Compatibility Check</h4>
              <div className="inspection-grid">
                <div className="inspection-item">
                  <CheckCircle2 size={15} className="text-success" />
                  <span>
                    Dimensions: <strong>{Math.round(inspection.width)} × {Math.round(inspection.height)} px</strong>
                  </span>
                </div>
                <div className="inspection-item">
                  {inspection.hasMermaidSource ? (
                    <>
                      <Sparkles size={15} className="text-primary" />
                      <span>Embedded Mermaid source detected</span>
                    </>
                  ) : (
                    <>
                      <Layers size={15} className="text-muted" />
                      <span>Standard Vector SVG</span>
                    </>
                  )}
                </div>
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
              {/* Option A: Convert to native editable Excalidraw shapes */}
              {canConvertMermaid && (
                <button
                  className="btn-primary"
                  onClick={handleInsertAsElements}
                  disabled={isProcessing}
                >
                  <Sparkles size={16} />
                  <span>Insert as Editable Elements</span>
                </button>
              )}

              {/* Option B: Insert as vector SVG image */}
              {isInputSvg && (
                <button
                  className={canConvertMermaid ? "btn-secondary" : "btn-primary"}
                  onClick={handleInsertAsImage}
                  disabled={isProcessing}
                >
                  <Image size={16} />
                  <span>Insert as SVG Image</span>
                </button>
              )}

              {/* If no SVG and not mermaid keyword, attempt parse */}
              {!isInputSvg && !canConvertMermaid && inputContent.trim() && (
                <button
                  className="btn-primary"
                  onClick={handleInsertAsElements}
                  disabled={isProcessing}
                >
                  <ArrowRight size={16} />
                  <span>Parse & Insert</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
