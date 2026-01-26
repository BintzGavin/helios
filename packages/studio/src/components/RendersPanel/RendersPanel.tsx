import React from 'react';
import { useStudio } from '../../context/StudioContext';
import { RenderConfig } from './RenderConfig';
import './RendersPanel.css';

export const RendersPanel: React.FC = () => {
  const { renderJobs, startRender, activeComposition, inPoint, outPoint, renderConfig, setRenderConfig } = useStudio();

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
          {job.status === 'rendering' && (
            <div className="render-progress-bar">
              <div
                className="render-progress-fill"
                style={{ width: `${job.progress * 100}%` }}
              />
            </div>
          )}
          {job.status === 'completed' && (
             <div style={{ fontSize: '10px', color: '#4caf50' }}>Done</div>
          )}
        </div>
      ))}
    </div>
  );
};
