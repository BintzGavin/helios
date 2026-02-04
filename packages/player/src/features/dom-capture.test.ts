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

    it('should inline nested canvas elements', async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        // Mock toDataURL for this canvas instance
        const dataUri = 'data:image/png;base64,mockCanvasData';
        canvas.toDataURL = vi.fn().mockReturnValue(dataUri);

        container.appendChild(canvas);

        await captureDomToBitmap(container);

        const blob = (URL.createObjectURL as any).mock.calls[0][0] as Blob;
        const text = await readBlob(blob);

        expect(text).toContain(dataUri);
        expect(text).toContain('<img');
        // Canvas tag should be replaced
        expect(text).not.toContain('<canvas');
    });

    it('should inline root canvas element', async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const dataUri = 'data:image/png;base64,mockRootCanvasData';
        canvas.toDataURL = vi.fn().mockReturnValue(dataUri);

        // Use canvas as the element to capture
        document.body.appendChild(canvas);

        await captureDomToBitmap(canvas);

        const blob = (URL.createObjectURL as any).mock.calls[0][0] as Blob;
        const text = await readBlob(blob);

        expect(text).toContain(dataUri);
        expect(text).toContain('<img');
        expect(text).not.toContain('<canvas');

        document.body.removeChild(canvas);
    });

    it('should inline video elements', async () => {
        const mockDrawImage = vi.fn();
        const mockToDataURL = vi.fn().mockReturnValue('data:image/png;base64,mockVideoData');

        // We intercept createElement to return a controlled canvas
        const originalCreateElement = document.createElement.bind(document);
        const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
             const el = originalCreateElement(tagName, options);
             if (tagName === 'canvas') {
                 (el as HTMLCanvasElement).getContext = vi.fn().mockReturnValue({
                     drawImage: mockDrawImage
                 });
                 (el as HTMLCanvasElement).toDataURL = mockToDataURL;
             }
             return el;
        });

        const video = document.createElement('video');
        // Define properties that are read-only or not set by default
        Object.defineProperty(video, 'readyState', { value: 2, writable: true });
        Object.defineProperty(video, 'videoWidth', { value: 300 });
        Object.defineProperty(video, 'videoHeight', { value: 150 });
        video.style.width = '300px';
        video.className = 'my-video';

        container.appendChild(video);

        await captureDomToBitmap(container);

        expect(mockDrawImage).toHaveBeenCalledWith(video, 0, 0, 300, 150);
        expect(mockToDataURL).toHaveBeenCalled();

        const blob = (URL.createObjectURL as any).mock.calls[0][0] as Blob;
        const text = await readBlob(blob);

        expect(text).toContain('data:image/png;base64,mockVideoData');
        expect(text).toContain('<img');
        expect(text).toContain('class="my-video"');
        expect(text).not.toContain('<video');

        createElementSpy.mockRestore();
    });

    it('should skip inlining video if not ready', async () => {
        const video = document.createElement('video');
        Object.defineProperty(video, 'readyState', { value: 0, writable: true }); // HAVE_NOTHING
        container.appendChild(video);

        await captureDomToBitmap(container);

        const blob = (URL.createObjectURL as any).mock.calls[0][0] as Blob;
        const text = await readBlob(blob);

        // Should still contain video tag
        expect(text).toContain('<video');
    });

    it('should capture open shadow DOM', async () => {
        // Define a custom element to attach shadow DOM
        class MyElement extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                if (this.shadowRoot) {
                    this.shadowRoot.innerHTML = '<div class="shadow-content">Inside Shadow</div><style>.shadow-content { color: red; }</style>';
                }
            }
        }

        if (!customElements.get('my-element')) {
            customElements.define('my-element', MyElement);
        }

        const el = document.createElement('my-element');
        container.appendChild(el);

        await captureDomToBitmap(container);

        const blob = (URL.createObjectURL as any).mock.calls[0][0] as Blob;
        const text = await readBlob(blob);

        // Should contain declarative shadow DOM
        expect(text).toContain('<template shadowrootmode="open">');
        expect(text).toContain('Inside Shadow');
        expect(text).toContain('.shadow-content { color: red; }');
    });

    it('should respect target dimensions', async () => {
        const options = { targetWidth: 1280, targetHeight: 720 };
        await captureDomToBitmap(container, options);

        const blob = (URL.createObjectURL as any).mock.calls[0][0] as Blob;
        const text = await readBlob(blob);

        expect(text).toContain('width="1280"');
        expect(text).toContain('height="720"');
    });

    it('should use currentSrc for responsive images', async () => {
        const img = document.createElement('img');
        img.srcset = 'small.png 500w, large.png 1000w';
        img.src = 'fallback.png';

        // Mock currentSrc behavior
        Object.defineProperty(img, 'currentSrc', {
            value: 'https://example.com/large.png',
            writable: true
        });

        container.appendChild(img);

        const mockBlob = new Blob(['mock-large-data'], { type: 'image/png' });
        fetchSpy.mockResolvedValue({
            ok: true,
            blob: () => Promise.resolve(mockBlob)
        });

        await captureDomToBitmap(container);

        // Should fetch the currentSrc, not the fallback src
        expect(fetchSpy).toHaveBeenCalledWith('https://example.com/large.png');

        const blob = (URL.createObjectURL as any).mock.calls[0][0] as Blob;
        const text = await readBlob(blob);

        // The src should be replaced with a data URI
        expect(text).toContain('data:image/png;base64,');
        // srcset and sizes should be removed
        expect(text).not.toContain('srcset');
    });
});
