import React, { useMemo } from 'react';
import { useStudio } from '../context/StudioContext';
import { HELIOS_SYSTEM_PROMPT } from '../data/ai-context';
import './SystemPromptModal.css';

export const SystemPromptModal: React.FC = () => {
  const { isPromptOpen, setPromptOpen, activeComposition, playerState } = useStudio();

  if (!isPromptOpen) return null;

  const prompt = useMemo(() => {
    const schemaStr = playerState.schema
      ? JSON.stringify(playerState.schema, null, 2)
      : 'No schema defined';

    return `${HELIOS_SYSTEM_PROMPT}

Current Task Context:
Composition: ${activeComposition?.name || 'Untitled'}
Props Schema:
${schemaStr}
`;
  }, [activeComposition, playerState.schema]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prompt);
    // Optional: could show a toast here
  };

  return (
    <div className="system-prompt-modal-overlay" onClick={() => setPromptOpen(false)}>
      <div className="system-prompt-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>AI System Prompt</h2>
        <p>Copy this prompt to ChatGPT, Claude, or Cursor to get context-aware help.</p>
        <textarea readOnly value={prompt} />
        <div className="system-prompt-modal-actions">
          <button className="primary-button" onClick={copyToClipboard}>Copy to Clipboard</button>
          <button className="secondary-button" onClick={() => setPromptOpen(false)}>Close</button>
        </div>
      </div>
    </div>
  );
};
