/**
 * Smart Empty State for the Stage.
 * Displays call-to-action when no composition is loaded or selected.
 */
import React from 'react';
import { useStudio } from '../../context/StudioContext';
import './EmptyState.css';

export const EmptyState: React.FC = () => {
  const { compositions, setCreateOpen, setOmnibarOpen } = useStudio();

  // Scenario A: Fresh Project (No compositions)
  if (compositions.length === 0) {
    return (
      <div className="empty-state-overlay">
        <h1>Welcome to Helios Studio</h1>
        <p>Get started by creating your first composition.</p>
        <button className="primary-button" onClick={() => setCreateOpen(true)}>
          + Create Composition
        </button>
      </div>
    );
  }

  // Scenario B: Project Loaded, No Active Tab
  return (
    <div className="empty-state-overlay">
      <h2>No Composition Selected</h2>
      <p>Select a composition to start editing.</p>
      <button className="secondary-button" onClick={() => setOmnibarOpen(true)}>
        Select Composition (⌘K)
      </button>
    </div>
  );
};
