import React, { useState, useEffect, useRef } from 'react';
import { useStudio } from '../context/StudioContext';
import { SchemaInput } from './SchemaInputs';
import './PropsEditor.css';

export const PropsEditor: React.FC = () => {
  const { controller, playerState } = useStudio();
  const { inputProps, schema } = playerState;

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

  return (
    <div className="props-editor">
      {Object.entries(inputProps).map(([key, value]) => {
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
      })}
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
         className="prop-input"
         value={value}
         onChange={(e) => onChange(e.target.value)}
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
