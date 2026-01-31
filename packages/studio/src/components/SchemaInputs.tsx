import React from 'react';
import type { PropDefinition, PropType } from '@helios-project/core';
import { useStudio } from '../context/StudioContext';
import './PropsEditor.css'; // Re-use styles

// Extended PropType to support future types not yet in Core
type ExtendedPropType = PropType | 'model' | 'json' | 'shader';

interface SchemaInputProps {
  definition: PropDefinition;
  value: any;
  onChange: (value: any) => void;
}

export const SchemaInput: React.FC<SchemaInputProps> = ({ definition, value, onChange }) => {
  if (definition.enum) {
    return <EnumInput options={definition.enum} value={value} onChange={onChange} />;
  }

  // Cast to ExtendedPropType to allow handling new types
  const type = definition.type as ExtendedPropType;

  switch (type) {
    case 'string':
      return <StringInput value={value} onChange={onChange} format={definition.format} />;
    case 'number':
      return <NumberRangeInput min={definition.minimum} max={definition.maximum} step={definition.step} value={value} onChange={onChange} />;
    case 'boolean':
      return <BooleanInput value={value} onChange={onChange} />;
    case 'color':
      return <ColorInput value={value} onChange={onChange} />;
    case 'image':
    case 'video':
    case 'audio':
    case 'font':
    case 'model':
    case 'json':
    case 'shader':
      return <AssetInput type={type} value={value} onChange={onChange} />;
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
    case 'int8array':
    case 'uint8array':
    case 'uint8clampedarray':
    case 'int16array':
    case 'uint16array':
    case 'int32array':
    case 'uint32array':
    case 'float32array':
    case 'float64array':
        return <TypedArrayInput type={type} value={value} onChange={onChange} />;
    default:
      return <div className="unsupported-type">Unsupported schema type: {definition.type}</div>;
  }
};

// Helper to get safe default values
export const getDefaultValueForType = (type: PropType): any => {
    // Cast to allow extended types
    const extendedType = type as ExtendedPropType;
    switch (extendedType) {
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
        case 'model':
        case 'json':
        case 'shader':
            return '';
        case 'int8array': return new Int8Array(0);
        case 'uint8array': return new Uint8Array(0);
        case 'uint8clampedarray': return new Uint8ClampedArray(0);
        case 'int16array': return new Int16Array(0);
        case 'uint16array': return new Uint16Array(0);
        case 'int32array': return new Int32Array(0);
        case 'uint32array': return new Uint32Array(0);
        case 'float32array': return new Float32Array(0);
        case 'float64array': return new Float64Array(0);
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

const AssetInput: React.FC<{ type: ExtendedPropType; value: string; onChange: (val: string) => void }> = ({
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

const NumberRangeInput: React.FC<{ min?: number, max?: number, step?: number, value: number, onChange: (val: number) => void }> = ({ min, max, step, value, onChange }) => {
  const hasRange = min !== undefined && max !== undefined;
  // If step is not provided, default to 1% of range, or default browser behavior if no range
  const rangeStep = step !== undefined ? step : (hasRange ? (max! - min!) / 100 : undefined);

  return (
    <div className={`prop-number-container ${hasRange ? 'has-range' : ''}`}>
      {hasRange && (
        <input
          type="range"
          className="prop-range"
          min={min}
          max={max}
          step={rangeStep}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      )}
      <input
        type="number"
        className="prop-input prop-number"
        min={min}
        max={max}
        step={step}
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

const StringInput: React.FC<{ value: string, onChange: (val: string) => void, format?: string }> = ({ value, onChange, format }) => {
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

  let inputType = 'text';
  if (format) {
      if (format === 'date') inputType = 'date';
      else if (format === 'time') inputType = 'time';
      else if (format === 'date-time') inputType = 'datetime-local';
      else if (format === 'email') inputType = 'email';
      else if (format === 'uri' || format === 'url') inputType = 'url';
      else if (format === 'color') inputType = 'color';
  }

  return (
    <input
      type={inputType}
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

// Map type string to Constructor
const getTypedArrayConstructor = (type: ExtendedPropType) => {
  switch(type) {
    case 'float32array': return Float32Array;
    case 'int8array': return Int8Array;
    case 'uint8array': return Uint8Array;
    case 'uint8clampedarray': return Uint8ClampedArray;
    case 'int16array': return Int16Array;
    case 'uint16array': return Uint16Array;
    case 'int32array': return Int32Array;
    case 'uint32array': return Uint32Array;
    case 'float64array': return Float64Array;
    default: return Float32Array;
  }
};

const TypedArrayInput: React.FC<{ type: ExtendedPropType, value: any, onChange: (val: any) => void }> = ({ type, value, onChange }) => {
  // Convert TypedArray to standard Array for friendly JSON editing (e.g. [1, 2] instead of {"0":1})
  // value is expected to be a TypedArray instance, but handle potential mismatch
  const arrayValue = (value && typeof value[Symbol.iterator] === 'function')
    ? Array.from(value)
    : [];

  const handleChange = (newJsonValue: any) => {
    if (!Array.isArray(newJsonValue)) return; // Logic to reject non-arrays
    const Constructor = getTypedArrayConstructor(type);
    onChange(new Constructor(newJsonValue));
  };

  return <JsonInput value={arrayValue} onChange={handleChange} />;
};
