// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { captureDomToBitmap } from './dom-capture';

// Mock fetch
const fetchSpy = vi.fn();
vi.stubGlobal('fetch', fetchSpy);

// Mock Image
const images: MockImage[] = [];
class MockImage {
  onload: () => void = () => {};
  onerror: (e: any) => void = () => {};
  _src: string = '';
  constructor() { images.push(this); }
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

// jsdom has no 2D canvas: the capture draws the SVG image onto one before making the bitmap.
const drawImageSpy = vi.fn();
vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({ drawImage: drawImageSpy }) as any);

const SVG_DATA_PREFIX = 'data:image/svg+xml;charset=utf-8,';

/** The SVG markup the last capture loaded into its image. */
async function capturedSvg(): Promise<string> {
    const src = images[images.length - 1]?.src ?? '';
    expect(src.startsWith(SVG_DATA_PREFIX)).toBe(true);
    return decodeURIComponent(src.slice(SVG_DATA_PREFIX.length));
}

describe('dom-capture', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        vi.clearAllMocks();
        images.length = 0;
        fetchSpy.mockReset();
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
        const text = await capturedSvg();

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

        const text = await capturedSvg();
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

        const text = await capturedSvg();

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

        const text = await capturedSvg();

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

        const text = await capturedSvg();

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

        const text = await capturedSvg();

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

        const text = await capturedSvg();

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

        const text = await capturedSvg();

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

        const text = await capturedSvg();

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

        const text = await capturedSvg();

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

        const text = await capturedSvg();

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

        const text = await capturedSvg();

        // Should contain declarative shadow DOM
        expect(text).toContain('<template shadowrootmode="open">');
        expect(text).toContain('Inside Shadow');
        expect(text).toContain('.shadow-content { color: red; }');
    });

    it('should respect target dimensions', async () => {
        const options = { targetWidth: 1280, targetHeight: 720 };
        await captureDomToBitmap(container, options);

        const text = await capturedSvg();

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

        const text = await capturedSvg();

        // The src should be replaced with a data URI
        expect(text).toContain('data:image/png;base64,');
        // srcset and sizes should be removed
        expect(text).not.toContain('srcset');
    });

    it('should preserve form input values', async () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = 'user text';
        container.appendChild(input);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        container.appendChild(checkbox);

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.checked = true;
        container.appendChild(radio);

        const textarea = document.createElement('textarea');
        textarea.value = 'multiline text';
        container.appendChild(textarea);

        const select = document.createElement('select');
        const opt1 = document.createElement('option');
        opt1.value = '1';
        opt1.text = 'One';
        const opt2 = document.createElement('option');
        opt2.value = '2';
        opt2.text = 'Two';
        select.appendChild(opt1);
        select.appendChild(opt2);
        select.selectedIndex = 1; // Select 'Two'
        container.appendChild(select);

        await captureDomToBitmap(container);

        const text = await capturedSvg();

        // Input value should be synced to attribute
        expect(text).toContain('value="user text"');

        // Checkbox/Radio checked state should be synced to attribute
        // XMLSerializer might serialize as checked="" or checked
        expect(text).toMatch(/checked=""|checked(?!=")/);

        // Textarea value should be text content
        expect(text).toContain('multiline text');

        // Select option should have selected attribute
        // We look for the option with value="2" having selected
        expect(text).toMatch(/<option value="2"[^>]*selected/);
    });
});

describe('dom-capture: in-view export fixes', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        vi.clearAllMocks();
        images.length = 0;
        fetchSpy.mockReset();
        document.head.innerHTML = '';
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.removeChild(container);
        document.head.innerHTML = '';
        delete (document as any).getAnimations;
    });

    const cssResponse = (css: string) => ({ ok: true, text: () => Promise.resolve(css) });
    const blobResponse = (data: string, type: string) => ({ ok: true, blob: () => Promise.resolve(new Blob([data], { type })) });

    it('loads the SVG from a data: URL and makes the bitmap from a canvas, so Chromium does not taint it', async () => {
        container.textContent = 'Hello';
        await captureDomToBitmap(container, { targetWidth: 320, targetHeight: 180 });

        // A foreignObject SVG loaded from a blob: URL taints every frame made from it.
        expect(URL.createObjectURL).not.toHaveBeenCalled();
        const img = images[images.length - 1];
        expect(img.src.startsWith(SVG_DATA_PREFIX)).toBe(true);

        // The image is drawn onto a canvas of the target size, and the bitmap comes from the canvas.
        expect(drawImageSpy).toHaveBeenCalledWith(img, 0, 0, 320, 180);
        const source = createImageBitmapSpy.mock.calls[0][0];
        expect(source).toBeInstanceOf(HTMLCanvasElement);
        expect(source.width).toBe(320);
        expect(source.height).toBe(180);
    });

    it('writes valid XML when a stylesheet href or its CSS contains & or <', async () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter&display=swap';
        document.head.appendChild(link);
        const style = document.createElement('style');
        style.textContent = '.a::after { content: "R&D <3"; }';
        document.head.appendChild(style);
        fetchSpy.mockResolvedValue(cssResponse('.b::before { content: "a & b"; } /* end */ .c { color: red }'));
        container.innerHTML = '<p class="a">x</p>';

        await captureDomToBitmap(container);

        const svg = await capturedSvg();
        const parsed = new DOMParser().parseFromString(svg.trim(), 'image/svg+xml');
        expect(parsed.getElementsByTagName('parsererror')).toHaveLength(0);
        // The CSS reads the same once the XML is parsed.
        const css = Array.from(parsed.getElementsByTagName('style')).map((s) => s.textContent).join('\n');
        expect(css).toContain('content: "R&D <3"');
        expect(css).toContain('content: "a & b"');
        expect(css).toContain('.c { color: red }');
    });

    it('freezes CSS and WAAPI animations at their current values in the clone', async () => {
        container.innerHTML = '<h1 class="title">Title</h1><div class="bar"></div><p>static</p>';
        const title = container.querySelector('.title') as HTMLElement;
        const bar = container.querySelector('.bar') as HTMLElement;
        (document as any).getAnimations = () => [
            // A CSS animation (rise) and a WAAPI animation, both seeked by the page shim.
            { effect: { target: title, pseudoElement: null, getKeyframes: () => [
                { offset: 0, easing: 'ease', composite: 'auto', computedOffset: 0, opacity: '0', transform: 'translateY(40px)' },
                { offset: 1, easing: 'ease', composite: 'auto', computedOffset: 1, opacity: '1', transform: 'none' },
            ] } },
            { effect: { target: bar, pseudoElement: null, getKeyframes: () => [{ offset: 0, width: '0px' }, { offset: 1, width: '100px' }] } },
            // Pseudo-element animations can't be written inline: left alone.
            { effect: { target: bar, pseudoElement: '::after', getKeyframes: () => [{ offset: 0, color: 'red' }] } },
        ];
        const real = window.getComputedStyle.bind(window);
        const spy = vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
            const values: Record<string, string> =
                el === title ? { opacity: '0.5', transform: 'matrix(1, 0, 0, 1, 0, 20)' } :
                el === bar ? { width: '42px' } : {};
            const cs = real(el, pseudo);
            return { getPropertyValue: (p: string) => values[p] ?? cs.getPropertyValue(p) } as CSSStyleDeclaration;
        });

        try {
            await captureDomToBitmap(container);
        } finally {
            spy.mockRestore();
        }

        const svg = await capturedSvg();
        const parsed = new DOMParser().parseFromString(svg.trim(), 'image/svg+xml');
        const h1 = parsed.getElementsByTagName('h1')[0];
        expect(h1.getAttribute('style')).toContain('opacity: 0.5');
        expect(h1.getAttribute('style')).toContain('transform: matrix(1, 0, 0, 1, 0, 20)');
        const barClone = Array.from(parsed.getElementsByTagName('div')).find((d) => d.getAttribute('class') === 'bar')!;
        expect(barClone.getAttribute('style')).toContain('width: 42px');
        expect(barClone.getAttribute('style')).not.toContain('color');
        expect(parsed.getElementsByTagName('p')[0].getAttribute('style')).toBeNull();
        // Animations would restart at 0 inside the SVG image: they are switched off there.
        expect(svg).toMatch(/animation:\s*none\s*!important/);
        // The live page is untouched.
        expect(title.getAttribute('style')).toBeNull();
    });

    it('inlines web fonts from an @import, resolving font URLs against the imported stylesheet', async () => {
        const style = document.createElement('style');
        style.textContent = "@import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');\nbody { font-family: Inter; }";
        document.head.appendChild(style);
        fetchSpy.mockImplementation((url: string) => {
            if (url === 'https://fonts.googleapis.com/css2?family=Inter&display=swap') {
                return Promise.resolve(cssResponse("@font-face { font-family: 'Inter'; src: url(/s/inter/v1.woff2) format('woff2'); }"));
            }
            if (url === 'https://fonts.googleapis.com/s/inter/v1.woff2') return Promise.resolve(blobResponse('font-bytes', 'font/woff2'));
            return Promise.reject(new Error('Unexpected fetch ' + url));
        });

        await captureDomToBitmap(container);

        const svg = await capturedSvg();
        expect(svg).toContain("font-family: 'Inter'");
        expect(svg).toContain('url("data:font/woff2;base64,');
        expect(svg).not.toContain('@import');
        expect(svg).not.toContain('v1.woff2');
    });

    it('wraps an @import with a media query in @media', async () => {
        const style = document.createElement('style');
        style.textContent = '@import "print.css" print;';
        document.head.appendChild(style);
        fetchSpy.mockResolvedValue(cssResponse('.p { color: black }'));

        await captureDomToBitmap(container);

        expect(fetchSpy).toHaveBeenCalledWith(new URL('print.css', document.baseURI).href);
        expect(await capturedSvg()).toMatch(/@media print \{\s*\.p \{ color: black \}\s*\}/);
    });

    it('fetches each stylesheet and font once across frames when given a cache', async () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter';
        document.head.appendChild(link);
        fetchSpy.mockImplementation((url: string) => {
            if (url.includes('css2')) return Promise.resolve(cssResponse('@font-face { src: url(https://fonts.gstatic.com/a.woff2); }'));
            return Promise.resolve(blobResponse('font-bytes', 'font/woff2'));
        });

        const cache = new Map();
        await captureDomToBitmap(container, { cache });
        await captureDomToBitmap(container, { cache });
        await captureDomToBitmap(container, { cache });

        expect(fetchSpy.mock.calls.map((c) => c[0])).toEqual([
            'https://fonts.googleapis.com/css2?family=Inter',
            'https://fonts.gstatic.com/a.woff2',
        ]);
        expect(await capturedSvg()).toContain('data:font/woff2;base64,');
    });

    it('retries a failed fetch on the next frame instead of caching the failure', async () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://example.com/a.css';
        document.head.appendChild(link);
        fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(cssResponse('.a { color: blue }'));
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const cache = new Map();
        try {
            await captureDomToBitmap(container, { cache });
            expect(await capturedSvg()).not.toContain('color: blue');
            await captureDomToBitmap(container, { cache });
            expect(await capturedSvg()).toContain('.a { color: blue }');
            expect(warn).toHaveBeenCalled();
        } finally {
            warn.mockRestore();
        }
    });
});
