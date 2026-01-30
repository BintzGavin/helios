import React, { useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { RenderConfig } from './RenderConfig';
import './RendersPanel.css';

export const RendersPanel: React.FC = () => {
  const {
    renderJobs,
    startRender,
    activeComposition,
    inPoint,
    outPoint,
    renderConfig,
    setRenderConfig,
    cancelRender,
    deleteRender,
    isExporting,
    exportProgress,
    exportVideo,
    cancelExport
  } = useStudio();

  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('mp4');

  const handleTestRender = () => {
    if (activeComposition) {
      startRender(activeComposition.id, { inPoint, outPoint });
    }
  };

  return (
    <div className="renders-panel">
      {/* Client-Side Export Section */}
      <div className="client-export-section" style={{ padding: '10px', borderBottom: '1px solid #333', marginBottom: '10px', background: '#1e1e1e', borderRadius: '4px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#ccc', fontWeight: 'bold' }}>Client-Side Export</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'mp4' | 'webm')}
                  disabled={isExporting}
                  style={{ flex: 1, background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px', padding: '4px' }}
              >
                  <option value="mp4">MP4 (H.264)</option>
                  <option value="webm">WebM (VP9)</option>
              </select>
              {isExporting ? (
                  <button
                      onClick={cancelExport}
                      style={{ background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer' }}
                  >
                      Cancel
                  </button>
              ) : (
                  <button
                      onClick={() => exportVideo(exportFormat)}
                      disabled={!activeComposition}
                      style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer', opacity: !activeComposition ? 0.5 : 1 }}
                  >
                      Export
                  </button>
              )}
          </div>
          {isExporting && (
             <div className="render-progress-bar">
               <div
                 className="render-progress-fill"
                 style={{ width: `${exportProgress * 100}%` }}
               />
             </div>
          )}
      </div>

      <div style={{ borderTop: '1px solid #333', paddingTop: '10px', marginTop: '10px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#ccc', fontWeight: 'bold' }}>Server-Side Render</h3>
          <RenderConfig config={renderConfig} onChange={setRenderConfig} />
          <button className="start-render-btn" onClick={handleTestRender} disabled={!activeComposition}>
            Start Render Job
          </button>

          <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textAlign: 'center' }}>
            Range: {inPoint} - {outPoint}
          </div>
      </div>

      {renderJobs.length === 0 && (
        <div style={{ color: '#666', fontSize: '0.9em', textAlign: 'center', marginTop: '16px' }}>
          No render jobs.
        </div>
      )}

      {renderJobs.map((job) => (
        <div key={job.id} className="render-job">
          <div className="render-job-header">
            <span>{job.compositionId}</span>
            <span className={`render-job-status status-${job.status}`}>
              {job.status}
            </span>
          </div>
          <div style={{ fontSize: '10px', color: '#888' }}>
            ID: {job.id.slice(-6)} {job.inPoint !== undefined && `(${job.inPoint}-${job.outPoint})`}
          </div>

          <div className="render-job-actions" style={{ marginTop: '4px', marginBottom: '4px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
             {(job.status === 'queued' || job.status === 'rendering') && (
                <button
                    onClick={() => cancelRender(job.id)}
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      background: '#d32f2f',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                >
                    Cancel
                </button>
             )}
             {(job.status !== 'queued' && job.status !== 'rendering') && (
                <button
                    onClick={() => deleteRender(job.id)}
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      background: 'transparent',
                      color: '#888',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    title="Delete Job"
                >
                    Delete
                </button>
             )}
          </div>

          {job.status === 'rendering' && (
            <div className="render-progress-bar">
              <div
                className="render-progress-fill"
                style={{ width: `${job.progress * 100}%` }}
              />
            </div>
          )}
          {job.status === 'completed' && (
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                <div style={{ fontSize: '10px', color: '#4caf50' }}>Done</div>
                {job.outputUrl && (
                    <a
                        href={job.outputUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            fontSize: '10px',
                            color: '#66b2ff',
                            textDecoration: 'none',
                            border: '1px solid #66b2ff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(0, 123, 255, 0.1)'
                        }}
                    >
                        Download
                    </a>
                )}
             </div>
          )}
          {job.status === 'cancelled' && (
             <div style={{ fontSize: '10px', color: '#ff9800' }}>Cancelled</div>
          )}
          {job.status === 'failed' && (
             <div className="render-job-failed">
               <div style={{ fontSize: '10px', color: '#f44336' }}>Failed</div>
               {job.error && (
                 <details className="error-details">
                   <summary>Show Error</summary>
                   <pre>{job.error}</pre>
                 </details>
               )}
             </div>
          )}
        </div>
      ))}
    </div>
  );
};
