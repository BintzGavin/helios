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
  const [activeTab, setActiveTab] = useState<'components' | 'skills'>('components');
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
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
      fetchComponents();
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Installation failed', 'error');
    } finally {
      setInstalling(null);
    }
  };

  const filteredComponents = components.filter(c => {
    if (activeTab === 'skills') return c.type === 'skill';
    return c.type !== 'skill';
  });

  if (loading) {
    return <div className="components-panel">Loading registry...</div>;
  }

  return (
    <div className="components-panel">
      <h2>Registry</h2>

      <div className="components-tabs">
        <button
           className={activeTab === 'components' ? 'active' : ''}
           onClick={() => setActiveTab('components')}
        >
           UI Components
        </button>
        <button
           className={activeTab === 'skills' ? 'active' : ''}
           onClick={() => setActiveTab('skills')}
        >
           Agent Skills
        </button>
      </div>

      <div className="components-grid">
        {filteredComponents.map(comp => (
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
            <button
              className={`install-button ${comp.installed ? 'success' : ''}`}
              onClick={() => handleInstall(comp.name)}
              disabled={!!installing || (!!comp.installed)}
            >
              {installing === comp.name ? 'Installing...' : (comp.installed ? 'Installed' : 'Install')}
            </button>
          </div>
        ))}
        {filteredComponents.length === 0 && (
            <div>No {activeTab} found in registry.</div>
        )}
      </div>
    </div>
  );
};
