import React, { useState, useEffect, useMemo } from 'react';
import { useStudio } from '../../context/StudioContext';
import { HELIOS_SYSTEM_PROMPT } from '../../data/ai-context';
import './AssistantModal.css';

interface DocSection {
  id: string;
  package: string;
  title: string;
  content: string;
}

export const AssistantModal: React.FC = () => {
  const { isAssistantOpen, setAssistantOpen, activeComposition, playerState } = useStudio();
  const [activeTab, setActiveTab] = useState<'ask' | 'docs'>('ask');
  const [docs, setDocs] = useState<DocSection[]>([]);

  // Ask AI State
  const [query, setQuery] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  // Docs State
  const [docSearch, setDocSearch] = useState('');
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isAssistantOpen && docs.length === 0) {
      fetch('/api/documentation')
        .then(res => res.json())
        .then(setDocs)
        .catch(console.error);
    }
  }, [isAssistantOpen, docs.length]);

  const generatePrompt = () => {
    if (!query.trim()) return;

    // 1. Find relevant docs
    const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);
    const relevantDocs = docs.filter(d => {
        const text = (d.title + ' ' + d.content).toLowerCase();
        return keywords.some(k => text.includes(k));
    }).slice(0, 3);

    // 2. Build Context
    let context = HELIOS_SYSTEM_PROMPT + '\n\n';

    context += `## Current Composition\n`;
    context += `Name: ${activeComposition?.name}\n`;
    if (playerState.schema) {
        context += `Schema: ${JSON.stringify(playerState.schema, null, 2)}\n`;
    }
    context += `\n`;

    if (relevantDocs.length > 0) {
        context += `## Relevant Documentation\n`;
        relevantDocs.forEach(d => {
            context += `### ${d.package}: ${d.title}\n${d.content}\n\n`;
        });
    }

    context += `## User Request\n${query}\n\n`;
    context += `Please provide a solution or code snippet.`;

    setGeneratedPrompt(context);
  };

  const toggleDoc = (id: string) => {
    const newSet = new Set(expandedDocs);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setExpandedDocs(newSet);
  };

  const filteredDocs = useMemo(() => {
    if (!docSearch) return docs;
    const lower = docSearch.toLowerCase();
    return docs.filter(d =>
        d.title.toLowerCase().includes(lower) ||
        d.content.toLowerCase().includes(lower) ||
        d.package.toLowerCase().includes(lower)
    );
  }, [docs, docSearch]);

  if (!isAssistantOpen) return null;

  return (
    <div className="assistant-modal-overlay" onClick={() => setAssistantOpen(false)}>
      <div className="assistant-modal-content" onClick={e => e.stopPropagation()}>
        <div className="assistant-header">
            <h2>✨ Helios Assistant</h2>
            <button className="assistant-close" onClick={() => setAssistantOpen(false)}>×</button>
        </div>

        <div className="assistant-tabs">
            <button
                className={`assistant-tab ${activeTab === 'ask' ? 'active' : ''}`}
                onClick={() => setActiveTab('ask')}
            >
                Ask AI
            </button>
            <button
                className={`assistant-tab ${activeTab === 'docs' ? 'active' : ''}`}
                onClick={() => setActiveTab('docs')}
            >
                Documentation
            </button>
        </div>

        <div className="assistant-body">
            {activeTab === 'ask' && (
                <div className="ask-ai-container">
                    <div className="ask-input-group">
                        <input
                            className="ask-input"
                            placeholder="How do I add audio?"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && generatePrompt()}
                        />
                        <button className="ask-button" onClick={generatePrompt}>
                            Generate Prompt
                        </button>
                    </div>

                    {generatedPrompt && (
                        <div className="prompt-result">
                            <label>Context-Aware Prompt (Copy to LLM)</label>
                            <textarea
                                className="prompt-textarea"
                                value={generatedPrompt}
                                readOnly
                            />
                            <div className="prompt-actions">
                                <button
                                    className="copy-button"
                                    onClick={() => navigator.clipboard.writeText(generatedPrompt)}
                                >
                                    Copy to Clipboard
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'docs' && (
                <div className="docs-container">
                    <input
                        className="docs-search"
                        placeholder="Search documentation..."
                        value={docSearch}
                        onChange={e => setDocSearch(e.target.value)}
                    />
                    <div className="docs-list">
                        {filteredDocs.map(doc => (
                            <div key={doc.id} className="doc-item">
                                <div className="doc-header" onClick={() => toggleDoc(doc.id)}>
                                    <div>
                                        <span className="doc-package">{doc.package}</span>
                                        <span className="doc-title">{doc.title}</span>
                                    </div>
                                    <span>{expandedDocs.has(doc.id) ? '−' : '+'}</span>
                                </div>
                                {expandedDocs.has(doc.id) && (
                                    <div className="doc-content">
                                        {doc.content}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
