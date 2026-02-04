import React, { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import './ComponentsPanel.css';

interface ComponentDefinition {
  name: string;
  type: string;
  files: { name: string; content: string }[];
  dependencies?: Record<string, string>;
}

export const ComponentsPanel: React.FC = () => {
  const [components, setComponents] = useState<ComponentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetch('/api/components')
      .then(res => {
          if (!res.ok) throw new Error('Failed to fetch components');
          return res.json();
      })
      .then(data => {
        setComponents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        addToast('Failed to load components', 'error');
        setLoading(false);
      });
  }, [addToast]);

  const handleInstall = async (name: string) => {
    setInstalling(name);
    try {
      const res = await fetch('/api/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Installation failed');
      }

      addToast(`Component "${name}" installed`, 'success');
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Installation failed', 'error');
    } finally {
      setInstalling(null);
    }
  };

  if (loading) {
    return <div className="components-panel">Loading registry...</div>;
  }

  return (
    <div className="components-panel">
      <h2>Component Registry</h2>
      <div className="components-grid">
        {components.map(comp => (
          <div key={comp.name} className="component-card">
            <div className="component-header">
              <span className="component-name">{comp.name}</span>
              <span className="component-type">{comp.type}</span>
            </div>
            <div className="component-dependencies">
              {comp.dependencies ? (
                <span>Deps: {Object.keys(comp.dependencies).join(', ')}</span>
              ) : (
                <span>No dependencies</span>
              )}
            </div>
            <button
              className="install-button"
              onClick={() => handleInstall(comp.name)}
              disabled={!!installing}
            >
              {installing === comp.name ? 'Installing...' : 'Install'}
            </button>
          </div>
        ))}
        {components.length === 0 && (
            <div>No components found in registry.</div>
        )}
      </div>
    </div>
  );
};
