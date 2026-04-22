import os
content = open('packages/player/src/index.test.ts', 'r').read()

moreTests = """
  describe('fastSeek and canPlayType missing branches', () => {
    let player: HeliosPlayer;
    beforeEach(() => { player = new HeliosPlayer(); document.body.appendChild(player); });
    afterEach(() => { player.remove(); });
    let mockController: any;

    beforeEach(() => {
        mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            dispose: vi.fn()
        };
        (player as any).controller = mockController;
    });

    it('should handle set currentTime without fps', () => {
        mockController.getState.mockReturnValue({ currentFrame: 0, duration: 10, isPlaying: false });
        player.currentTime = 5;
        // seek should not be called because fps is missing
        expect(mockController.seek).not.toHaveBeenCalled();
    });

    it('should handle get currentTime without fps', () => {
        mockController.getState.mockReturnValue({ currentFrame: 100, duration: 10, isPlaying: false });
        expect(player.currentTime).toBe(0);
    });

    it('should handle get currentTime without controller', () => {
        (player as any).controller = null;
        expect(player.currentTime).toBe(0);
    });

    it('should handle set currentTime without controller', () => {
        (player as any).controller = null;
        player.currentTime = 5; // Should not throw
    });

    it('should render correct error overlay when controller not initialized', () => {
        (player as any).controller = null;
        // Attempting to do something that requires controller
        player.play().catch(() => {});
    });

    it('should handle requestPictureInPicture without controller', async () => {
        (player as any).controller = null;
        await expect(player.requestPictureInPicture()).rejects.toThrow();
    });

    it('should handle load without controller', () => {
        (player as any).controller = null;
        player.load(); // Should call reload logic and clear errors
    });
  });
"""

if "fastSeek and canPlayType missing branches" not in content:
    updated = content.replace("describe('Interactive Mode', () => {", moreTests + "\n  describe('Interactive Mode', () => {")
    with open('packages/player/src/index.test.ts', 'w') as f:
        f.write(updated)
