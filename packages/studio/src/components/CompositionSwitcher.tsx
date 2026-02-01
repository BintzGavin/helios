import React, { useState, useEffect, useRef } from 'react';
import { useStudio, Composition } from '../context/StudioContext';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';

export const CompositionSwitcher: React.FC = () => {
  const { compositions, setActiveComposition, isSwitcherOpen, setSwitcherOpen, deleteComposition } = useStudio();
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isSwitcherOpen) {
      setFilter('');
      setSelectedIndex(0);
      // Small timeout to allow render
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isSwitcherOpen]);

  // Filter compositions
  const filtered = compositions.filter(c =>
    c.name.toLowerCase().includes(filter.toLowerCase()) ||
    c.id.toLowerCase().includes(filter.toLowerCase())
  );

  // Keyboard navigation
  useKeyboardShortcut('ArrowDown', (_e) => {
    if (!isSwitcherOpen) return;
    setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
  }, { preventDefault: true });

  useKeyboardShortcut('ArrowUp', (_e) => {
    if (!isSwitcherOpen) return;
    setSelectedIndex(i => Math.max(i - 1, 0));
  }, { preventDefault: true });

  useKeyboardShortcut('Enter', (_e) => {
    if (!isSwitcherOpen) return;
    if (filtered[selectedIndex]) {
      selectComposition(filtered[selectedIndex]);
    }
  }, { preventDefault: true });

  useKeyboardShortcut('Escape', () => {
    if (isSwitcherOpen) {
      setSwitcherOpen(false);
    }
  });

  const selectComposition = (comp: Composition) => {
    setActiveComposition(comp);
    setSwitcherOpen(false);
  };

  if (!isSwitcherOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingTop: '100px',
      zIndex: 1000,
    }} onClick={() => setSwitcherOpen(false)}>
      <div style={{
        backgroundColor: '#1e1e1e',
        border: '1px solid #333',
        borderRadius: '8px',
        width: '500px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={filter}
          onChange={e => {
            setFilter(e.target.value);
            setSelectedIndex(0);
          }}
          placeholder="Search compositions..."
          style={{
            padding: '12px 16px',
            fontSize: '16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: '1px solid #333',
            color: 'white',
            outline: 'none'
          }}
        />
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '16px', color: '#666', textAlign: 'center' }}>No results found</div>
          ) : (
            filtered.map((comp, index) => (
              <div
                key={comp.id}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => selectComposition(comp)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: index === selectedIndex ? '#333' : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {comp.thumbnailUrl ? (
                    <img
                      src={comp.thumbnailUrl}
                      alt=""
                      style={{ width: '48px', height: '27px', objectFit: 'cover', borderRadius: '2px', background: '#000' }}
                    />
                  ) : (
                    <div style={{ width: '48px', height: '27px', borderRadius: '2px', background: '#222' }} />
                  )}
                  <div>
                    <div style={{ color: 'white' }}>{comp.name}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{comp.description || comp.id}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {index === selectedIndex && <div style={{ fontSize: '12px', color: '#aaa' }}>Enter ↵</div>}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to delete "${comp.name}"? This cannot be undone.`)) {
                        deleteComposition(comp.id).catch(err => alert(err.message));
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#666',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '4px',
                      opacity: index === selectedIndex ? 1 : 0.5
                    }}
                    title="Delete Composition"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{
            padding: '8px 16px',
            borderTop: '1px solid #333',
            fontSize: '11px',
            color: '#666',
            display: 'flex',
            justifyContent: 'space-between'
        }}>
            <span>↑↓ to navigate</span>
            <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
