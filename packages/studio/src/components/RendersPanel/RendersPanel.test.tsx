// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RendersPanel } from './RendersPanel';
import { useStudio, RenderJob, Composition, RenderConfig } from '../../context/StudioContext';

// Mock dependencies
vi.mock('../../context/StudioContext');

// Mock RenderConfig component to simplify testing
vi.mock('./RenderConfig', () => ({
  RenderConfig: ({ config, onChange }: any) => (
    <div data-testid="render-config">
      RenderConfig Mock
      <input
        data-testid="mode-select"
        value={config.mode}
        onChange={(e) => onChange({ ...config, mode: e.target.value })}
      />
    </div>
  )
}));

describe('RendersPanel', () => {
  const mockStartRender = vi.fn();
  const mockCancelRender = vi.fn();
  const mockDeleteRender = vi.fn();
  const mockSetRenderConfig = vi.fn();
  const mockExportVideo = vi.fn();
  const mockCancelExport = vi.fn();
  const mockSetPreviewUrl = vi.fn();
  const mockExportJobSpec = vi.fn();

  const mockActiveComposition: Composition = {
    id: 'comp-1',
    name: 'Test Composition',
    url: '/src/test.ts',
    metadata: { width: 1920, height: 1080, fps: 30, duration: 10 }
  };

  const mockRenderConfig: RenderConfig = {
    mode: 'canvas',
    concurrency: 1
  };

  const defaultContext = {
    renderJobs: [],
    startRender: mockStartRender,
    activeComposition: mockActiveComposition,
    inPoint: 0,
    outPoint: 300,
    renderConfig: mockRenderConfig,
    setRenderConfig: mockSetRenderConfig,
    cancelRender: mockCancelRender,
    deleteRender: mockDeleteRender,
    isExporting: false,
    exportProgress: 0,
    exportVideo: mockExportVideo,
    cancelExport: mockCancelExport,
    setPreviewUrl: mockSetPreviewUrl,
    exportJobSpec: mockExportJobSpec
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStudio as any).mockReturnValue(defaultContext);
  });

  it('renders client-side export section correctly', () => {
    render(<RendersPanel />);
    expect(screen.getByText('Client-Side Export')).toBeDefined();
    expect(screen.getByText('Export')).toBeDefined();
    expect(screen.getByRole('combobox')).toHaveValue('mp4');
  });

  it('triggers client-side export on button click', () => {
    render(<RendersPanel />);
    const exportBtn = screen.getByText('Export');
    fireEvent.click(exportBtn);
    expect(mockExportVideo).toHaveBeenCalledWith('mp4');
  });

  it('allows changing export format', () => {
    render(<RendersPanel />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'webm' } });

    const exportBtn = screen.getByText('Export');
    fireEvent.click(exportBtn);
    expect(mockExportVideo).toHaveBeenCalledWith('webm');
  });

  it('shows cancel button and progress during export', () => {
    (useStudio as any).mockReturnValue({
      ...defaultContext,
      isExporting: true,
      exportProgress: 0.5
    });

    const { container } = render(<RendersPanel />);
    expect(screen.getByText('Cancel')).toBeDefined();
    expect(screen.queryByText('Export')).toBeNull(); // Export button should be hidden/replaced

    // Check progress bar width (inline style)
    const progressBar = container.querySelector('.render-progress-fill');
    expect(progressBar).toHaveStyle('width: 50%');

    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(mockCancelExport).toHaveBeenCalled();
  });

  it('renders server-side render section correctly', () => {
    render(<RendersPanel />);
    expect(screen.getByText('Server-Side Render')).toBeDefined();
    expect(screen.getByTestId('render-config')).toBeDefined();
    expect(screen.getByText('Start Render Job')).toBeDefined();
    expect(screen.getByText('Export Spec')).toBeDefined();
  });

  it('triggers start render on button click', () => {
    render(<RendersPanel />);
    const startBtn = screen.getByText('Start Render Job');
    fireEvent.click(startBtn);
    expect(mockStartRender).toHaveBeenCalledWith('comp-1', { inPoint: 0, outPoint: 300 });
  });

  it('triggers export spec on button click', () => {
    render(<RendersPanel />);
    const exportSpecBtn = screen.getByText('Export Spec');
    fireEvent.click(exportSpecBtn);
    expect(mockExportJobSpec).toHaveBeenCalled();
  });

  it('disables buttons when no active composition', () => {
    (useStudio as any).mockReturnValue({
      ...defaultContext,
      activeComposition: null
    });

    render(<RendersPanel />);

    const exportBtn = screen.getByText('Export');
    const startBtn = screen.getByText('Start Render Job');
    const exportSpecBtn = screen.getByText('Export Spec');

    expect(exportBtn).toBeDisabled();
    expect(startBtn).toBeDisabled();
    expect(exportSpecBtn).toBeDisabled();
  });

  it('renders empty state for jobs', () => {
    render(<RendersPanel />);
    expect(screen.getByText('No render jobs.')).toBeDefined();
  });

  it('renders job list with statuses', () => {
    const mockJobs: RenderJob[] = [
      {
        id: 'job-1',
        status: 'queued',
        progress: 0,
        compositionId: 'comp-1',
        createdAt: Date.now()
      },
      {
        id: 'job-2',
        status: 'rendering',
        progress: 0.5,
        compositionId: 'comp-1',
        createdAt: Date.now()
      },
      {
        id: 'job-3',
        status: 'completed',
        progress: 1,
        compositionId: 'comp-1',
        outputUrl: '/output/job-3.mp4',
        createdAt: Date.now()
      },
      {
        id: 'job-4',
        status: 'failed',
        progress: 0,
        compositionId: 'comp-1',
        error: 'Render failed',
        createdAt: Date.now()
      }
    ];

    (useStudio as any).mockReturnValue({
      ...defaultContext,
      renderJobs: mockJobs
    });

    render(<RendersPanel />);

    expect(screen.getByText('queued')).toBeDefined();
    expect(screen.getByText('rendering')).toBeDefined();
    expect(screen.getByText('Done')).toBeDefined(); // 'completed' renders as 'Done'
    expect(screen.getByText('Failed')).toBeDefined();
  });

  it('allows cancelling queued/rendering jobs', () => {
    const mockJobs: RenderJob[] = [
      {
        id: 'job-1',
        status: 'queued',
        progress: 0,
        compositionId: 'comp-1',
        createdAt: Date.now()
      }
    ];

    (useStudio as any).mockReturnValue({
      ...defaultContext,
      renderJobs: mockJobs
    });

    render(<RendersPanel />);
    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(mockCancelRender).toHaveBeenCalledWith('job-1');
  });

  it('allows deleting completed/failed jobs', () => {
    const mockJobs: RenderJob[] = [
      {
        id: 'job-3',
        status: 'completed',
        progress: 1,
        compositionId: 'comp-1',
        outputUrl: '/output/job-3.mp4',
        createdAt: Date.now()
      }
    ];

    (useStudio as any).mockReturnValue({
      ...defaultContext,
      renderJobs: mockJobs
    });

    render(<RendersPanel />);
    const deleteBtn = screen.getByTitle('Delete Job');
    fireEvent.click(deleteBtn);
    expect(mockDeleteRender).toHaveBeenCalledWith('job-3');
  });

  it('shows preview and download buttons for completed jobs', () => {
    const mockJobs: RenderJob[] = [
      {
        id: 'job-3',
        status: 'completed',
        progress: 1,
        compositionId: 'comp-1',
        outputUrl: '/output/job-3.mp4',
        createdAt: Date.now()
      }
    ];

    (useStudio as any).mockReturnValue({
      ...defaultContext,
      renderJobs: mockJobs
    });

    render(<RendersPanel />);

    const previewBtn = screen.getByText('Preview');
    const downloadLink = screen.getByText('Download');

    expect(previewBtn).toBeDefined();
    expect(downloadLink).toHaveAttribute('href', '/output/job-3.mp4');
    expect(downloadLink).toHaveAttribute('download');

    fireEvent.click(previewBtn);
    expect(mockSetPreviewUrl).toHaveBeenCalledWith('/output/job-3.mp4');
  });

  it('shows error details for failed jobs', () => {
    const mockJobs: RenderJob[] = [
      {
        id: 'job-4',
        status: 'failed',
        progress: 0,
        compositionId: 'comp-1',
        error: 'Out of memory',
        createdAt: Date.now()
      }
    ];

    (useStudio as any).mockReturnValue({
      ...defaultContext,
      renderJobs: mockJobs
    });

    render(<RendersPanel />);

    // Error details are in a details/summary block
    expect(screen.getByText('Show Error')).toBeDefined();
    // The error text might be hidden or visible depending on details state,
    // but it should be in the document.
    expect(screen.getByText('Out of memory')).toBeDefined();
  });
});
