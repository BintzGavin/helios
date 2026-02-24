import React from 'react';

export interface RenderConfigData {
  mode: 'canvas' | 'dom';
  videoBitrate?: string;
  videoCodec?: string;
  concurrency?: number;
  hwAccel?: string;
  scale?: number;
  webCodecsPreference?: 'hardware' | 'software' | 'disabled';
}

interface RenderConfigProps {
  config: RenderConfigData;
  onChange: (config: RenderConfigData) => void;
}

const RENDER_PRESETS: Record<string, Partial<RenderConfigData>> = {
  'Custom': {},
  'Draft': { mode: 'canvas', concurrency: 4 },
  'HD (1080p)': { mode: 'canvas', videoBitrate: '5000k', videoCodec: 'libx264' },
  '4K (High Quality)': { mode: 'canvas', videoBitrate: '20000k', videoCodec: 'libx264' },
  'Transparent (WebM)': { mode: 'dom', videoCodec: 'libvpx-vp9' }
};

export const RenderConfig: React.FC<RenderConfigProps> = ({ config, onChange }) => {
  const handleChange = (field: keyof RenderConfigData, value: string | number) => {
    onChange({
      ...config,
      [field]: value
    });
  };

  const applyPreset = (presetName: string) => {
    const preset = RENDER_PRESETS[presetName];
    if (preset) {
      onChange({
        ...config,
        ...preset
      });
    }
  };

  const getActivePreset = () => {
    for (const [name, preset] of Object.entries(RENDER_PRESETS)) {
      if (name === 'Custom') continue;
      const isMatch = Object.entries(preset).every(([key, value]) => {
        return config[key as keyof RenderConfigData] === value;
      });
      if (isMatch) return name;
    }
    return 'Custom';
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
        <label htmlFor="render-preset" style={labelStyle}>Preset</label>
        <select
          id="render-preset"
          value={getActivePreset()}
          onChange={(e) => applyPreset(e.target.value)}
          style={inputStyle}
        >
          {Object.keys(RENDER_PRESETS).map(preset => (
            <option key={preset} value={preset}>{preset}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label htmlFor="render-mode" style={labelStyle}>Mode</label>
        <select
          id="render-mode"
          value={config.mode}
          onChange={(e) => handleChange('mode', e.target.value as 'canvas' | 'dom')}
          style={inputStyle}
        >
          <option value="canvas">Canvas</option>
          <option value="dom">DOM</option>
        </select>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label htmlFor="render-bitrate" style={labelStyle}>Video Bitrate</label>
        <input
          id="render-bitrate"
          type="text"
          placeholder="e.g. 5M, 1000k"
          value={config.videoBitrate || ''}
          onChange={(e) => handleChange('videoBitrate', e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label htmlFor="render-codec" style={labelStyle}>Video Codec</label>
        <input
          id="render-codec"
          type="text"
          placeholder="e.g. libx264"
          value={config.videoCodec || ''}
          onChange={(e) => handleChange('videoCodec', e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label htmlFor="render-concurrency" style={labelStyle}>Concurrency (Workers)</label>
        <input
          id="render-concurrency"
          type="number"
          min="1"
          max="32"
          value={config.concurrency || 1}
          onChange={(e) => {
            let val = parseInt(e.target.value) || 1;
            val = Math.max(1, Math.min(32, val));
            handleChange('concurrency', val);
          }}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label htmlFor="render-hwaccel" style={labelStyle}>Hardware Acceleration</label>
        <select
          id="render-hwaccel"
          value={config.hwAccel || 'auto'}
          onChange={(e) => handleChange('hwAccel', e.target.value)}
          style={inputStyle}
        >
          <option value="auto">Auto</option>
          <option value="cuda">NVIDIA CUDA</option>
          <option value="vaapi">VAAPI (Linux/Intel)</option>
          <option value="qsv">Intel QSV</option>
          <option value="videotoolbox">Apple VideoToolbox</option>
          <option value="none">None (CPU)</option>
        </select>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label htmlFor="render-webcodecs" style={labelStyle}>WebCodecs Preference</label>
        <select
          id="render-webcodecs"
          value={config.webCodecsPreference || 'hardware'}
          onChange={(e) => handleChange('webCodecsPreference', e.target.value)}
          style={inputStyle}
        >
          <option value="hardware">Hardware (Default)</option>
          <option value="software">Software Only</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label htmlFor="render-scale" style={labelStyle}>Resolution Scale</label>
        <select
          id="render-scale"
          value={config.scale || 1}
          onChange={(e) => handleChange('scale', parseFloat(e.target.value))}
          style={inputStyle}
        >
          <option value={1}>100% (Original)</option>
          <option value={0.75}>75%</option>
          <option value={0.5}>50%</option>
          <option value={0.25}>25%</option>
        </select>
      </div>
    </div>
  );
};
