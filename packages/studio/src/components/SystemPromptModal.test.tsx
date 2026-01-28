import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SystemPromptModal } from './SystemPromptModal';
import * as StudioContext from '../context/StudioContext';

// Mock the context
vi.mock('../context/StudioContext', () => ({
  useStudio: vi.fn(),
}));

// Mock the ai-context
vi.mock('../data/ai-context', () => ({
  HELIOS_SYSTEM_PROMPT: 'MOCK_SYSTEM_PROMPT',
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('SystemPromptModal', () => {
  const mockSetPromptOpen = vi.fn();

  const defaultContext = {
    isPromptOpen: false,
    setPromptOpen: mockSetPromptOpen,
    activeComposition: { name: 'Test Comp' },
    playerState: { schema: { test: 'schema' } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (StudioContext.useStudio as any).mockReturnValue(defaultContext);
  });

  it('renders nothing when isPromptOpen is false', () => {
    const { container } = render(<SystemPromptModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the modal when isPromptOpen is true', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      isPromptOpen: true,
    });

    render(<SystemPromptModal />);

    expect(screen.getByText('AI System Prompt')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument(); // textarea
    expect(screen.getByText('Copy to Clipboard')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('generates the correct prompt', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      isPromptOpen: true,
    });

    render(<SystemPromptModal />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toContain('MOCK_SYSTEM_PROMPT');
    expect(textarea.value).toContain('Composition: Test Comp');
    expect(textarea.value).toContain('"test": "schema"');
  });

  it('closes when close button is clicked', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      isPromptOpen: true,
    });

    render(<SystemPromptModal />);

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(mockSetPromptOpen).toHaveBeenCalledWith(false);
  });

  it('copies to clipboard when copy button is clicked', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      isPromptOpen: true,
    });

    render(<SystemPromptModal />);

    const copyButton = screen.getByText('Copy to Clipboard');
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(textarea.value);
  });
});
