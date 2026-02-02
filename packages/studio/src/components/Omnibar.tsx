import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStudio, Composition, Asset } from '../context/StudioContext';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { useToast } from '../context/ToastContext';
import './Omnibar.css';

interface OmnibarItem {
  id: string;
  type: 'command' | 'composition' | 'asset';
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
  keywords?: string[];
}

export const Omnibar: React.FC = () => {
  const { addToast } = useToast();
  const {
    isOmnibarOpen,
    setOmnibarOpen,
    compositions,
    assets,
    setActiveComposition,
    toggleLoop,
    takeSnapshot,
    startRender,
    activeComposition,
    setCreateOpen,
    setDuplicateOpen,
    setSettingsOpen,
    setHelpOpen,
    setDiagnosticsOpen,
    setAssistantOpen
  } = useStudio();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOmnibarOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOmnibarOpen]);

  // Define Commands
  const commands: OmnibarItem[] = useMemo(() => [
    {
      id: 'cmd-create',
      type: 'command',
      label: 'Create Composition',
      description: 'Create a new video composition',
      action: () => setCreateOpen(true),
      shortcut: 'N'
    },
    {
      id: 'cmd-duplicate',
      type: 'command',
      label: 'Duplicate Composition',
      description: 'Duplicate the current composition',
      action: () => setDuplicateOpen(true)
    },
    {
      id: 'cmd-settings',
      type: 'command',
      label: 'Composition Settings',
      description: 'Edit width, height, FPS, duration',
      action: () => setSettingsOpen(true)
    },
    {
      id: 'cmd-loop',
      type: 'command',
      label: 'Toggle Loop',
      description: 'Toggle playback loop',
      action: toggleLoop,
      shortcut: 'L'
    },
    {
      id: 'cmd-snapshot',
      type: 'command',
      label: 'Take Snapshot',
      description: 'Save current frame as PNG',
      action: () => takeSnapshot(),
      shortcut: 'S'
    },
    {
      id: 'cmd-render',
      type: 'command',
      label: 'Start Render',
      description: 'Render current composition to video',
      action: () => {
        if (activeComposition) {
            // This is a bit indirect, ideally we'd open the render panel or start rendering
            // For now, let's just trigger a standard render of the full duration
            startRender(activeComposition.id);
        }
      }
    },
    {
        id: 'cmd-help',
        type: 'command',
        label: 'Keyboard Shortcuts',
        description: 'View list of keyboard shortcuts',
        action: () => setHelpOpen(true),
        shortcut: '?'
    },
    {
        id: 'cmd-diagnostics',
        type: 'command',
        label: 'Diagnostics',
        description: 'View system capabilities and performance',
        action: () => setDiagnosticsOpen(true)
    },
    {
        id: 'cmd-assistant',
        type: 'command',
        label: 'Helios Assistant',
        description: 'Ask AI for help',
        action: () => setAssistantOpen(true)
    }
  ], [toggleLoop, takeSnapshot, startRender, activeComposition, setCreateOpen, setDuplicateOpen, setSettingsOpen, setHelpOpen, setDiagnosticsOpen, setAssistantOpen]);

  // Derived Items
  const items = useMemo(() => {
    const compositionItems: OmnibarItem[] = compositions.map(c => ({
      id: `comp-${c.id}`,
      type: 'composition',
      label: c.name,
      description: c.description || `${c.metadata?.width}x${c.metadata?.height} @ ${c.metadata?.fps}fps`,
      icon: c.thumbnailUrl ? (
        <img src={c.thumbnailUrl} alt="" className="omnibar-thumbnail" />
      ) : (
        <div className="omnibar-thumbnail-placeholder" />
      ),
      action: () => setActiveComposition(c)
    }));

    const assetItems: OmnibarItem[] = assets.map(a => ({
      id: `asset-${a.id}`,
      type: 'asset',
      label: a.name,
      description: a.relativePath,
      icon: <span style={{ fontSize: '12px' }}>{getAssetIcon(a.type)}</span>,
      action: () => {
        navigator.clipboard.writeText(a.relativePath);
        addToast('Path copied to clipboard', 'success');
      }
    }));

    // Filter Logic
    const q = query.toLowerCase();

    const filterFn = (item: OmnibarItem) =>
      item.label.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q));

    const filteredCommands = commands.filter(filterFn);
    const filteredCompositions = compositionItems.filter(filterFn);
    const filteredAssets = assetItems.filter(filterFn);

    return {
      all: [...filteredCommands, ...filteredCompositions, ...filteredAssets],
      grouped: [
        { title: 'Commands', items: filteredCommands },
        { title: 'Compositions', items: filteredCompositions },
        { title: 'Assets', items: filteredAssets }
      ].filter(g => g.items.length > 0)
    };
  }, [compositions, assets, commands, query, setActiveComposition]);

  // Flatten for navigation
  const flatItems = items.grouped.flatMap(g => g.items);

  // Keyboard Navigation
  useKeyboardShortcut('ArrowDown', (e) => {
    if (!isOmnibarOpen) return;
    setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1));
  }, { preventDefault: true });

  useKeyboardShortcut('ArrowUp', (e) => {
    if (!isOmnibarOpen) return;
    setSelectedIndex(i => Math.max(i - 1, 0));
  }, { preventDefault: true });

  useKeyboardShortcut('Enter', (e) => {
    if (!isOmnibarOpen) return;
    if (flatItems[selectedIndex]) {
      flatItems[selectedIndex].action();
      setOmnibarOpen(false);
    }
  }, { preventDefault: true });

  useKeyboardShortcut('Escape', () => {
    if (isOmnibarOpen) {
      setOmnibarOpen(false);
    }
  });

  if (!isOmnibarOpen) return null;

  return (
    <div className="omnibar-overlay" onClick={() => setOmnibarOpen(false)}>
      <div className="omnibar-container" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="omnibar-input"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          placeholder="Search commands, compositions, and assets..."
        />
        <div className="omnibar-list">
          {items.grouped.length === 0 ? (
            <div className="omnibar-empty">No results found</div>
          ) : (
            items.grouped.map((group) => (
              <React.Fragment key={group.title}>
                <div className="omnibar-group-header">{group.title}</div>
                {group.items.map((item) => {
                  const globalIndex = flatItems.indexOf(item);
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      className={`omnibar-item ${isSelected ? 'selected' : ''}`}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      onClick={() => {
                        item.action();
                        setOmnibarOpen(false);
                      }}
                    >
                      <div className="omnibar-item-content">
                        <div className="omnibar-item-icon">
                          {item.icon || getIconForType(item.type)}
                        </div>
                        <div className="omnibar-item-details">
                          <div className="omnibar-item-label">{item.label}</div>
                          {item.description && (
                            <div className="omnibar-item-description">{item.description}</div>
                          )}
                        </div>
                      </div>
                      {item.shortcut && (
                        <div className="omnibar-item-shortcut">{item.shortcut}</div>
                      )}
                      {isSelected && !item.shortcut && (
                        <div style={{ fontSize: '10px', color: '#888' }}>↵</div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))
          )}
        </div>
        <div className="omnibar-footer">
            <span>↑↓ to navigate</span>
            <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};

function getIconForType(type: string) {
    switch (type) {
        case 'command': return '⚡️';
        case 'composition': return '🎬';
        case 'asset': return '📦';
        default: return '•';
    }
}

function getAssetIcon(type: string) {
    switch (type) {
        case 'image': return '🖼️';
        case 'video': return '🎥';
        case 'audio': return '🔊';
        case 'font': return '🔤';
        case 'model': return '🧊';
        case 'json': return '{}';
        case 'shader': return '🔮';
        default: return '📄';
    }
}
