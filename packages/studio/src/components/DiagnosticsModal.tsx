import React, { useEffect, useState } from 'react';
import { Helios, DiagnosticReport } from '@helios-project/core';
import { useStudio } from '../context/StudioContext';
import './DiagnosticsModal.css';

interface DiagnosticItemProps {
  label: string;
  value: boolean;
}

const DiagnosticItem: React.FC<DiagnosticItemProps> = ({ label, value }) => (
  <div className="diagnostics-item">
    <span className="diagnostics-label">{label}</span>
    <span className="diagnostics-value">
      {value ? (
        <span className="status-icon status-check">✓</span>
      ) : (
        <span className="status-icon status-cross">✗</span>
      )}
    </span>
  </div>
);

export const DiagnosticsModal: React.FC = () => {
  const { isDiagnosticsOpen, setDiagnosticsOpen } = useStudio();
  const [clientReport, setClientReport] = useState<DiagnosticReport | null>(null);
  const [serverReport, setServerReport] = useState<DiagnosticReport | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isDiagnosticsOpen) {
      // Client Diagnostics
      Helios.diagnose().then(setClientReport);

      // Server Diagnostics
      setServerReport(null);
      setServerError(null);
      fetch('/api/diagnose')
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to fetch server diagnostics');
          }
          return res.json();
        })
        .then(setServerReport)
        .catch((err) => setServerError(err.message));
    }
  }, [isDiagnosticsOpen]);

  if (!isDiagnosticsOpen) return null;

  return (
    <div className="diagnostics-modal-overlay" onClick={() => setDiagnosticsOpen(false)}>
      <div className="diagnostics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="diagnostics-header">
          <h2>System Diagnostics</h2>
          <button className="diagnostics-close-button" onClick={() => setDiagnosticsOpen(false)}>
            ×
          </button>
        </div>

        <div className="diagnostics-content">
          {/* Client Column */}
          <div className="diagnostics-column">
            <div className="diagnostics-column-header">
              <span>🖥️</span> Studio Preview (Client)
            </div>
            {clientReport ? (
              <>
                <DiagnosticItem label="WebCodecs" value={clientReport.webCodecs} />
                <DiagnosticItem label="WAAPI (Web Animations)" value={clientReport.waapi} />
                <DiagnosticItem label="OffscreenCanvas" value={clientReport.offscreenCanvas} />
                <div className="diagnostics-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span className="diagnostics-label">User Agent</span>
                  <div className="user-agent">{clientReport.userAgent}</div>
                </div>
              </>
            ) : (
              <div className="loading-spinner">Loading client diagnostics...</div>
            )}
          </div>

          {/* Server Column */}
          <div className="diagnostics-column">
            <div className="diagnostics-column-header">
              <span>🎬</span> Production Renderer (Server)
            </div>
            {serverError ? (
              <div className="error-message">
                <strong>Error:</strong> {serverError}
                <br />
                <br />
                Ensure you have installed browser binaries via `npx playwright install chromium`.
              </div>
            ) : serverReport ? (
              <>
                <DiagnosticItem label="WebCodecs" value={serverReport.webCodecs} />
                <DiagnosticItem label="WAAPI (Web Animations)" value={serverReport.waapi} />
                <DiagnosticItem label="OffscreenCanvas" value={serverReport.offscreenCanvas} />
                <div className="diagnostics-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span className="diagnostics-label">User Agent</span>
                  <div className="user-agent">{serverReport.userAgent}</div>
                </div>
              </>
            ) : (
              <div className="loading-spinner">Loading server diagnostics... (This launches a headless browser)</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
