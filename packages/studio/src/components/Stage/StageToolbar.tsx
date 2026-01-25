import React from 'react';

interface StageToolbarProps {
  zoom: number;
  onZoom: (zoom: number) => void;
  onFit: () => void;
  isTransparent: boolean;
  onToggleTransparent: () => void;
}

export const StageToolbar: React.FC<StageToolbarProps> = ({
  zoom,
  onZoom,
  onFit,
  isTransparent,
  onToggleTransparent
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
      zIndex: 10
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
    }
  };

  const handleZoomIn = () => onZoom(Math.min(zoom * 1.25, 5));
  const handleZoomOut = () => onZoom(Math.max(zoom / 1.25, 0.1));

  return (
    <div style={styles.container}>
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
