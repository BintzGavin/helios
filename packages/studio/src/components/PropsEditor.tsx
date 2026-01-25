import React from 'react';
import { useStudio } from '../context/StudioContext';

export const PropsEditor: React.FC = () => {
  const { controller, playerState } = useStudio();
  const { inputProps } = playerState;

  if (!controller) {
    return <div style={{ padding: '8px', color: '#666' }}>No active controller</div>;
  }

  if (!inputProps || Object.keys(inputProps).length === 0) {
    return <div style={{ padding: '8px', color: '#666' }}>No input props defined</div>;
  }

  const handleChange = (key: string, value: any) => {
    const newProps = { ...inputProps, [key]: value };
    controller.setInputProps(newProps);
  };

  return (
    <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Object.entries(inputProps).map(([key, value]) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.8em', fontWeight: 'bold' }}>{key}</label>
          <PropInput
            value={value}
            onChange={(newValue) => handleChange(key, newValue)}
          />
        </div>
      ))}
    </div>
  );
};

const PropInput: React.FC<{ value: any, onChange: (val: any) => void }> = ({ value, onChange }) => {
  const type = typeof value;

  if (type === 'number') {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ padding: '4px', width: '100%', boxSizing: 'border-box' }}
      />
    );
  }

  if (type === 'boolean') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
             <div style={{ display: 'flex', gap: '4px' }}>
                 <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                 />
                 <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{ flex: 1, padding: '4px' }}
                 />
             </div>
         )
     }
     return (
       <input
         type="text"
         value={value}
         onChange={(e) => onChange(e.target.value)}
         style={{ padding: '4px', width: '100%', boxSizing: 'border-box' }}
       />
     );
  }

  return (
    <div style={{ fontSize: '0.8em', color: '#999' }}>
      Unsupported type: {type} ({JSON.stringify(value)})
    </div>
  );
};
