import React from 'react';

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`studio-panel ${className}`} style={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #333', backgroundColor: '#1e1e1e', color: '#eee' }}>
      {title && (
        <div className="panel-header" style={{ padding: '8px', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>
          {title}
        </div>
      )}
      <div className="panel-content" style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {children}
      </div>
    </div>
  );
};
