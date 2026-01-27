import React, { ChangeEvent } from 'react';
import { parseSrt, CaptionCue } from '@helios-project/core';
import { useStudio } from '../../context/StudioContext';
import { stringifySrt } from '../../utils/srt';
import './CaptionsPanel.css';

const formatTime = (ms: number) => {
  // Simple formatter for mm:ss.ms or hh:mm:ss.ms
  const date = new Date(ms);
  // Extract UTC parts
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  const milliseconds = date.getUTCMilliseconds().toString().padStart(3, '0');

  if (hours === '00') {
      return `${minutes}:${seconds}.${milliseconds}`;
  }
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};

const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(':');
    let seconds = 0;
    if (parts.length === 3) {
        seconds += parseInt(parts[0]) * 3600;
        seconds += parseInt(parts[1]) * 60;
        seconds += parseFloat(parts[2]);
    } else if (parts.length === 2) {
        seconds += parseInt(parts[0]) * 60;
        seconds += parseFloat(parts[1]);
    } else {
        // Fallback: try parsing as simple seconds or milliseconds?
        // Let's assume input is valid-ish. If fail, return NaN
        const val = parseFloat(timeStr);
        if (!isNaN(val)) return Math.round(val * 1000); // treat as seconds?
        return 0;
    }
    return Math.round(seconds * 1000);
};

export const CaptionsPanel: React.FC = () => {
  const { playerState, controller } = useStudio();
  const captions: CaptionCue[] = playerState.captions || [];

  const updateCaptions = (newCaptions: CaptionCue[]) => {
      // Sort by startTime
      newCaptions.sort((a, b) => a.startTime - b.startTime);

      if (controller) {
          if ('instance' in controller && typeof (controller as any).instance.setCaptions === 'function') {
              (controller as any).instance.setCaptions(newCaptions);
          } else {
              controller.setInputProps({
                  ...playerState.inputProps,
                  captions: newCaptions
              });
          }
      }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        try {
          const cues = parseSrt(text);
          updateCaptions(cues);
        } catch (err) {
          console.error("Failed to parse SRT", err);
          alert("Failed to parse SRT file.");
        }
      }
    };
    reader.readAsText(file);
    // Reset value to allow re-uploading same file
    event.target.value = '';
  };

  const handleClear = () => {
      updateCaptions([]);
  };

  const handleExport = () => {
    if (captions.length === 0) return;
    const srtContent = stringifySrt(captions);
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'captions.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAdd = () => {
      const currentTime = Math.round((playerState.currentFrame / playerState.fps) * 1000) || 0;
      const newCue: CaptionCue = {
          startTime: currentTime,
          endTime: currentTime + 2000,
          text: "New Caption"
      };
      updateCaptions([...captions, newCue]);
  };

  const handleUpdate = (index: number, field: keyof CaptionCue, value: string) => {
      const updated = [...captions];
      let newValue: string | number = value;

      if (field === 'startTime' || field === 'endTime') {
          newValue = parseTime(value);
      }

      updated[index] = { ...updated[index], [field]: newValue };
      updateCaptions(updated);
  };

  const handleDelete = (index: number) => {
      const updated = captions.filter((_, i) => i !== index);
      updateCaptions(updated);
  };

  return (
    <div className="captions-panel">
      <div className="captions-header">
        <h2>Captions</h2>
        <div className="captions-actions">
             <button onClick={handleAdd} className="add-button">
                + Add
             </button>
             {captions.length > 0 && (
                <>
                  <button onClick={handleExport} className="clear-button" title="Download SRT">
                      Export SRT
                  </button>
                  <button onClick={handleClear} className="clear-button">
                      Clear
                  </button>
                </>
            )}
        </div>
      </div>

      <div className="upload-section">
        <label>Import SRT</label>
        <input
          type="file"
          accept=".srt"
          onChange={handleFileUpload}
          className="file-input"
        />
      </div>

      <div className="captions-list">
        {captions.length === 0 ? (
          <div className="no-captions">No captions loaded</div>
        ) : (
          captions.map((cue, index) => (
            <div key={index} className="caption-item">
              <div className="caption-times">
                <input
                    className="time-input"
                    defaultValue={formatTime(cue.startTime)}
                    onBlur={(e) => handleUpdate(index, 'startTime', e.target.value)}
                    key={`start-${index}-${cue.startTime}`} // force re-render on external update
                />
                <span className="time-separator">-</span>
                <input
                    className="time-input"
                    defaultValue={formatTime(cue.endTime)}
                    onBlur={(e) => handleUpdate(index, 'endTime', e.target.value)}
                    key={`end-${index}-${cue.endTime}`}
                />
              </div>
              <div className="caption-content">
                  <textarea
                    className="text-input"
                    defaultValue={cue.text}
                    onBlur={(e) => handleUpdate(index, 'text', e.target.value)}
                    rows={2}
                    key={`text-${index}-${cue.text}`}
                  />
                  <button
                    className="delete-button"
                    onClick={() => handleDelete(index)}
                    title="Delete caption"
                  >
                    ×
                  </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
