import React from 'react';

interface StageToolbarProps {
  zoom: number;
  onZoom: (zoom: number) => void;
  onFit: () => void;
  isTransparent: boolean;
  onToggleTransparent: () => void;
  canvasSize: { width: number; height: number };
  onCanvasSizeChange: (size: { width: number; height: number }) => void;
  onSnapshot: () => void;
}

export const StageToolbar: React.FC<StageToolbarProps> = ({
  zoom,
  onZoom,
  onFit,
  isTransparent,
  onToggleTransparent,
  canvasSize,
  onCanvasSizeChange,
  onSnapshot
}) => {
  const styles = {
    container: {
      position: 'absolute' as const,
      bottom: '16px',
      right: '16px',
      display: 'flex',
      gap: '8px',
      background: '#333',
      padding: '4px',
      borderRadius: '4px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      zIndex: 10,
      alignItems: 'center'
    },
    button: {
      background: 'transparent',
      border: 'none',
      color: '#fff',
      cursor: 'pointer',
      padding: '4px 8px',
      borderRadius: '2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      minWidth: '24px'
    },
    text: {
      color: '#ccc',
      fontSize: '12px',
      margin: '0 4px',
      minWidth: '40px',
      textAlign: 'center' as const
    },
    input: {
      background: '#222',
      border: '1px solid #444',
      color: '#fff',
      borderRadius: '2px',
      padding: '2px 4px',
      width: '50px',
      fontSize: '12px',
      textAlign: 'center' as const
    },
    select: {
      background: '#222',
      border: '1px solid #444',
      color: '#fff',
      borderRadius: '2px',
      padding: '2px 4px',
      fontSize: '12px',
      marginRight: '8px'
    }
  };

  const PRESETS = [
    { label: '1080p', width: 1920, height: 1080 },
    { label: 'Portrait', width: 1080, height: 1920 },
    { label: 'Square', width: 1080, height: 1080 },
    { label: '4K', width: 3840, height: 2160 },
    { label: '720p', width: 1280, height: 720 },
  ];

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (!value) return;
    const [w, h] = value.split('x').map(Number);
    onCanvasSizeChange({ width: w, height: h });
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) {
      onCanvasSizeChange({ ...canvasSize, width: val });
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) {
      onCanvasSizeChange({ ...canvasSize, height: val });
    }
  };

  const currentPresetValue = `${canvasSize.width}x${canvasSize.height}`;
  const isCustom = !PRESETS.some(p => `${p.width}x${p.height}` === currentPresetValue);

  const handleZoomIn = () => onZoom(Math.min(zoom * 1.25, 5));
  const handleZoomOut = () => onZoom(Math.max(zoom / 1.25, 0.1));

  return (
    <div style={styles.container}>
      <select
        style={styles.select}
        value={isCustom ? '' : currentPresetValue}
        onChange={handlePresetChange}
      >
        <option value="" disabled>Presets</option>
        {PRESETS.map(p => (
          <option key={p.label} value={`${p.width}x${p.height}`}>
            {p.label} ({p.width}x{p.height})
          </option>
        ))}
        {isCustom && <option value="">Custom</option>}
      </select>

      <input
        type="number"
        style={styles.input}
        value={canvasSize.width}
        onChange={handleWidthChange}
        title="Width"
      />
      <span style={{ color: '#888', fontSize: '12px' }}>x</span>
      <input
        type="number"
        style={styles.input}
        value={canvasSize.height}
        onChange={handleHeightChange}
        title="Height"
      />

      <div style={{ width: '1px', background: '#555', margin: '0 8px', height: '16px' }} />

      <button style={styles.button} onClick={onFit} title="Fit to Screen">
        Fit
      </button>
      <div style={{ width: '1px', background: '#555', margin: '0 4px' }} />
      <button style={styles.button} onClick={handleZoomOut} title="Zoom Out">
        -
      </button>
      <span style={styles.text}>{Math.round(zoom * 100)}%</span>
      <button style={styles.button} onClick={handleZoomIn} title="Zoom In">
        +
      </button>
      <div style={{ width: '1px', background: '#555', margin: '0 4px' }} />
      <button style={styles.button} onClick={onSnapshot} title="Take Snapshot">
        📷
      </button>
      <div style={{ width: '1px', background: '#555', margin: '0 4px' }} />
      <button
        style={{ ...styles.button, background: isTransparent ? '#444' : 'transparent' }}
        onClick={onToggleTransparent}
        title="Toggle Transparency Grid"
      >
        🏁
      </button>
    </div>
  );
};
