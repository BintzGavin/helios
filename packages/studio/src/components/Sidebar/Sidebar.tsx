import React, { useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import './Sidebar.css';
import { AssetsPanel } from '../AssetsPanel/AssetsPanel';
import { RendersPanel } from '../RendersPanel/RendersPanel';
import { CaptionsPanel } from '../CaptionsPanel/CaptionsPanel';
import { CompositionsPanel } from '../CompositionsPanel/CompositionsPanel';

export const Sidebar: React.FC = () => {
  const { setHelpOpen, setDiagnosticsOpen, setAssistantOpen } = useStudio();
  const [activeTab, setActiveTab] = useState<'compositions' | 'assets' | 'renders' | 'captions'>('compositions');

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
          className={`sidebar-tab ${activeTab === 'captions' ? 'active' : ''}`}
          onClick={() => setActiveTab('captions')}
        >
          Captions
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
        {activeTab === 'captions' && <CaptionsPanel />}
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
