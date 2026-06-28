import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Omnibar, getIconForType, getAssetIcon } from './Omnibar';
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

    // Search for something that yields no results
    fireEvent.change(input, { target: { value: 'notfound12345' } });
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('ignores keyboard shortcuts when omnibar is closed', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: false,
    });

    // We render it (it returns null for UI, but the hooks still run)
    render(<Omnibar />);

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(mockSetOmnibarOpen).not.toHaveBeenCalled();
    expect(mockSetDuplicateOpen).not.toHaveBeenCalled();
  });

  it('renders all asset and command icons correctly', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: true,
      assets: [
        { id: 'a1', name: 'img', relativePath: 'img', type: 'image' },
        { id: 'a2', name: 'vid', relativePath: 'vid', type: 'video' },
        { id: 'a3', name: 'aud', relativePath: 'aud', type: 'audio' },
        { id: 'a4', name: 'fnt', relativePath: 'fnt', type: 'font' },
        { id: 'a5', name: 'mdl', relativePath: 'mdl', type: 'model' },
        { id: 'a6', name: 'jsn', relativePath: 'jsn', type: 'json' },
        { id: 'a7', name: 'shd', relativePath: 'shd', type: 'shader' },
        { id: 'a8', name: 'unk', relativePath: 'unk', type: 'unknown' },
      ],
    });
    render(<Omnibar />);
    expect(screen.getByText('🖼️')).toBeInTheDocument();
    expect(screen.getByText('🎥')).toBeInTheDocument();
    expect(screen.getByText('🔊')).toBeInTheDocument();
    expect(screen.getByText('🔤')).toBeInTheDocument();
    expect(screen.getByText('🧊')).toBeInTheDocument();
    expect(screen.getByText('{}')).toBeInTheDocument();
    expect(screen.getByText('🔮')).toBeInTheDocument();
    expect(screen.getByText('📄')).toBeInTheDocument();
  });

  it('executes all commands on click', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: true,
    });

    render(<Omnibar />);

    fireEvent.click(screen.getByText('Create Composition'));
    expect(mockSetCreateOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByText('Composition Settings'));
    expect(mockSetSettingsOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByText('Keyboard Shortcuts'));
    expect(mockSetHelpOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByText('Diagnostics'));
    expect(mockSetDiagnosticsOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByText('Helios Assistant'));
    expect(mockSetAssistantOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByText('Take Snapshot'));
    expect(mockTakeSnapshot).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Start Render'));
    expect(mockStartRender).toHaveBeenCalledWith('1');
  });

  it('changes selected index on hover', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: true,
      compositions: [
        { id: 'c1', name: 'comp', description: 'comp' },
      ],
    });

    render(<Omnibar />);
    const items = screen.getAllByRole('generic').filter(el => el.classList.contains('omnibar-item'));
    // The first item is a command, the last is our comp
    const compItem = items[items.length - 1];
    fireEvent.mouseEnter(compItem);
    expect(compItem).toHaveClass('selected');
  });

  it('helper functions return correct values', () => {
    // getIconForType
    expect(getIconForType('command')).toBe('⚡️');
    expect(getIconForType('composition')).toBe('🎬');
    expect(getIconForType('asset')).toBe('📦');
    expect(getIconForType('unknown')).toBe('•');

    // getAssetIcon
    expect(getAssetIcon('image')).toBe('🖼️');
    expect(getAssetIcon('video')).toBe('🎥');
    expect(getAssetIcon('audio')).toBe('🔊');
    expect(getAssetIcon('font')).toBe('🔤');
    expect(getAssetIcon('model')).toBe('🧊');
    expect(getAssetIcon('json')).toBe('{}');
    expect(getAssetIcon('shader')).toBe('🔮');
    expect(getAssetIcon('unknown')).toBe('📄');
  });

  it('handles composition metadata and thumbnail gracefully', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: true,
      compositions: [
        { id: 'c1', name: 'NoDesc', metadata: { width: 1920, height: 1080, fps: 30 } },
        { id: 'c2', name: 'WithThumb', description: 'Has thumb', thumbnailUrl: 'http://test.com/thumb.jpg' }
      ],
    });

    const { container } = render(<Omnibar />);
    // Verify fallback description
    expect(screen.getByText('1920x1080 @ 30fps')).toBeInTheDocument();

    // Verify image rendered for thumbnail
    const img = container.querySelector('.omnibar-thumbnail');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'http://test.com/thumb.jpg');
  });

  it('does nothing when Enter is pressed and list is empty', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: true,
      compositions: [],
      assets: [],
    });

    render(<Omnibar />);
    const input = screen.getByPlaceholderText('Search commands, compositions, and assets...');

    // Search for non-existent item to empty the list
    fireEvent.change(input, { target: { value: 'notfound' } });

    // Press Enter - should not throw and should not close (action shouldn't execute)
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockSetOmnibarOpen).not.toHaveBeenCalled();
  });

  it('does not start render if activeComposition is null', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: true,
      activeComposition: null,
    });

    render(<Omnibar />);
    fireEvent.click(screen.getByText('Start Render'));
    expect(mockStartRender).not.toHaveBeenCalled();
  });

  it('prevents ArrowUp going below 0 and ArrowDown going past max', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultStudioContext,
      isOmnibarOpen: true,
    });

    render(<Omnibar />);

    // ArrowUp when at 0
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    // ArrowDown multiple times to reach end
    for (let i = 0; i < 20; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    // Press enter on the last item
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockSetOmnibarOpen).toHaveBeenCalledWith(false);
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
