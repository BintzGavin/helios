import React from 'react';
import { useStudio } from '../context/StudioContext';
import './RenderPreviewModal.css';

export const RenderPreviewModal: React.FC = () => {
  const { previewUrl, setPreviewUrl } = useStudio();

  if (!previewUrl) return null;

  return (
    <div className="preview-modal-overlay" onClick={() => setPreviewUrl(null)}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <h2>Render Preview</h2>
          <button className="preview-close-button" onClick={() => setPreviewUrl(null)}>
            ×
          </button>
        </div>
        <div className="preview-content">
          <video controls autoPlay src={previewUrl} className="preview-video" />
        </div>
      </div>
    </div>
  );
};
