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
        if (definition.properties) {
            return <ObjectInput definition={definition} value={value} onChange={onChange} />;
        }
        return <JsonInput value={value} onChange={onChange} />;
    case 'array':
        if (definition.items) {
             return <ArrayInput definition={definition} value={value} onChange={onChange} />;
        }
        return <JsonInput value={value} onChange={onChange} />;
    default:
      return <div className="unsupported-type">Unsupported schema type: {definition.type}</div>;
  }
};

// Helper to get safe default values
export const getDefaultValueForType = (type: PropType): any => {
    switch (type) {
        case 'string': return '';
        case 'number': return 0;
        case 'boolean': return false;
        case 'object': return {};
        case 'array': return [];
        case 'color': return '#000000';
        case 'image':
        case 'video':
        case 'audio':
        case 'font':
            return '';
        default: return undefined;
    }
};

const ObjectInput: React.FC<{ definition: PropDefinition; value: any; onChange: (val: any) => void }> = ({ definition, value, onChange }) => {
    // If value is null/undefined or not an object, initialize it
    const safeValue = (typeof value === 'object' && value !== null && !Array.isArray(value)) ? value : {};

    const handlePropChange = (key: string, newVal: any) => {
        onChange({ ...safeValue, [key]: newVal });
    };

    return (
        <div className="prop-object-container">
            {definition.properties && Object.entries(definition.properties).map(([key, propDef]) => (
                <div key={key} className="prop-row">
                    <label className="prop-label">{propDef.label || key}</label>
                    <SchemaInput
                        definition={propDef}
                        value={safeValue[key] ?? propDef.default ?? getDefaultValueForType(propDef.type)}
                        onChange={(val) => handlePropChange(key, val)}
                    />
                </div>
            ))}
        </div>
    );
};

const ArrayInput: React.FC<{ definition: PropDefinition; value: any; onChange: (val: any) => void }> = ({ definition, value, onChange }) => {
    // If value is not an array, initialize it
    const safeValue = Array.isArray(value) ? value : [];

    const handleItemChange = (index: number, newVal: any) => {
        const copy = [...safeValue];
        copy[index] = newVal;
        onChange(copy);
    };

    const handleAdd = () => {
        // Determine default value based on item type
        let defaultVal: any = undefined;
        if (definition.items?.default !== undefined) {
             defaultVal = definition.items.default;
        } else if (definition.items) {
             defaultVal = getDefaultValueForType(definition.items.type);
        }

        onChange([...safeValue, defaultVal]);
    };

    const handleRemove = (index: number) => {
        const copy = [...safeValue];
        copy.splice(index, 1);
        onChange(copy);
    };

    return (
        <div className="prop-array-container">
            {safeValue.map((item: any, index: number) => (
                <div key={index} className="prop-array-item">
                     <div className="prop-array-item-content">
                        {definition.items && (
                            <SchemaInput
                                definition={definition.items}
                                value={item}
                                onChange={(val) => handleItemChange(index, val)}
                            />
                        )}
                     </div>
                     <button
                        className="prop-array-remove"
                        onClick={() => handleRemove(index)}
                        title="Remove Item"
                     >
                        Remove
                     </button>
                </div>
            ))}
            <button className="prop-array-add" onClick={handleAdd}>
                + Add Item
            </button>
        </div>
    );
};

const AssetInput: React.FC<{ type: PropType; value: string; onChange: (val: string) => void }> = ({
  type,
  value,
  onChange
}) => {
  const { assets } = useStudio();
  const listId = React.useId();
  const [isDragOver, setIsDragOver] = React.useState(false);

  const filteredAssets = assets.filter((a) => a.type === type);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const assetData = e.dataTransfer.getData('application/helios-asset');
    if (assetData) {
        try {
            const asset = JSON.parse(assetData);
            if (asset.type === type) {
                onChange(asset.url);
            }
        } catch (e) {
            console.error('Invalid asset data', e);
        }
    } else {
        // Fallback for generic text
        const text = e.dataTransfer.getData('text/plain');
        if (text) onChange(text);
    }
  };

  return (
    <>
      <input
        type="text"
        list={listId}
        className={`prop-input ${isDragOver ? 'drag-over' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Select ${type} or enter URL...`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const text = e.dataTransfer.getData('text/plain');
    if (text) onChange(text);
  };

  return (
    <input
      type="text"
      className={`prop-input ${isDragOver ? 'drag-over' : ''}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
