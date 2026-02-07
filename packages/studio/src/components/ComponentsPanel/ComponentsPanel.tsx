import React, { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import './ComponentsPanel.css';

interface ComponentDefinition {
  name: string;
  description?: string;
  installed?: boolean;
  type: string;
  files: { name: string; content: string }[];
  dependencies?: Record<string, string>;
}

export const ComponentsPanel: React.FC = () => {
  const [components, setComponents] = useState<ComponentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchComponents = () => {
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
  };

  useEffect(() => {
    fetchComponents();
  }, []);

  const handleInstall = async (name: string) => {
    setProcessing(name);
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
      fetchComponents();
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Installation failed', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleUpdate = async (name: string) => {
    setProcessing(name);
    try {
      const res = await fetch('/api/components', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Update failed');
      }

      addToast(`Component "${name}" updated`, 'success');
      fetchComponents();
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Update failed', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleRemove = async (name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}"? This will delete component files.`)) return;

    setProcessing(name);
    try {
      const res = await fetch(`/api/components?name=${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Removal failed');
      }

      addToast(`Component "${name}" removed`, 'success');
      fetchComponents();
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Removal failed', 'error');
    } finally {
      setProcessing(null);
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="component-name">{comp.name}</span>
                {comp.installed && <span className="component-badge installed">Installed</span>}
              </div>
              <span className="component-type">{comp.type}</span>
            </div>
            {comp.description && (
              <div className="component-description">{comp.description}</div>
            )}
            <div className="component-dependencies">
              {comp.dependencies ? (
                <span>Deps: {Object.keys(comp.dependencies).join(', ')}</span>
              ) : (
                <span>No dependencies</span>
              )}
            </div>
            <div className="component-actions">
              {!comp.installed ? (
                <button
                  className="install-button"
                  onClick={() => handleInstall(comp.name)}
                  disabled={!!processing}
                >
                  {processing === comp.name ? 'Installing...' : 'Install'}
                </button>
              ) : (
                <>
                  <button
                    className="update-button"
                    onClick={() => handleUpdate(comp.name)}
                    disabled={!!processing}
                  >
                    {processing === comp.name ? 'Updating...' : 'Update'}
                  </button>
                  <button
                    className="remove-button"
                    onClick={() => handleRemove(comp.name)}
                    disabled={!!processing}
                  >
                    {processing === comp.name ? 'Removing...' : 'Remove'}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {components.length === 0 && (
            <div>No components found in registry.</div>
        )}
      </div>
    </div>
  );
};
