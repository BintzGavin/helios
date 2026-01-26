import React from 'react';
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
    deleteRender
  } = useStudio();

  const handleTestRender = () => {
    if (activeComposition) {
      startRender(activeComposition.id, { inPoint, outPoint });
    }
  };

  return (
    <div className="renders-panel">
      <RenderConfig config={renderConfig} onChange={setRenderConfig} />
      <button className="start-render-btn" onClick={handleTestRender} disabled={!activeComposition}>
        Start Test Render
      </button>

      <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textAlign: 'center' }}>
        Range: {inPoint} - {outPoint}
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
             <div style={{ fontSize: '10px', color: '#f44336' }}>Failed</div>
          )}
        </div>
      ))}
    </div>
  );
};
