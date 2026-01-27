import React, { useEffect } from 'react';
import { useStudio } from '../context/StudioContext';
import './KeyboardShortcutsModal.css';

interface ShortcutDef {
  description: string;
  keys: string[];
}

interface ShortcutSection {
  title: string;
  shortcuts: ShortcutDef[];
}

const SHORTCUTS: ShortcutSection[] = [
  {
    title: 'Playback',
    shortcuts: [
      { description: 'Play / Pause', keys: ['Space'] },
      { description: 'Restart / Rewind', keys: ['Home'] },
      { description: 'Toggle Loop', keys: ['L'] },
    ]
  },
  {
    title: 'Navigation',
    shortcuts: [
      { description: 'Previous Frame', keys: ['←'] },
      { description: 'Next Frame', keys: ['→'] },
      { description: 'Back 10 Frames', keys: ['Shift', '←'] },
      { description: 'Forward 10 Frames', keys: ['Shift', '→'] },
    ]
  },
  {
    title: 'Timeline',
    shortcuts: [
      { description: 'Set In Point', keys: ['I'] },
      { description: 'Set Out Point', keys: ['O'] },
    ]
  },
  {
    title: 'General',
    shortcuts: [
      { description: 'Switch Composition', keys: ['⌘', 'K'] },
      { description: 'Show Shortcuts', keys: ['?'] },
    ]
  }
];

export const KeyboardShortcutsModal: React.FC = () => {
  const { isHelpOpen, setHelpOpen } = useStudio();

  // Close on Escape
  useEffect(() => {
    if (!isHelpOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHelpOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHelpOpen, setHelpOpen]);

  if (!isHelpOpen) return null;

  return (
    <div className="shortcuts-modal-overlay" onClick={() => setHelpOpen(false)}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="shortcuts-modal-close" onClick={() => setHelpOpen(false)}>
            ×
          </button>
        </div>
        <div className="shortcuts-modal-content">
          {SHORTCUTS.map((section) => (
            <div key={section.title} className="shortcuts-section">
              <h3>{section.title}</h3>
              {section.shortcuts.map((shortcut, i) => (
                <div key={i} className="shortcut-row">
                  <div className="shortcut-description">{shortcut.description}</div>
                  <div className="shortcut-keys">
                    {shortcut.keys.map((key, k) => (
                      <span key={k} className="kbd">{key}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
