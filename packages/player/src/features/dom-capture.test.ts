// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { captureDomToBitmap } from './dom-capture';

// Mock fetch
const fetchSpy = vi.fn();
vi.stubGlobal('fetch', fetchSpy);

// Mock Image
class MockImage {
  onload: () => void = () => {};
  onerror: (e: any) => void = () => {};
  _src: string = '';
  set src(val: string) {
    this._src = val;
    setTimeout(() => {
        if (val.includes('error')) {
            this.onerror(new Error('Load failed'));
        } else {
            this.onload();
        }
    }, 0);
  }
  get src() { return this._src; }
}
vi.stubGlobal('Image', MockImage);

// Mock createImageBitmap
const createImageBitmapSpy = vi.fn().mockResolvedValue({ width: 100, height: 100, close: () => {} });
vi.stubGlobal('createImageBitmap', createImageBitmapSpy);

// Mock URL
if (typeof URL.createObjectURL === 'undefined') {
    URL.createObjectURL = vi.fn();
    URL.revokeObjectURL = vi.fn();
} else {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL');
}

// Helper to read blob
function readBlob(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(blob);
    });
}

describe('dom-capture', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        vi.clearAllMocks();
        // Clean up head
        document.head.innerHTML = '';
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.removeChild(container);
        document.head.innerHTML = '';
    });

    it('should capture external stylesheets', async () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://example.com/style.css';
        document.head.appendChild(link);

        fetchSpy.mockResolvedValue({
            ok: true,
            text: () => Promise.resolve('.external { color: red; }')
        });

        await captureDomToBitmap(container);

        expect(fetchSpy).toHaveBeenCalledWith('https://example.com/style.css');

        // Check the blob content passed to URL.createObjectURL
        const blob = (URL.createObjectURL as any).mock.calls[0][0] as Blob;
        const text = await readBlob(blob);

        expect(text).toContain('.external { color: red; }');
    });

    it('should handle fetch errors gracefully', async () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://example.com/broken.css';
        document.head.appendChild(link);

        fetchSpy.mockRejectedValue(new Error('Network error'));

        await expect(captureDomToBitmap(container)).resolves.not.toThrow();

        expect(fetchSpy).toHaveBeenCalledWith('https://example.com/broken.css');

        const blob = (URL.createObjectURL as any).mock.calls[0][0] as Blob;
        const text = await readBlob(blob);
        // Should not contain undefined or error text, just empty or existing styles
        expect(text).not.toContain('undefined');
    });

    it('should inline external images', async () => {
        const img = document.createElement('img');
        img.src = 'https://example.com/image.png';
        container.appendChild(img);

        const mockBlob = new Blob(['mock-image-data'], { type: 'image/png' });
        fetchSpy.mockResolvedValue({
            ok: true,
            blob: () => Promise.resolve(mockBlob)
        });

        await captureDomToBitmap(container);

        expect(fetchSpy).toHaveBeenCalledWith('https://example.com/image.png');

        const blob = (URL.createObjectURL as any).mock.calls[0][0] as Blob;
        const text = await readBlob(blob);

        // The src should be replaced with a data URI
        expect(text).toContain('data:image/png;base64,');
    });

    it('should inline background images', async () => {
        const div = document.createElement('div');
        div.style.backgroundImage = 'url("https://example.com/bg.png")';
        container.appendChild(div);

        const mockBlob = new Blob(['mock-bg-data'], { type: 'image/png' });
        fetchSpy.mockResolvedValue({
            ok: true,
            blob: () => Promise.resolve(mockBlob)
        });

        await captureDomToBitmap(container);

        expect(fetchSpy).toHaveBeenCalledWith('https://example.com/bg.png');

        const blob = (URL.createObjectURL as any).mock.calls[0][0] as Blob;
        const text = await readBlob(blob);

        // Note: serializer might encode quotes
        expect(text).toMatch(/background-image: url\(&quot;data:image\/png;base64,.*\)/);
    });

    it('should preserve other background layers when inlining', async () => {
        const div = document.createElement('div');
        // A complex background with gradient and image
        div.style.backgroundImage = 'linear-gradient(red, blue), url("https://example.com/bg.png")';
        container.appendChild(div);

        const mockBlob = new Blob(['mock-bg-data'], { type: 'image/png' });
        fetchSpy.mockResolvedValue({
            ok: true,
            blob: () => Promise.resolve(mockBlob)
        });

        await captureDomToBitmap(container);

        expect(fetchSpy).toHaveBeenCalledWith('https://example.com/bg.png');

        const blob = (URL.createObjectURL as any).mock.calls[0][0] as Blob;
        const text = await readBlob(blob);

        // Check that the gradient is still there
        expect(text).toContain('linear-gradient(red, blue)');
        // Check that the URL is replaced
        expect(text).toMatch(/url\(&quot;data:image\/png;base64,.*\)/);
    });

    it('should inline assets in external stylesheets', async () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://example.com/style.css';
        document.head.appendChild(link);

        // Mock fetch for the stylesheet and the asset
        fetchSpy.mockImplementation((url: string) => {
            if (url === 'https://example.com/style.css') {
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve('.external { background-image: url("bg.png"); }')
                });
            }
            if (url === 'https://example.com/bg.png') {
                 return Promise.resolve({
                    ok: true,
                    blob: () => Promise.resolve(new Blob(['mock-bg-data'], { type: 'image/png' }))
                });
            }
            return Promise.reject(new Error('Unknown URL: ' + url));
        });

        await captureDomToBitmap(container);

        expect(fetchSpy).toHaveBeenCalledWith('https://example.com/style.css');
        // The relative URL "bg.png" should be resolved against the stylesheet URL
        expect(fetchSpy).toHaveBeenCalledWith('https://example.com/bg.png');

        const blob = (URL.createObjectURL as any).mock.calls[0][0] as Blob;
        const text = await readBlob(blob);

        expect(text).toContain('data:image/png;base64,');
    });

    it('should inline assets in style tags', async () => {
        const style = document.createElement('style');
        style.textContent = '.internal { background-image: url("https://example.com/internal-bg.png"); }';
        document.head.appendChild(style);

        const mockBlob = new Blob(['mock-internal-bg-data'], { type: 'image/png' });
        fetchSpy.mockResolvedValue({
            ok: true,
            blob: () => Promise.resolve(mockBlob)
        });

        await captureDomToBitmap(container);

        expect(fetchSpy).toHaveBeenCalledWith('https://example.com/internal-bg.png');

        const blob = (URL.createObjectURL as any).mock.calls[0][0] as Blob;
        const text = await readBlob(blob);

        expect(text).toContain('data:image/png;base64,');
    });
});
