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
});
