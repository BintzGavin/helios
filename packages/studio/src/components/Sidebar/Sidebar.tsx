import React, { useState } from 'react';
import './Sidebar.css';
import { AssetsPanel } from '../AssetsPanel/AssetsPanel';
import { RendersPanel } from '../RendersPanel/RendersPanel';
import { CaptionsPanel } from '../CaptionsPanel/CaptionsPanel';

export const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'assets' | 'renders' | 'captions'>('assets');

  return (
    <div className="studio-sidebar">
      <div className="sidebar-tabs">
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
        {activeTab === 'assets' && <AssetsPanel />}
        {activeTab === 'captions' && <CaptionsPanel />}
        {activeTab === 'renders' && <RendersPanel />}
      </div>
    </div>
  );
};
