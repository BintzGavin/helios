import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Omnibar } from './Omnibar';
import * as StudioContext from '../context/StudioContext';
import * as ToastContext from '../context/ToastContext';

// Mock contexts
vi.mock('../context/StudioContext', () => ({
  useStudio: vi.fn(),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: vi.fn(),
}));

describe('Omnibar', () => {
  const mockSetOmnibarOpen = vi.fn();
  const mockSetActiveComposition = vi.fn();
  const mockToggleLoop = vi.fn();
  const mockTakeSnapshot = vi.fn();
  const mockStartRender = vi.fn();
  const mockSetCreateOpen = vi.fn();
  const mockSetDuplicateOpen = vi.fn();
  const mockSetSettingsOpen = vi.fn();
  const mockSetHelpOpen = vi.fn();
  const mockSetDiagnosticsOpen = vi.fn();
  const mockSetAssistantOpen = vi.fn();
  const mockAddToast = vi.fn();

  const defaultStudioContext = {
    isOmnibarOpen: false,
    setOmnibarOpen: mockSetOmnibarOpen,
    compositions: [],
    assets: [],
    setActiveComposition: mockSetActiveComposition,
    toggleLoop: mockToggleLoop,
    takeSnapshot: mockTakeSnapshot,
    startRender: mockStartRender,
    activeComposition: { id: '1', name: 'Active Comp' },
    setCreateOpen: mockSetCreateOpen,
    setDuplicateOpen: mockSetDuplicateOpen,
    setSettingsOpen: mockSetSettingsOpen,
    setHelpOpen: mockSetHelpOpen,
    setDiagnosticsOpen: mockSetDiagnosticsOpen,
    setAssistantOpen: mockSetAssistantOpen,
  };

  const defaultToastContext = {
    addToast: mockAddToast,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (StudioContext.useStudio as any).mockReturnValue(defaultStudioContext);
    (ToastContext.useToast as any).mockReturnValue(defaultToastContext);
  });

  it('renders nothing when isOmnibarOpen is false', () => {
    const { container } = render(<Omnibar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders correctly when open', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: true,
    });

    render(<Omnibar />);

    expect(screen.getByPlaceholderText('Search commands, compositions, and assets...')).toBeInTheDocument();
    // Check for default commands
    expect(screen.getByText('Create Composition')).toBeInTheDocument();
    expect(screen.getByText('Toggle Loop')).toBeInTheDocument();
  });

  it('filters items based on search query', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: true,
      compositions: [{ id: '1', name: 'My Video', description: '1080p' }],
      assets: [{ id: 'a1', name: 'logo.png', relativePath: 'assets/logo.png', type: 'image' }],
    });

    render(<Omnibar />);

    const input = screen.getByPlaceholderText('Search commands, compositions, and assets...');

    // Search for "1080p" (matches composition description)
    fireEvent.change(input, { target: { value: '1080p' } });
    expect(screen.getByText('My Video')).toBeInTheDocument();
    expect(screen.queryByText('logo.png')).not.toBeInTheDocument();
    expect(screen.queryByText('Create Composition')).not.toBeInTheDocument();

    // Search for "logo"
    fireEvent.change(input, { target: { value: 'logo' } });
    expect(screen.getByText('logo.png')).toBeInTheDocument();
    expect(screen.queryByText('My Video')).not.toBeInTheDocument();
  });

  it('executes command action on click', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: true,
    });

    render(<Omnibar />);

    const loopCommand = screen.getByText('Toggle Loop');
    fireEvent.click(loopCommand);

    expect(mockToggleLoop).toHaveBeenCalled();
    expect(mockSetOmnibarOpen).toHaveBeenCalledWith(false);
  });

  it('executes composition action (set active)', () => {
    const comp = { id: 'c1', name: 'Intro', description: 'desc' };
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: true,
      compositions: [comp],
    });

    render(<Omnibar />);

    fireEvent.click(screen.getByText('Intro'));

    expect(mockSetActiveComposition).toHaveBeenCalledWith(comp);
    expect(mockSetOmnibarOpen).toHaveBeenCalledWith(false);
  });

  it('executes asset action (copy path)', () => {
    const asset = { id: 'a1', name: 'test.mp4', relativePath: 'assets/test.mp4', type: 'video' };
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: true,
      assets: [asset],
    });

    // Mock clipboard API
    const writeTextMock = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<Omnibar />);

    // Filter to find it easily
    const input = screen.getByPlaceholderText('Search commands, compositions, and assets...');
    fireEvent.change(input, { target: { value: 'test.mp4' } });

    fireEvent.click(screen.getByText('test.mp4'));

    expect(writeTextMock).toHaveBeenCalledWith('assets/test.mp4');
    expect(mockAddToast).toHaveBeenCalledWith('Path copied to clipboard', 'success');
  });

  it('navigates with arrow keys and selects with Enter', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: true,
    });

    render(<Omnibar />);

    // Default list has commands. First one should be selected by default (index 0).
    // Let's assume the order: Create Composition, Duplicate..., etc.

    // Press Down Arrow
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    // Press Enter
    fireEvent.keyDown(window, { key: 'Enter' });

    // Should have triggered the SECOND item's action (Duplicate Composition)
    expect(mockSetDuplicateOpen).toHaveBeenCalled();
    expect(mockSetOmnibarOpen).toHaveBeenCalledWith(false);
  });

  it('closes on Escape', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: true,
    });

    render(<Omnibar />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(mockSetOmnibarOpen).toHaveBeenCalledWith(false);
  });

  it('closes on overlay click', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: true,
    });

    const { container } = render(<Omnibar />);
    const overlay = container.querySelector('.omnibar-overlay');

    if (overlay) {
        fireEvent.click(overlay);
        expect(mockSetOmnibarOpen).toHaveBeenCalledWith(false);
    } else {
        throw new Error('Overlay not found');
    }
  });

  it('does not close when clicking container', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: true,
    });

    const { container } = render(<Omnibar />);
    const content = container.querySelector('.omnibar-container');

    if (content) {
        fireEvent.click(content);
        expect(mockSetOmnibarOpen).not.toHaveBeenCalled();
    } else {
        throw new Error('Container not found');
    }
  });
});
