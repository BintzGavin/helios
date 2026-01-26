import React from 'react';

export interface RenderConfigData {
  mode: 'canvas' | 'dom';
  videoBitrate?: string;
  videoCodec?: string;
}

interface RenderConfigProps {
  config: RenderConfigData;
  onChange: (config: RenderConfigData) => void;
}

export const RenderConfig: React.FC<RenderConfigProps> = ({ config, onChange }) => {
  const handleChange = (field: keyof RenderConfigData, value: string) => {
    onChange({
      ...config,
      [field]: value
    });
  };

  const inputStyle = {
    width: '100%',
    padding: '4px',
    fontSize: '11px',
    boxSizing: 'border-box' as const,
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '2px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '10px',
    fontWeight: 'bold' as const,
    marginBottom: '4px',
    color: '#ccc'
  };

  return (
    <div className="render-config" style={{ padding: '8px', background: '#252526', borderRadius: '4px', marginBottom: '8px', border: '1px solid #333' }}>
      <div style={{ marginBottom: '8px' }}>
        <label style={labelStyle}>Mode</label>
        <select
          value={config.mode}
          onChange={(e) => handleChange('mode', e.target.value as 'canvas' | 'dom')}
          style={inputStyle}
        >
          <option value="canvas">Canvas</option>
          <option value="dom">DOM</option>
        </select>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={labelStyle}>Video Bitrate</label>
        <input
          type="text"
          placeholder="e.g. 5M, 1000k"
          value={config.videoBitrate || ''}
          onChange={(e) => handleChange('videoBitrate', e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={labelStyle}>Video Codec</label>
        <input
          type="text"
          placeholder="e.g. libx264"
          value={config.videoCodec || ''}
          onChange={(e) => handleChange('videoCodec', e.target.value)}
          style={inputStyle}
        />
      </div>
    </div>
  );
};
