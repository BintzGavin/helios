// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DiagnosticsModal } from './DiagnosticsModal';
import { StudioContext } from '../context/StudioContext';
import { Helios } from '@helios-project/core';

// Mock Helios.diagnose
vi.mock('@helios-project/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@helios-project/core')>();
    return {
        ...actual,
        Helios: {
            ...actual.Helios,
            diagnose: vi.fn(),
        },
    };
});

describe('DiagnosticsModal', () => {
    const setDiagnosticsOpen = vi.fn();
    const mockClientReport = {
        webCodecs: true,
        waapi: true,
        offscreenCanvas: true,
        webgl: true,
        webgl2: true,
        webAudio: true,
        colorGamut: 'srgb',
        videoCodecs: { h264: true, vp8: true, vp9: true, av1: false },
        audioCodecs: { aac: true, opus: true },
        videoDecoders: { h264: true, vp8: true, vp9: true, av1: false },
        audioDecoders: { aac: true, opus: true },
        userAgent: 'TestClientAgent'
    };
    const mockServerReport = { ...mockClientReport, userAgent: 'TestServerAgent' };

    const renderWithContext = (isOpen = true) => {
        return render(
            <StudioContext.Provider value={{
                isDiagnosticsOpen: isOpen,
                setDiagnosticsOpen,
                // Mock other required context values with defaults
                compositions: [],
                activeComposition: null,
                setActiveComposition: vi.fn(),
                isOmnibarOpen: false,
                setOmnibarOpen: vi.fn(),
                isHelpOpen: false,
                setHelpOpen: vi.fn(),
                isAssistantOpen: false,
                setAssistantOpen: vi.fn(),
                isCreateOpen: false,
                setCreateOpen: vi.fn(),
                isDuplicateOpen: false,
                setDuplicateOpen: vi.fn(),
                duplicateTargetId: null,
                setDuplicateTargetId: vi.fn(),
                isSettingsOpen: false,
                setSettingsOpen: vi.fn(),
                createComposition: vi.fn(),
                duplicateComposition: vi.fn(),
                updateCompositionMetadata: vi.fn(),
                updateThumbnail: vi.fn(),
                deleteComposition: vi.fn(),
                templates: [],
                assets: [],
                uploadAsset: vi.fn(),
                deleteAsset: vi.fn(),
                renameAsset: vi.fn(),
                moveAsset: vi.fn(),
                createFolder: vi.fn(),
                renderJobs: [],
                startRender: vi.fn(),
                cancelRender: vi.fn(),
                deleteRender: vi.fn(),
                inPoint: 0,
                setInPoint: vi.fn(),
                outPoint: 0,
                setOutPoint: vi.fn(),
                controller: null,
                setController: vi.fn(),
                playerState: {} as any,
                setPlayerState: vi.fn(),
                loop: false,
                toggleLoop: vi.fn(),
                canvasSize: { width: 1920, height: 1080 },
                setCanvasSize: vi.fn(),
                renderConfig: { mode: 'canvas' },
                setRenderConfig: vi.fn(),
                takeSnapshot: vi.fn(),
                previewUrl: null,
                setPreviewUrl: vi.fn(),
                isExporting: false,
                exportProgress: 0,
                exportVideo: vi.fn(),
                cancelExport: vi.fn(),
                openInEditor: vi.fn(),
                exportJobSpec: vi.fn()
            } as any}>
                <DiagnosticsModal />
            </StudioContext.Provider>
        );
    };

    beforeEach(() => {
        vi.resetAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should not render when closed', () => {
        renderWithContext(false);
        expect(screen.queryByText('System Diagnostics')).toBeNull();
    });

    it('should render and load diagnostics when open', async () => {
        // Mock Client Diagnostic
        vi.mocked(Helios.diagnose).mockResolvedValue(mockClientReport as any);

        // Mock Server Diagnostic (Fetch)
        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => mockServerReport
        } as Response);

        renderWithContext(true);

        // Verify Modal Title
        expect(screen.getByText('System Diagnostics')).toBeDefined();

        // Verify Loading State initially
        expect(screen.getByText('Loading client diagnostics...')).toBeDefined();
        expect(screen.getByText('Loading server diagnostics... (This launches a headless browser)')).toBeDefined();

        // Verify Client Report Loaded
        await waitFor(() => {
            expect(screen.getByText('TestClientAgent')).toBeDefined();
        });

        // Verify Server Report Loaded
        await waitFor(() => {
            expect(screen.getByText('TestServerAgent')).toBeDefined();
        });

        // Verify Checkmarks (simplified check for presence of checkmarks)
        const checks = screen.getAllByText('✓');
        expect(checks.length).toBeGreaterThan(0);
    });

    it('should display error when server diagnostics fail', async () => {
        // Mock Client Diagnostic
        vi.mocked(Helios.diagnose).mockResolvedValue(mockClientReport as any);

        // Mock Server Diagnostic Failure
        vi.mocked(global.fetch).mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'Server Error' })
        } as Response);

        renderWithContext(true);

        // Use findByText which waits automatically and handles partial matches with regex if needed
        expect(await screen.findByText('Error:')).toBeDefined();
        expect(await screen.findByText(/Server Error/)).toBeDefined();
    });

    it('should close when close button is clicked', () => {
        // Mock success for this test to avoid crash
        vi.mocked(Helios.diagnose).mockResolvedValue(mockClientReport as any);
        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => mockServerReport
        } as Response);

        renderWithContext(true);
        const closeBtn = screen.getByText('×');
        fireEvent.click(closeBtn);
        expect(setDiagnosticsOpen).toHaveBeenCalledWith(false);
    });

    it('should close when overlay is clicked', () => {
        // Mock success
        vi.mocked(Helios.diagnose).mockResolvedValue(mockClientReport as any);
        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => mockServerReport
        } as Response);

        renderWithContext(true);
        // The overlay is the outer div with class diagnostics-modal-overlay
        // Since we can't easily select by class in testing-library without adding data-testid,
        // we can find the modal content and click its parent?
        // Or just assume the first div is overlay.
        // Let's rely on the structure. The Modal is inside the Overlay.
        // We can click the document body? No, overlay covers screen.

        // Let's add data-testid to the component (or just rely on class selector if supported by custom queries, but here we stick to standard)
        // Actually, we can click the element that has the onClick handler.
        // In the component: <div className="diagnostics-modal-overlay" onClick={() => setDiagnosticsOpen(false)}>

        // We can use container.firstChild
        const { container } = renderWithContext(true);
        const overlay = container.firstChild as HTMLElement;
        fireEvent.click(overlay);
        expect(setDiagnosticsOpen).toHaveBeenCalledWith(false);
    });

    it('should NOT close when modal content is clicked', () => {
        // Mock success
        vi.mocked(Helios.diagnose).mockResolvedValue(mockClientReport as any);
        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => mockServerReport
        } as Response);

        renderWithContext(true);
        const modalContent = screen.getByText('System Diagnostics').closest('.diagnostics-modal');
        expect(modalContent).not.toBeNull();

        fireEvent.click(modalContent!);
        expect(setDiagnosticsOpen).not.toHaveBeenCalled();
    });
});
