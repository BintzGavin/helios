import React from 'react';
import type { PropDefinition, PropType } from '@helios-project/core';
import { useStudio } from '../context/StudioContext';
import './PropsEditor.css'; // Re-use styles

interface SchemaInputProps {
  definition: PropDefinition;
  value: any;
  onChange: (value: any) => void;
}

export const SchemaInput: React.FC<SchemaInputProps> = ({ definition, value, onChange }) => {
  if (definition.enum) {
    return <EnumInput options={definition.enum} value={value} onChange={onChange} />;
  }

  switch (definition.type) {
    case 'string':
      return <StringInput value={value} onChange={onChange} />;
    case 'number':
      return <NumberRangeInput min={definition.minimum} max={definition.maximum} value={value} onChange={onChange} />;
    case 'boolean':
      return <BooleanInput value={value} onChange={onChange} />;
    case 'color':
      return <ColorInput value={value} onChange={onChange} />;
    case 'image':
    case 'video':
    case 'audio':
    case 'font':
      return <AssetInput type={definition.type} value={value} onChange={onChange} />;
    case 'object':
    case 'array':
        // Fallback to JSON editor for complex types
        // We can reuse the JsonPropInput logic but need to expose it or duplicate it?
        // For now, let's just return null and let PropsEditor handle it via fallback if this returns null?
        // Or better, implement a simple text area here.
        return <JsonInput value={value} onChange={onChange} />;
    default:
      return <div className="unsupported-type">Unsupported schema type: {definition.type}</div>;
  }
};

const AssetInput: React.FC<{ type: PropType; value: string; onChange: (val: string) => void }> = ({
  type,
  value,
  onChange
}) => {
  const { assets } = useStudio();
  const listId = React.useId();

  const filteredAssets = assets.filter((a) => a.type === type);

  return (
    <>
      <input
        type="text"
        list={listId}
        className="prop-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Select ${type} or enter URL...`}
      />
      <datalist id={listId}>
        {filteredAssets.map((asset) => (
          <option key={asset.id} value={asset.url}>
            {asset.name}
          </option>
        ))}
      </datalist>
    </>
  );
};

const EnumInput: React.FC<{ options: (string | number)[], value: any, onChange: (val: any) => void }> = ({ options, value, onChange }) => {
  return (
    <select
      className="prop-input prop-select"
      value={value}
      onChange={(e) => {
        const val = e.target.value;
        // Try to convert to number if the original option was a number
        const isNumber = typeof options[0] === 'number';
        onChange(isNumber ? parseFloat(val) : val);
      }}
    >
      {options.map((opt) => (
        <option key={String(opt)} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
};

const NumberRangeInput: React.FC<{ min?: number, max?: number, value: number, onChange: (val: number) => void }> = ({ min, max, value, onChange }) => {
  const hasRange = min !== undefined && max !== undefined;

  return (
    <div className={`prop-number-container ${hasRange ? 'has-range' : ''}`}>
      {hasRange && (
        <input
          type="range"
          className="prop-range"
          min={min}
          max={max}
          step={(max! - min!) / 100}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      )}
      <input
        type="number"
        className="prop-input prop-number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
};

const BooleanInput: React.FC<{ value: boolean, onChange: (val: boolean) => void }> = ({ value, onChange }) => {
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
};

const ColorInput: React.FC<{ value: string, onChange: (val: string) => void }> = ({ value, onChange }) => {
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
  );
};

const StringInput: React.FC<{ value: string, onChange: (val: string) => void }> = ({ value, onChange }) => {
  return (
    <input
      type="text"
      className="prop-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

const JsonInput: React.FC<{ value: any, onChange: (val: any) => void }> = ({ value, onChange }) => {
    const [text, setText] = React.useState(() => JSON.stringify(value, null, 2));
    const [error, setError] = React.useState(false);

    // Sync external changes
    React.useEffect(() => {
        setText(JSON.stringify(value, null, 2));
    }, [value]);

    const handleBlur = () => {
        try {
            const parsed = JSON.parse(text);
            setError(false);
            if (JSON.stringify(parsed) !== JSON.stringify(value)) {
                onChange(parsed);
            }
            setText(JSON.stringify(parsed, null, 2));
        } catch (e) {
            setError(true);
        }
    };

    return (
        <textarea
            className={`prop-input json-editor ${error ? 'error' : ''}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            spellCheck={false}
        />
    );
};
