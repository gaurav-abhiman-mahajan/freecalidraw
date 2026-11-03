import React, { useState } from "react";
import { X, Copy, Check, ShieldCheck, Users, Power, Link2, Sparkles } from "lucide-react";
import { CollabSession } from "../types";

interface CollabModalProps {
  isOpen: boolean;
  onClose: () => void;
  collabSession: CollabSession;
  onStartCollab: (username: string) => void;
  onStopCollab: () => void;
}

export const CollabModal: React.FC<CollabModalProps> = ({
  isOpen,
  onClose,
  collabSession,
  onStartCollab,
  onStopCollab,
}) => {
  const [copied, setCopied] = useState(false);
  const [customName, setCustomName] = useState(collabSession.username);

  if (!isOpen) return null;

  const currentUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <Users size={20} className="modal-title-icon" />
            <h2>Live Collaboration</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {collabSession.active ? (
            <div className="collab-active-view">
              <div className="collab-security-banner">
                <ShieldCheck size={20} className="text-security" />
                <div>
                  <strong>End-to-End Encrypted</strong>
                  <p>
                    All drawing data is encrypted in your browser using AES-GCM. The relay server only routes
                    encrypted binary blobs and cannot inspect your canvas.
                  </p>
                </div>
              </div>

              <div className="collab-link-section">
                <label>Shareable Room Link:</label>
                <div className="copy-input-row">
                  <input type="text" readOnly value={currentUrl} className="share-url-input" />
                  <button className="btn-copy-link" onClick={handleCopyLink}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <small className="share-hint">
                  Open this link in another tab or send it to anyone on your network to co-draw in real time.
                </small>
              </div>

              <div className="collab-peers-section">
                <h3>Connected Participants ({collabSession.peers.length + 1})</h3>
                <div className="peers-list">
                  <div className="peer-chip you">
                    <span
                      className="peer-avatar"
                      style={{ backgroundColor: collabSession.userColor }}
                    />
                    <span className="peer-name">{collabSession.username} (You)</span>
                  </div>
                  {collabSession.peers.map((peer) => (
                    <div key={peer.userId} className="peer-chip">
                      <span
                        className="peer-avatar"
                        style={{ backgroundColor: peer.color }}
                      />
                      <span className="peer-name">{peer.username}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="collab-modal-actions">
                <button
                  className="btn-danger-outline"
                  onClick={() => {
                    onStopCollab();
                    onClose();
                  }}
                >
                  <Power size={16} />
                  <span>Stop Session</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="collab-start-view">
              <p className="collab-intro-text">
                Start a live collaborative session to sketch together in real time. Your drawings and cursor movements are synchronized instantly.
              </p>

              <div className="form-group">
                <label htmlFor="username-input">Your Display Name:</label>
                <input
                  id="username-input"
                  type="text"
                  className="text-input"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Alice"
                />
              </div>

              <div className="feature-bullets">
                <div className="feature-bullet-item">
                  <ShieldCheck size={16} />
                  <span>Client-side 256-bit AES-GCM encryption</span>
                </div>
                <div className="feature-bullet-item">
                  <Sparkles size={16} />
                  <span>Real-time multi-cursor awareness & element sync</span>
                </div>
                <div className="feature-bullet-item">
                  <Link2 size={16} />
                  <span>Zero-login instant room links</span>
                </div>
              </div>

              <div className="modal-actions-right">
                <button className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    onStartCollab(customName);
                  }}
                >
                  <Users size={16} />
                  <span>Start Live Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
