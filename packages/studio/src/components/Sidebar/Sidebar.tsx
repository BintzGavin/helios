import React from 'react';
import { useStudio } from '../../context/StudioContext';
import { usePersistentState } from '../../hooks/usePersistentState';
import './Sidebar.css';
import { AssetsPanel } from '../AssetsPanel/AssetsPanel';
import { RendersPanel } from '../RendersPanel/RendersPanel';
import { CaptionsPanel } from '../CaptionsPanel/CaptionsPanel';
import { CompositionsPanel } from '../CompositionsPanel/CompositionsPanel';
import { AudioMixerPanel } from '../AudioMixerPanel/AudioMixerPanel';
import { ComponentsPanel } from '../ComponentsPanel/ComponentsPanel';

export const Sidebar: React.FC = () => {
  const { setHelpOpen, setDiagnosticsOpen, setAssistantOpen } = useStudio();
  const [activeTab, setActiveTab] = usePersistentState<'compositions' | 'assets' | 'renders' | 'captions' | 'audio' | 'components'>('sidebar-active-tab', 'compositions');

  return (
    <div className="studio-sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'compositions' ? 'active' : ''}`}
          onClick={() => setActiveTab('compositions')}
        >
          Compositions
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'assets' ? 'active' : ''}`}
          onClick={() => setActiveTab('assets')}
        >
          Assets
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'components' ? 'active' : ''}`}
          onClick={() => setActiveTab('components')}
        >
          Components
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'captions' ? 'active' : ''}`}
          onClick={() => setActiveTab('captions')}
        >
          Captions
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'audio' ? 'active' : ''}`}
          onClick={() => setActiveTab('audio')}
        >
          Audio
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'renders' ? 'active' : ''}`}
          onClick={() => setActiveTab('renders')}
        >
          Renders
        </button>
      </div>
      <div className="sidebar-content">
        {activeTab === 'compositions' && <CompositionsPanel />}
        {activeTab === 'assets' && <AssetsPanel />}
        {activeTab === 'components' && <ComponentsPanel />}
        {activeTab === 'captions' && <CaptionsPanel />}
        {activeTab === 'audio' && <AudioMixerPanel />}
        {activeTab === 'renders' && <RendersPanel />}
      </div>
      <div className="sidebar-footer">
        <button
          className="sidebar-help-button"
          onClick={() => setAssistantOpen(true)}
          title="Helios Assistant"
          style={{ marginRight: '8px' }}
        >
          ✨
        </button>
        <button
          className="sidebar-help-button"
          onClick={() => setDiagnosticsOpen(true)}
          title="System Diagnostics"
          style={{ marginRight: '8px' }}
        >
          🩺
        </button>
        <button
          className="sidebar-help-button"
          onClick={() => setHelpOpen(true)}
          title="Keyboard Shortcuts (?)"
        >
          ?
        </button>
      </div>
    </div>
  );
};
