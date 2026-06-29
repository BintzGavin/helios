import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CaptionsPanel } from './CaptionsPanel';
import * as StudioContext from '../../context/StudioContext';

// Mock the context
vi.mock('../../context/StudioContext', () => ({
  useStudio: vi.fn(),
}));

describe('CaptionsPanel', () => {
  const mockSetInputProps = vi.fn();
  const mockSetCaptions = vi.fn();

  const defaultPlayerState = {
    currentFrame: 30, // 1 second
    duration: 10,
    fps: 30,
    playbackRate: 1,
    isPlaying: false,
    inputProps: {},
    captions: []
  };

  const defaultContext = {
    controller: {
        setInputProps: mockSetInputProps,
        instance: {
            setCaptions: mockSetCaptions
        }
    },
    playerState: defaultPlayerState,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (StudioContext.useStudio as any).mockReturnValue(defaultContext);
  });

  it('renders "No captions loaded" when empty', () => {
    render(<CaptionsPanel />);
    expect(screen.getByText('No captions loaded')).toBeInTheDocument();
  });

  it('renders existing captions correctly', () => {
    const captions = [
        { id: '1', startTime: 0, endTime: 1000, text: 'Hello' },
        { id: '2', startTime: 2000, endTime: 3000, text: 'World' }
    ];

    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, captions }
    });

    render(<CaptionsPanel />);

    expect(screen.getByDisplayValue('Hello')).toBeInTheDocument();
    expect(screen.getByDisplayValue('World')).toBeInTheDocument();
    // 0ms -> 00:00.000
    expect(screen.getByDisplayValue('00:00.000')).toBeInTheDocument();
    // 1000ms -> 00:01.000
    expect(screen.getByDisplayValue('00:01.000')).toBeInTheDocument();
  });

  it('adds a new caption when Add button is clicked', () => {
     render(<CaptionsPanel />);
     const addButton = screen.getByText('+ Add');
     fireEvent.click(addButton);

     // Should call setCaptions with one new caption
     expect(mockSetCaptions).toHaveBeenCalledTimes(1);
     const newCaptions = mockSetCaptions.mock.calls[0][0];
     expect(newCaptions).toHaveLength(1);
     expect(newCaptions[0].text).toBe('New Caption');
     expect(newCaptions[0].startTime).toBe(1000); // 30 frames @ 30fps = 1000ms
  });

  it('updates a caption on blur', () => {
    const captions = [
        { id: '1', startTime: 0, endTime: 1000, text: 'Hello' }
    ];

    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, captions }
    });

    render(<CaptionsPanel />);

    const textInput = screen.getByDisplayValue('Hello');
    fireEvent.change(textInput, { target: { value: 'Hello Updated' } });
    fireEvent.blur(textInput);

    expect(mockSetCaptions).toHaveBeenCalledTimes(1);
    const updated = mockSetCaptions.mock.calls[0][0];
    expect(updated[0].text).toBe('Hello Updated');
  });

  it('formats hours correctly', () => {
    const captions = [
        { id: '1', startTime: 3600000, endTime: 3601000, text: 'Hello' } // 1 hour
    ];

    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, captions }
    });

    render(<CaptionsPanel />);

    // 3600000ms -> 01:00:00.000
    expect(screen.getByDisplayValue('01:00:00.000')).toBeInTheDocument();
    // 3601000ms -> 01:00:01.000
    expect(screen.getByDisplayValue('01:00:01.000')).toBeInTheDocument();
  });

  it('updates time on blur parsing hh:mm:ss', () => {
    const captions = [
        { id: '1', startTime: 0, endTime: 1000, text: 'Hello' }
    ];
    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, captions }
    });

    render(<CaptionsPanel />);

    const startInputs = screen.getAllByDisplayValue('00:00.000');
    // start time input
    fireEvent.change(startInputs[0], { target: { value: '01:02:03.456' } });
    fireEvent.blur(startInputs[0]);

    expect(mockSetCaptions).toHaveBeenCalledTimes(1);
    const updated = mockSetCaptions.mock.calls[0][0];
    // 1h = 3600s, 2m = 120s, 3.456s => 3723.456s => 3723456ms
    expect(updated[0].startTime).toBe(3723456);
  });

  it('updates time on blur parsing mm:ss', () => {
    const captions = [
        { id: '1', startTime: 0, endTime: 1000, text: 'Hello' }
    ];
    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, captions }
    });

    render(<CaptionsPanel />);

    const startInputs = screen.getAllByDisplayValue('00:00.000');
    fireEvent.change(startInputs[0], { target: { value: '02:03.456' } });
    fireEvent.blur(startInputs[0]);

    expect(mockSetCaptions).toHaveBeenCalledTimes(1);
    const updated = mockSetCaptions.mock.calls[0][0];
    // 2m = 120s, 3.456s => 123.456s => 123456ms
    expect(updated[0].startTime).toBe(123456);
  });

  it('updates time on blur parsing fallback', () => {
    const captions = [
        { id: '1', startTime: 0, endTime: 1000, text: 'Hello' }
    ];
    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, captions }
    });

    render(<CaptionsPanel />);

    const startInputs = screen.getAllByDisplayValue('00:00.000');
    fireEvent.change(startInputs[0], { target: { value: '123.456' } });
    fireEvent.blur(startInputs[0]);

    expect(mockSetCaptions).toHaveBeenCalledTimes(1);
    const updated = mockSetCaptions.mock.calls[0][0];
    expect(updated[0].startTime).toBe(123456);
  });

  it('updates end time on blur parsing hh:mm:ss', () => {
    const captions = [
        { id: '1', startTime: 0, endTime: 1000, text: 'Hello' }
    ];
    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, captions }
    });

    render(<CaptionsPanel />);

    const endInputs = screen.getAllByDisplayValue('00:01.000');
    fireEvent.change(endInputs[0], { target: { value: '01:02:03.456' } });
    fireEvent.blur(endInputs[0]);

    expect(mockSetCaptions).toHaveBeenCalledTimes(1);
    const updated = mockSetCaptions.mock.calls[0][0];
    // 1h = 3600s, 2m = 120s, 3.456s => 3723.456s => 3723456ms
    expect(updated[0].endTime).toBe(3723456);
  });

  it('updates time on blur parsing fallback invalid', () => {
    const captions = [
        { id: '1', startTime: 0, endTime: 1000, text: 'Hello' }
    ];
    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, captions }
    });

    render(<CaptionsPanel />);

    const startInputs = screen.getAllByDisplayValue('00:00.000');
    fireEvent.change(startInputs[0], { target: { value: 'invalid' } });
    fireEvent.blur(startInputs[0]);

    expect(mockSetCaptions).toHaveBeenCalledTimes(1);
    const updated = mockSetCaptions.mock.calls[0][0];
    expect(updated[0].startTime).toBe(0);
  });

  it('clears captions', () => {
    const captions = [
        { id: '1', startTime: 0, endTime: 1000, text: 'Hello' }
    ];

    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, captions }
    });

    render(<CaptionsPanel />);

    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    expect(mockSetCaptions).toHaveBeenCalledWith([]);
  });

  it('handles file upload success', () => {
    render(<CaptionsPanel />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['1\n00:00:01,000 --> 00:00:02,000\nTest caption'], 'test.srt', { type: 'text/plain' });

    // Mock FileReader
    const readAsTextMock = vi.fn();
    const originalFileReader = global.FileReader;
    global.FileReader = class {
      onload: any;
      readAsText(file: Blob) {
        readAsTextMock(file);
        if (this.onload) {
          this.onload({ target: { result: '1\n00:00:01,000 --> 00:00:02,000\nTest caption' } } as any);
        }
      }
    } as any;

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(readAsTextMock).toHaveBeenCalledWith(file);
    expect(mockSetCaptions).toHaveBeenCalledTimes(1);
    const updated = mockSetCaptions.mock.calls[0][0];
    expect(updated[0].text).toBe('Test caption');

    global.FileReader = originalFileReader;
  });

  it('handles file upload missing file', () => {
    render(<CaptionsPanel />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [] } });

    expect(mockSetCaptions).not.toHaveBeenCalled();
  });

  it('handles file upload parse error', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<CaptionsPanel />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['invalid srt'], 'test.srt', { type: 'text/plain' });

    const readAsTextMock = vi.fn();
    const originalFileReader = global.FileReader;
    global.FileReader = class {
      onload: any;
      readAsText(file: Blob) {
        readAsTextMock(file);
        if (this.onload) {
          // This should trigger parseSrt which will throw an error for invalid SRT
          this.onload({ target: { result: 'invalid srt content' } } as any);
        }
      }
    } as any;

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(alertSpy).toHaveBeenCalledWith('Failed to parse SRT file.');
    expect(consoleSpy).toHaveBeenCalled();
    expect(mockSetCaptions).not.toHaveBeenCalled();

    alertSpy.mockRestore();
    consoleSpy.mockRestore();
    global.FileReader = originalFileReader;
  });

  it('deletes a caption', () => {
    const captions = [
        { id: '1', startTime: 0, endTime: 1000, text: 'Hello' }
    ];

    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, captions }
    });

    render(<CaptionsPanel />);

    const deleteButton = screen.getByTitle('Delete caption');
    fireEvent.click(deleteButton);

    expect(mockSetCaptions).toHaveBeenCalledWith([]);
  });

  it('falls back to setInputProps if setCaptions is missing', () => {
      const contextWithoutInstance = {
          ...defaultContext,
          controller: {
              setInputProps: mockSetInputProps,
              // No instance
          }
      };

      (StudioContext.useStudio as any).mockReturnValue(contextWithoutInstance);

      render(<CaptionsPanel />);
      const addButton = screen.getByText('+ Add');
      fireEvent.click(addButton);

      expect(mockSetInputProps).toHaveBeenCalledTimes(1);
      const props = mockSetInputProps.mock.calls[0][0];
      expect(props.captions).toHaveLength(1);
  });

  it('exports captions as SRT', () => {
    const captions = [
        { id: '1', startTime: 0, endTime: 1000, text: 'Hello' },
        { id: '2', startTime: 2000, endTime: 3000, text: 'World' }
    ];

    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, captions }
    });

    const createObjectURLMock = vi.fn(() => 'blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    // Spy on anchor click
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement');

    createElementSpy.mockImplementation((tagName, options) => {
        if (tagName === 'a') {
            return {
                href: '',
                download: '',
                click: clickSpy,
                style: {},
                remove: vi.fn()
            } as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tagName, options);
    });

    render(<CaptionsPanel />);
    const exportButton = screen.getByText('Export SRT');
    fireEvent.click(exportButton);

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    const blob = (createObjectURLMock.mock.calls[0] as any)[0];
    expect(blob).toBeInstanceOf(Blob);

    // Verify click was called on the anchor
    expect(clickSpy).toHaveBeenCalledTimes(1);

    // Restore spies
    createElementSpy.mockRestore();
    // No easy way to restore global.URL in this scope if it wasn't there before,
    // but tests run in isolation usually.
  });
});
