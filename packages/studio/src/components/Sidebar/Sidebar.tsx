import React, { useState } from 'react';
import './Sidebar.css';
import { AssetsPanel } from '../AssetsPanel/AssetsPanel';
// Will be created in next step
import { RendersPanel } from '../RendersPanel/RendersPanel';

export const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'assets' | 'renders'>('assets');

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
          className={`sidebar-tab ${activeTab === 'renders' ? 'active' : ''}`}
          onClick={() => setActiveTab('renders')}
        >
          Renders
        </button>
      </div>
      <div className="sidebar-content">
        {activeTab === 'assets' ? <AssetsPanel /> : <RendersPanel />}
      </div>
    </div>
  );
};
