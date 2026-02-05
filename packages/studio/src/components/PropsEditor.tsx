import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStudio } from '../context/StudioContext';
import { SchemaInput, getDefaultValueForType } from './SchemaInputs';
import './PropsEditor.css';

const PropGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="prop-group">
      <div className="prop-group-header" onClick={() => setCollapsed(!collapsed)}>
        <span className={`prop-group-arrow ${collapsed ? 'collapsed' : ''}`}>▼</span>
        <span className="prop-group-title">{title}</span>
      </div>
      {!collapsed && <div className="prop-group-content">{children}</div>}
    </div>
  );
};

const PropsToolbar: React.FC<{
  onCopy: () => void;
  onReset: () => void;
}> = ({ onCopy, onReset }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="props-toolbar">
      <button className="props-toolbar-btn" onClick={handleCopy} title="Copy JSON">
        {copied ? 'Copied!' : 'Copy JSON'}
      </button>
      <button className="props-toolbar-btn danger" onClick={onReset} title="Reset to Defaults">
        Reset
      </button>
    </div>
  );
};

export const PropsEditor: React.FC = () => {
  const { controller, playerState, activeComposition, updateCompositionMetadata } = useStudio();
  const { inputProps, schema } = playerState;

  // Auto-save input props to composition metadata
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeComposition && inputProps && Object.keys(inputProps).length > 0) {
        const currentDefaults = activeComposition.metadata?.defaultProps;
        // Only save if changed to avoid infinite loops/unnecessary writes
        if (JSON.stringify(currentDefaults) !== JSON.stringify(inputProps)) {
          // Ensure we preserve existing metadata
          const metadata = activeComposition.metadata || {
            width: 1920,
            height: 1080,
            fps: 30,
            duration: 10
          };

          updateCompositionMetadata(activeComposition.id, {
            ...metadata,
            defaultProps: inputProps
          });
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [inputProps, activeComposition, updateCompositionMetadata]);

  const groupedProps = useMemo(() => {
    const groups: Record<string, string[]> = {};
    const ungrouped: string[] = [];

    if (!inputProps) return { groups, ungrouped };

    // Iterate keys in order of inputProps to preserve rough ordering
    Object.keys(inputProps).forEach(key => {
      const def = schema?.[key];
      if (def?.group) {
        if (!groups[def.group]) groups[def.group] = [];
        groups[def.group].push(key);
      } else {
        ungrouped.push(key);
      }
    });

    return { groups, ungrouped };
  }, [inputProps, schema]);

  if (!controller) {
    return <div className="editor-message">No active controller</div>;
  }

  if (!inputProps || Object.keys(inputProps).length === 0) {
    return <div className="editor-message">No input props defined</div>;
  }

  const handleChange = (key: string, value: any) => {
    const newProps = { ...inputProps, [key]: value };
    controller.setInputProps(newProps);
  };

  const handleCopy = () => {
    if (inputProps) {
      navigator.clipboard.writeText(JSON.stringify(inputProps, null, 2));
    }
  };

  const handleReset = () => {
    if (!schema || !controller) return;
    const defaults: Record<string, any> = {};
    Object.keys(schema).forEach(key => {
      const def = schema[key];
      defaults[key] = def.default ?? getDefaultValueForType(def.type);
    });
    controller.setInputProps(defaults);
  };

  const renderRow = (key: string) => {
    const value = inputProps[key];
    const def = schema ? schema[key] : undefined;

    return (
      <div key={key} className="prop-row">
        <label className="prop-label" title={def?.description}>
          {def?.label || key}
        </label>
        {def ? (
          <SchemaInput
            definition={def}
            value={value}
            onChange={(newValue) => handleChange(key, newValue)}
          />
        ) : (
          <PropInput
            value={value}
            onChange={(newValue) => handleChange(key, newValue)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="props-editor">
      <PropsToolbar onCopy={handleCopy} onReset={handleReset} />

      {/* Render Ungrouped Props First */}
      {groupedProps.ungrouped.map(key => renderRow(key))}

      {/* Render Groups */}
      {Object.entries(groupedProps.groups).map(([groupName, keys]) => (
        <PropGroup key={groupName} title={groupName}>
           {keys.map(key => renderRow(key))}
        </PropGroup>
      ))}
    </div>
  );
};

const JsonPropInput: React.FC<{ value: any, onChange: (val: any) => void }> = ({ value, onChange }) => {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    // Only update text if the value actually changed (deep comparison)
    // This prevents overwriting user input if the parent re-renders with the same value (but new reference)
    if (JSON.stringify(value) !== JSON.stringify(prevValueRef.current)) {
      setText(JSON.stringify(value, null, 2));
      prevValueRef.current = value;
      setError(false); // Clear error if external value replaces our invalid state
    }
  }, [value]);

  const handleBlur = () => {
    try {
      const parsed = JSON.parse(text);
      setError(false);
      // Only fire change if value actually changed to avoid unnecessary updates
      if (JSON.stringify(parsed) !== JSON.stringify(value)) {
        onChange(parsed);
      }
      // Re-format on blur
      setText(JSON.stringify(parsed, null, 2));
    } catch (e) {
      setError(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Optional: clear error if valid while typing?
    // Let's stick to blur for validation to be less distracting
  };

  return (
    <textarea
      className={`prop-input json-editor ${error ? 'error' : ''}`}
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      spellCheck={false}
    />
  );
};

const PropInput: React.FC<{ value: any, onChange: (val: any) => void }> = ({ value, onChange }) => {
  const type = typeof value;
  const [isDragOver, setIsDragOver] = useState(false);

  if (value === null) {
      return <JsonPropInput value={value} onChange={onChange} />;
  }

  if (type === 'number') {
    return (
      <input
        type="number"
        className="prop-input"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    );
  }

  if (type === 'boolean') {
    return (
      <label className="prop-checkbox-label">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {value ? 'True' : 'False'}
      </label>
    );
  }

  if (type === 'string') {
     // Check if color
     if (value.startsWith('#') && (value.length === 4 || value.length === 7)) {
         return (
             <div className="prop-color-container">
                 <input
                    type="color"
                    className="prop-color-picker"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                 />
                 <input
                    type="text"
                    className="prop-input prop-color-text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                 />
             </div>
         )
     }
     return (
       <input
         type="text"
         className={`prop-input ${isDragOver ? 'drag-over' : ''}`}
         value={value}
         onChange={(e) => onChange(e.target.value)}
         onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
         onDragLeave={() => setIsDragOver(false)}
         onDrop={(e) => {
             e.preventDefault();
             setIsDragOver(false);
             const text = e.dataTransfer.getData('text/plain');
             if (text) onChange(text);
         }}
       />
     );
  }

  if (type === 'object') {
      return <JsonPropInput value={value} onChange={onChange} />;
  }

  return (
    <div className="unsupported-type">
      Unsupported type: {type} ({JSON.stringify(value)})
    </div>
  );
};
