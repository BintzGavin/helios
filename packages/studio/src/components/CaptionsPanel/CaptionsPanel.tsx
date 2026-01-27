import React, { ChangeEvent } from 'react';
import { parseSrt, CaptionCue } from '@helios-project/core';
import { useStudio } from '../../context/StudioContext';
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

export const CaptionsPanel: React.FC = () => {
  const { playerState, controller } = useStudio();
  const captions: CaptionCue[] = playerState.captions || [];

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        try {
          const cues = parseSrt(text);

          if (controller) {
            // Attempt to use DirectController's instance if available
            if ('instance' in controller && typeof (controller as any).instance.setCaptions === 'function') {
              (controller as any).instance.setCaptions(cues);
            } else {
              // Fallback to inputProps
              controller.setInputProps({
                ...playerState.inputProps,
                captions: cues
              });
            }
          }
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
      if (controller) {
        if ('instance' in controller && typeof (controller as any).instance.setCaptions === 'function') {
          (controller as any).instance.setCaptions([]);
        } else {
          controller.setInputProps({
            ...playerState.inputProps,
            captions: []
          });
        }
      }
  };

  return (
    <div className="captions-panel">
      <h2>Captions</h2>

      <div className="upload-section">
        <label>Import SRT</label>
        <input
          type="file"
          accept=".srt"
          onChange={handleFileUpload}
          className="file-input"
        />
        {captions.length > 0 && (
            <button
                onClick={handleClear}
                style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    background: '#d32f2f',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                    fontSize: '12px'
                }}
            >
                Clear Captions
            </button>
        )}
      </div>

      <div className="captions-list">
        {captions.length === 0 ? (
          <div className="no-captions">No captions loaded</div>
        ) : (
          captions.map((cue, index) => (
            <div key={index} className="caption-item">
              <div className="caption-time">
                {formatTime(cue.startTime)} - {formatTime(cue.endTime)}
              </div>
              <div className="caption-text">{cue.text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
