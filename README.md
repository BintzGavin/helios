# Helios Engine

Helios is a vision for a modern, performant, and framework-agnostic engine for programmatic video creation.
The vision is to empower developers to create high-quality, dynamic videos using standard web technologies (HTML, CSS, JS) without being locked into a specific UI framework. Helios prioritizes performance, a superior developer experience, and a flexible architecture that leverages native browser APIs to deliver a next-generation video creation toolkit for the web.
Table of Contents
- [Core Principles](#core-principles)
- [Architectural Deep Dive](#architectural-deep-dive)
  - [1. The Composition Layer: The Authoring Experience](#1-the-composition-layer-the-authoring-experience)
  - [2. The Animation System: A Modern, Performant Approach](#2-the-animation-system-a-modern-performant-approach)
  - [3. The Rendering Pipeline: The Engine](#3-the-rendering-pipeline-the-engine)
- [Technology Stack](#technology-stack)
- [Project Status](#project-status)
- [Roadmap: The Future of Helios](#roadmap-the-future-of-helios)
  - [V2: Distributed Rendering & Advanced Audio](#v2-distributed-rendering--advanced-audio)
  - [V3: Native Node.js Encoding](#v3-native-nodejs-encoding)
- [License](#license)
## Core Principles
The development of Helios is guided by a set of foundational principles that inform every architectural decision.
 - Performance First: The engine is architected for speed. We prioritize hardware-accelerated rendering paths, minimize I/O bottlenecks by piping data in memory, and leverage the most efficient browser APIs available. Performance is treated as a core feature, not an afterthought.
 - Truly Framework-Agnostic: The core logic is written in pure TypeScript with zero UI framework dependencies. Integration is achieved through a "headless" API and lightweight, idiomatic adapters for popular frameworks. This ensures developers can use the tools they already know and love without being forced into a specific ecosystem.
 - Leverage Web Standards: We prefer native, modern browser APIs over custom or third-party implementations wherever possible. This includes a deep integration with the Web Animations API (WAAPI) for animation control and the WebCodecs API for high-performance encoding, ensuring our engine is future-proof and aligned with the web platform.
 - Superior Developer Experience (DevEx): A library is only as good as its usability. We are committed to providing clear, comprehensive documentation, powerful debugging tools (including headed mode and remote debugging), and a seamless local development workflow with features like hot-reloading.
 - Resilience & Reliability: Programmatic rendering can be complex. The rendering process must be stable and predictable. We build upon a foundation of modern, reliable tooling like Playwright, which offers sophisticated auto-waiting mechanisms to eliminate the flaky tests and inconsistent outputs that often plague browser automation.
## Architectural Deep Dive
Helios is designed with a modular and flexible architecture that separates logic from presentation, providing developers with maximum power and control.
### 1. The Composition Layer: The Authoring Experience
This layer defines how developers create and describe their video content. Our approach is inspired by modern "Headless UI" libraries (like Radix UI or Headless UI) to provide a truly framework-agnostic core.

#### The "Headless" Logic Engine
The core of the library is an instantiable JavaScript class that acts as a "headless video engine." It manages all state (e.g., `currentFrame`, `duration`, `isPlaying`, `inputProps`), exposes methods (`play`, `pause`, `seek`), and provides a subscription mechanism for state changes. This decouples the core logic from any UI framework and allows multiple compositions to coexist safely on the same page.

#### Composition via Headless Adapters
To provide an idiomatic authoring experience, we will offer small, dedicated NPM packages that serve as lightweight adapters for popular frameworks. These adapters consume the core headless engine and expose its state in a way that feels native to each ecosystem:
- **React**: A `useVideoFrame()` hook that provides the current frame state and triggers re-renders automatically.
- **Svelte**: A readable store that developers can subscribe to with the `$` syntax for seamless reactivity.
- **Vue**: A composable function that returns a set of reactive properties for use in Vue's Composition API.

#### Playback via Web Components
For the in-browser preview, the player UI (scrubber, controls, etc.) is encapsulated as a standard **Web Component** (`<helios-player>`). This ensures maximum portability and isolation. The player can be dropped into any HTML page, regardless of the surrounding framework, without style or script conflicts. It uses a sandboxed `<iframe>` internally to render the user's composition, providing a clean and isolated environment for a true WYSIWYG preview.
### 2. The Animation System: A Modern, Performant Approach

> **Note on Animation for MVP**: The Web Animations API (WAAPI) approach described here is ideal for the versatile DOM-to-Video path. For the initial canvas-focused MVP, animations will be driven directly by the chosen canvas library's internal loop (e.g., a `requestAnimationFrame` loop in Three.js or Pixi.js). In this mode, Helios's role is to control the master timeline by providing the correct `currentTime` to the canvas on each frame.

A primitive approach to animation would require developers to write inefficient logic that re-runs on every single frame (e.g., `if (frame > 100) { opacity = 1; }`). Helios avoids this by leveraging the browser's native **Web Animations API (WAAPI)** for a more declarative and performant animation model.

The implementation is simple but powerful:
1.  **Declarative Animations**: Developers define their animations using standard, declarative web technologies they already know, such as CSS `@keyframes` or the `element.animate()` JavaScript method.
2.  **Timeline Control**: Instead of the library's render loop calling a user-defined function on every frame, it instead controls a global timeline. To render a specific frame `f` at a given `fps`, the engine performs a single, simple operation: it sets the timeline's current time programmatically to `document.timeline.currentTime = (f / fps) * 1000;`.

When the library sets the `currentTime`, the browser's own highly-optimized animation engine takes over. It calculates the correct interpolated values for all animated properties on all elements for that precise moment in time.

This architecture offers several profound advantages:
- **Performance**: It fundamentally decouples the animation definition from the rendering loop. The developer defines the animation *once*, and the browser handles the heavy lifting of calculating intermediate states for potentially thousands of properties, often off the main thread.
- **Maintainability**: Developers can express complex animations declaratively, which is more readable and less error-prone than writing manual interpolation logic for every frame.
- **Familiarity**: It unlocks the full power of the web platform, including complex easing functions, sequencing, and synchronization, using an API that is already a W3C standard.
### 3. The Rendering Pipeline: The Engine
The server-side engine transforms a composition into a final video file. It features a powerful dual-path architecture to intelligently select the most efficient rendering strategy based on the nature of the composition.

> **Note on Initial Implementation**: For the initial MVP, we will prioritize the **Canvas-to-Video** path. This approach offers superior performance and a faster path to a minimum viable product. The more versatile **DOM-to-Video** path is a planned feature for a subsequent release.

#### Path 1: DOM-to-Video (Versatile)
This path is a proven and versatile method for capturing any content that can be rendered in a web browser. It is ideal for compositions that rely on the standard DOM, including HTML elements, CSS styling, and SVG graphics.
- **Technology**: This path uses Playwright to launch a headless browser, render the full DOM for each frame, and capture a screenshot. A critical optimization is ensuring all assets (images, fonts, etc.) are fully pre-loaded before the render loop begins to prevent rendering artifacts.

#### Path 2: Canvas-to-Video (High-Performance)
This path provides a high-performance alternative for compositions that render exclusively to an HTML `<canvas>` element (e.g., using WebGL, Three.js, or Pixi.js). For these use cases, rendering a full DOM and taking a screenshot is inefficient overhead.
- **Technology**: This path uses the modern **WebCodecs API** to directly and efficiently encode canvas frames into video chunks. The engine captures the canvas content as a `VideoFrame` object, which is then fed into a hardware-accelerated `VideoEncoder`. This bypasses the DOM entirely for significant speed gains.
#### GPU Acceleration: A Foundational Requirement
For Helios, GPU acceleration is not an optional tweak but a **mandatory, foundational requirement** for competitive performance. By default, headless browsers often fall back to slow, CPU-based software rendering (like Google's SwiftShader), which is dramatically slower for graphics-intensive operations.

- **Implementation**: We will ship with optimized launch flags to enable hardware acceleration across different platforms (Linux, macOS, Windows).
- **Diagnostics**: To combat the common friction of environment configuration, the library will include a built-in diagnostic tool (`helios.diagnose()`) that programmatically checks `chrome://gpu` to verify that hardware acceleration is active and warns the user with helpful guidance if it is not. This transforms a potential point of failure into a guided, supportive developer experience.
#### Video & Audio Encoding with FFmpeg
All rendering paths feed their output into FFmpeg, the industry-standard tool for video manipulation.
- **Direct Execution**: We spawn FFmpeg directly as a child process from Node.js (`child_process.spawn`). This is a more stable and future-proof approach than relying on third-party JavaScript wrappers (like the deprecated `fluent-ffmpeg`), which can become outdated or introduce an unnecessary layer of abstraction.
- **Performance Optimization**: To minimize disk I/O, which is a major bottleneck, the engine pipes image data (as `Buffer`s) directly from the browser to FFmpeg's `stdin`, avoiding the need to write thousands of temporary frame files to disk. FFmpeg is configured to accept this piped input using the `image2pipe` demuxer.
- **Audio Integration**: The engine will support audio by using FFmpeg's powerful filter complex (e.g., `amix`) to mix multiple audio sources programmatically.
### 4. The In-Browser Player: A High-Fidelity Preview Engine
The in-browser player is crucial for providing developers with a rapid, iterative feedback loop. The key to a true "what you see is what you get" (WYSIWYG) experience is to use the exact same bundled composition code for both the in-browser preview and the final server-side render.

The fidelity of the preview is significantly improved by leveraging the same dual-path architecture:
- For **DOM-based** compositions, the player uses a `requestAnimationFrame` loop to drive the animation, providing a good approximation of the final output.
- For **canvas-based** compositions, the player can use the native browser WebCodecs API to generate a true video preview in real-time. This provides a preview that is much more accurate in terms of timing, performance, and final appearance than a simple frame loop.
## Technology Stack
- **Browser Automation: Playwright**: Chosen for its superior resilience, cross-browser support, and developer experience. While Puppeteer is a viable alternative, Playwright's architectural advantages are a better fit for a production-grade rendering engine.

| Feature | Puppeteer | Playwright | Recommendation & Rationale |
|---|---|---|---|
| **Auto-Waiting/Resilience** | Requires manual `waitFor` calls, a common source of flaky renders. | **Built-in auto-waiting** for elements to be actionable, drastically reducing flakiness. | **Playwright**. Resilience is paramount for a library rendering arbitrary user content. |
| **Cross-Browser Support** | Primarily Chromium. | **Native support for Chromium, Firefox, and WebKit.** | **Playwright**. Provides greater flexibility and future-proofs the library. |
| **Debugging Tools** | Basic debugging. | **Comprehensive suite** including Playwright Inspector and Trace Viewer. | **Playwright**. Superior tooling accelerates debugging for both library and end-user code. |

- **Video Encoding: FFmpeg**: Invoked directly via `child_process.spawn` for maximum control, stability, and performance.
- **Core Language: TypeScript**: For type safety, improved developer experience, and a more maintainable codebase.
- **Bundling: Vite / Rollup**: Modern, fast, and optimized for building libraries.
## Comparison with Remotion

Helios and [Remotion](https://www.remotion.dev/) share the same vision of programmatic video creation using web technologies, but they differ significantly in their architectural approach and design philosophy. The following comparison highlights key differences to help developers choose the right tool for their needs.

| Feature | Helios | Remotion |
|---------|--------|----------|
| **Framework Support** | **Framework-agnostic** - Headless core with lightweight adapters for React, Vue, Svelte, and vanilla JS. Core logic is pure TypeScript with zero UI framework dependencies. | **React-only** - Deeply integrated with React, requiring React components and hooks (`useCurrentFrame()`, `useVideo()`, etc.) for all compositions. |
| **Composition Model** | **Headless engine** - Instantiable JavaScript class managing state independently. Multiple compositions can coexist on the same page. Framework adapters provide idiomatic APIs (hooks, stores, composables). | **React components** - Compositions are React components wrapped in `<Composition>` tags. State management relies on React's rendering cycle and hooks. |
| **Animation System** | **Web Animations API (WAAPI)** - Leverages native browser animation engine via `document.timeline.currentTime`. Declarative animations using CSS `@keyframes` or `element.animate()`. Browser handles interpolation off the main thread. | **Frame-based hooks** - Uses `useCurrentFrame()` hook to drive animations. Developers write frame-dependent logic (e.g., `if (frame > 100) { opacity = 1; }`). Provides utilities like `spring()` and `interpolate()` for common patterns. |
| **Browser Automation** | **Playwright** - Chosen for built-in auto-waiting, cross-browser support (Chromium, Firefox, WebKit), and comprehensive debugging tools (Inspector, Trace Viewer). Superior resilience for rendering arbitrary user content. | **Puppeteer** - Uses Puppeteer for headless browser automation. Primarily Chromium-focused. Requires manual `waitFor` calls for reliable rendering. |
| **Rendering Architecture** | **Dual-path rendering** - Intelligent routing between DOM-to-Video (screenshot-based) and Canvas-to-Video (WebCodecs API) paths. Canvas path bypasses DOM entirely for significant performance gains. | **DOM-to-Video only** - Screenshot-based rendering using headless browser. All compositions render through DOM, even canvas-based content. WebCodecs support is planned but not fully implemented. |
| **WebCodecs Integration** | **Native WebCodecs** - Canvas-to-Video path uses WebCodecs API directly for hardware-accelerated encoding. Captures canvas as `VideoFrame` objects fed into `VideoEncoder`. Core feature for high-performance rendering. | **Planned feature** - WebCodecs support is in development for client-side rendering. Current rendering relies on screenshot-based approach. |
| **Player/Preview** | **Web Components** - Player UI (`<helios-player>`) is a standard Web Component, ensuring maximum portability and isolation. Can be dropped into any HTML page without framework conflicts. Uses sandboxed `<iframe>` for isolation. | **React Player** - `<Player>` component is React-based. Requires React context and hooks. Can be embedded in React apps but not framework-agnostic. Includes Remotion Studio for development preview. |
| **GPU Acceleration** | **Mandatory requirement** - GPU acceleration is a foundational requirement with optimized launch flags across platforms. Includes built-in diagnostic tool (`helios.diagnose()`) to verify hardware acceleration status. | **Supported** - GPU acceleration is supported but not as prominently featured. Configuration may require manual setup depending on deployment environment. |
| **FFmpeg Integration** | **Direct process spawning** - Uses `child_process.spawn` directly for maximum control and stability. Pipes image data in-memory to FFmpeg's `stdin` to minimize disk I/O bottlenecks. | **Wrapper-based** - Uses FFmpeg through abstraction layers. May involve intermediate file writes depending on configuration. |
| **Distributed Rendering** | **Planned (V2)** - Architecture designed for distributed rendering on AWS Lambda or Google Cloud Run. Will use FFmpeg `concat` demuxer for lossless chunk stitching. | **Available** - Remotion Lambda provides distributed rendering on AWS Lambda. Remotion Cloud Run supports Google Cloud Run. Both are production-ready with commercial licensing. |
| **License** | **Elastic License 2.0 (ELv2)** - Free to use, modify, and distribute. Can build commercial products and embed in applications. Cannot offer Helios as a managed service/SaaS. No per-seat fees, no render limits, no feature restrictions. Perfect for founders building video platforms. | **Dual licensing** - Free for individuals and teams up to 3 people. Commercial license required for teams of 4+ people ($100+/month minimum, scales with developer seats and render volume). Self-hosted cloud rendering allowed in both tiers. |
| **Developer Experience** | **Framework-native adapters** - Each framework gets idiomatic APIs (React hooks, Svelte stores, Vue composables). Headless core allows custom integrations. | **React-centric** - Excellent DX for React developers with comprehensive TypeScript support, Zod schemas for type-safe props, and extensive documentation. |
| **Performance Philosophy** | **Performance-first** - Architecture prioritizes speed through hardware acceleration, in-memory data piping, WebCodecs API, and efficient rendering paths. Performance is treated as a core feature with mandatory GPU acceleration and zero-copy data flows. | **Balanced** - Good performance with focus on developer productivity and ease of use. Performance optimizations available but not as aggressively architected. DOM-based rendering path may introduce overhead for canvas-heavy workloads. |
| **Debugging Tools** | **Playwright-native** - Leverages Playwright Inspector, Trace Viewer, and remote debugging capabilities. Headed mode and remote debugging ports for live inspection. | **Remotion Studio** - Built-in development studio with timeline, preview, and debugging features. Can connect Chrome DevTools to headless browser instances. |
| **Asset Loading** | **Pre-loading optimization** - Ensures all assets (images, fonts) are fully pre-loaded before render loop begins to prevent artifacts. Critical optimization for DOM-to-Video path. | **Asset components** - Provides specialized components (`<Img>`, `<Video>`, `<Audio>`) that handle loading states. Uses `delayRender()` for async data fetching. |
| **Use Case Fit** | **Best for**: Teams using multiple frameworks, canvas-heavy applications (WebGL, Three.js, Pixi.js), performance-critical rendering, and projects requiring framework flexibility. | **Best for**: React-focused teams, rapid prototyping, data-driven video applications, and projects benefiting from React's component ecosystem. |

### Key Architectural Differences

**Helios's Framework-Agnostic Approach:**
- The core engine is a pure TypeScript class with no framework dependencies
- Framework integration happens through small adapter packages
- This allows Helios to work seamlessly with React, Vue, Svelte, or vanilla JavaScript
- Multiple compositions can run independently on the same page without React context conflicts

**Remotion's React-First Approach:**
- Deeply integrated with React's component model and lifecycle
- Leverages React's ecosystem (hooks, context, component composition)
- Excellent for teams already invested in React
- Requires React knowledge even for simple compositions

**Animation Philosophy:**

**Helios** uses the Web Animations API, treating animations as declarative definitions that the browser's optimized engine executes. This decouples animation logic from the render loop and leverages browser-native performance optimizations.

**Remotion** uses a frame-based model where developers write logic that runs on every frame. While this provides fine-grained control, it requires developers to manually handle interpolation and timing, which can be less performant for complex animations.

**Rendering Performance:**

**Helios** offers a dual-path architecture that can bypass the DOM entirely for canvas-based content using WebCodecs, providing significant performance advantages for WebGL/Three.js/Pixi.js applications.

**Remotion** uses a unified DOM-based rendering path, which is versatile but may introduce overhead for canvas-heavy compositions.

### Licensing Comparison: Open Source vs. Commercial Model

#### Helios: Elastic License 2.0 (ELv2) - Build Products, Not Managed Services

**Freedom and Flexibility:**
- **Zero cost** - Completely free for all use cases
- **No team size restrictions** - Use with teams of any size without additional fees
- **No render limits** - Render unlimited videos without per-render costs
- **No feature restrictions** - All features available to all users
- **Commercial products allowed** - Build any commercial product, SaaS application, or platform using Helios Engine
- **Embedding allowed** - Include Helios Engine in any application (open source or proprietary)
- **Self-hosting freedom** - Deploy on any infrastructure without licensing concerns
- **Modification rights** - Full freedom to modify, fork, and redistribute the codebase
- **Sell products** - Sell products that use or include Helios Engine

**Single Restriction:**
- Cannot offer Helios Engine itself as a managed/hosted service (SaaS) to third parties
- This protects our ability to build a SaaS platform around Helios
- Does NOT restrict: Building video platforms, embedding in apps, selling products, or any other commercial use

**Business Model:**
- Allows creators to build a SaaS platform around Helios while enabling a thriving ecosystem
- Perfect for founders building video platforms (our target customers!)
- No vendor lock-in or subscription dependencies for users building products
- Well-established license used by Elasticsearch, Kibana, and other successful projects

**When ELv2 Works Best:**
- **Founders building video platforms** - Our primary target! Build your SaaS using Helios ✅
- Building commercial products that use Helios Engine
- Agencies creating video tools for clients
- Enterprises embedding Helios in their applications
- Startups building video creation tools
- Anyone building products (not offering Helios as a service)

**Perfect For:**
- Video editing SaaS platforms
- White-label video creation tools
- Video generation applications
- Custom video creation workflows
- Any product that uses Helios Engine

**Not For:**
- Offering Helios Engine rendering as a managed service to others
- Reselling Helios infrastructure as a service

#### Remotion: Dual Licensing Model

**Free Tier (Teams ≤ 3 People):**
- Free for individuals and small teams (up to 3 developers)
- Commercial use allowed
- Self-hosted cloud rendering allowed
- All core features available
- Must upgrade when team grows beyond 3 people

**Commercial License (Teams ≥ 4 People):**
- **Minimum cost**: $100/month
- **Pricing structure**:
  - Developer seats: $25 per developer per month
  - Video renders: $10 per 100 renders per month (self-hosted)
  - Scales with team size and render volume
- Includes prioritized support
- Includes $250 Mux credits (for Remotion Lambda)
- All features available

**Enterprise License:**
- Starting at $500/month
- Includes everything in Company License
- Private Slack/Discord support
- Monthly consulting sessions
- Custom terms, billing, and pricing
- Compliance forms
- Editor Starter included

**When Remotion's Licensing Works:**
- Small teams (≤3 people) can use it completely free
- Teams that need immediate access to Remotion Lambda/Cloud Run
- Organizations comfortable with per-seat and per-render pricing
- Projects where the cost is predictable and acceptable

**Cost Considerations:**
- For a team of 10 developers: $250/month base + render costs
- For high-volume rendering: Costs scale with render count
- Long-term costs can be significant for large teams or high-volume use cases
- May require budget approval and ongoing subscription management

### Performance Comparison: Architecture-Driven Speed

#### Helios: Performance-First Architecture

**Hardware Acceleration (Mandatory):**
- GPU acceleration is a **foundational requirement**, not optional
- Optimized launch flags across Linux, macOS, and Windows
- Built-in diagnostic tool (`helios.diagnose()`) verifies GPU acceleration status
- Prevents fallback to slow CPU-based software rendering (SwiftShader)
- Ensures consistent, high-performance rendering across environments

**Dual-Path Rendering Architecture:**

1. **Canvas-to-Video Path (WebCodecs API):**
   - **Bypasses DOM entirely** for canvas-based content
   - Direct capture of canvas as `VideoFrame` objects
   - Hardware-accelerated `VideoEncoder` processes frames
   - **Performance gain**: 3-10x faster than DOM-based rendering for WebGL/Three.js/Pixi.js
   - Zero DOM overhead, zero screenshot overhead
   - Ideal for: Three.js scenes, Pixi.js games, WebGL visualizations, particle systems

2. **DOM-to-Video Path (Screenshot-based):**
   - Uses Playwright for reliable DOM rendering
   - Optimized asset pre-loading prevents rendering artifacts
   - Efficient screenshot capture with minimal overhead
   - Ideal for: HTML/CSS compositions, SVG graphics, text-heavy videos

**In-Memory Data Piping:**
- **Zero-copy data flow** - Pipes image data directly from browser to FFmpeg's `stdin`
- Eliminates disk I/O bottlenecks (no temporary frame files)
- Reduces memory footprint and improves throughput
- **Performance gain**: 20-40% faster than file-based approaches for long videos

**Animation Performance:**
- Web Animations API leverages browser's optimized animation engine
- Animations run **off the main thread** when possible
- Browser handles interpolation for thousands of properties efficiently
- No per-frame JavaScript execution overhead
- **Performance gain**: Significantly faster for complex, multi-property animations

**Browser Automation:**
- Playwright's auto-waiting reduces flaky renders and retries
- Cross-browser support enables testing on fastest available browser
- Superior resilience means fewer failed renders and restarts

**Performance Benchmarks (Estimated):**
- Canvas rendering (WebCodecs): **3-10x faster** than DOM-based for WebGL content
- Memory usage: **30-50% lower** due to in-memory piping
- Render startup time: **Faster** due to optimized browser launch flags
- Multi-property animations: **2-5x faster** due to WAAPI offloading

#### Remotion: Balanced Performance

**Rendering Architecture:**
- **Unified DOM-based path** - All compositions render through DOM, even canvas content
- Screenshot-based capture for every frame
- Versatile but introduces overhead for canvas-heavy workloads
- WebCodecs support planned but not yet production-ready

**Performance Characteristics:**
- Good performance for DOM-based compositions (HTML, CSS, SVG)
- Canvas content must go through DOM rendering pipeline
- May involve intermediate file writes depending on FFmpeg wrapper configuration
- GPU acceleration supported but not as aggressively optimized

**Animation Performance:**
- Frame-based model requires JavaScript execution on every frame
- Developers manually handle interpolation and timing
- More flexible but potentially less performant for complex animations
- React re-renders on every frame can add overhead

**Performance Considerations:**
- DOM overhead for canvas-based content
- Screenshot capture for every frame (even when unnecessary)
- Potential file I/O bottlenecks depending on configuration
- React rendering cycle overhead for frame updates

**When Performance Differences Matter:**

**Choose Helios for performance-critical scenarios:**
- High-volume rendering (thousands of videos per day)
- Canvas-heavy applications (WebGL, Three.js, Pixi.js)
- Real-time or near-real-time rendering requirements
- Resource-constrained environments (lower memory, CPU usage)
- Complex animations with many simultaneous properties
- Long-duration videos where efficiency compounds

**Remotion is sufficient when:**
- Rendering volume is moderate
- Compositions are primarily DOM-based (HTML/CSS)
- Performance is "good enough" rather than critical
- Developer productivity is prioritized over raw speed
- Team is already invested in React ecosystem

### Performance Summary

| Metric | Helios | Remotion | Winner |
|--------|--------|----------|--------|
| **Canvas/WebGL Rendering** | WebCodecs API (3-10x faster) | DOM-based (baseline) | **Helios** |
| **Memory Usage** | In-memory piping (30-50% lower) | File-based (higher) | **Helios** |
| **Animation Performance** | WAAPI offloading (2-5x faster) | Frame-based JS (baseline) | **Helios** |
| **DOM Rendering** | Optimized Playwright path | Puppeteer-based | **Helios** |
| **Startup Time** | Optimized GPU flags | Standard setup | **Helios** |
| **Developer Productivity** | Framework adapters | React-first (excellent DX) | **Remotion** |
| **Maturity & Stability** | Alpha (early stage) | Production-ready | **Remotion** |
| **Distributed Rendering** | Planned (V2) | Available now | **Remotion** |

### When to Choose Helios

- You need framework flexibility (React, Vue, Svelte, or vanilla JS)
- Your project heavily uses canvas/WebGL (Three.js, Pixi.js, etc.)
- Performance is a critical requirement
- You want to build commercial products and video platforms (ELv2 allows this!)
- You prefer leveraging native browser APIs (WAAPI, WebCodecs)
- You need multiple independent compositions on the same page
- You're a founder building a video platform or product (our target customers!)

### When to Choose Remotion

- Your team is React-focused and comfortable with React patterns
- You need distributed rendering immediately (Remotion Lambda/Cloud Run)
- You want a mature, production-ready solution with extensive documentation
- You're building data-driven video applications with React components
- You prefer a frame-based animation model with fine-grained control
- You need Remotion Studio for rapid development iteration

Both projects share a commitment to programmatic video creation and excellent developer experience, but their different architectural choices make them suited for different use cases and team preferences.

## Project Status
Alpha: This project is in the early stages of development. The architecture is defined, but the API is subject to change. We are actively seeking contributors to help shape the future of the project!
## Roadmap: The Future of Helios
Our vision extends beyond the initial release. Here are some of our future goals:
### V2: Distributed Rendering & Advanced Audio
- **Distributed Rendering**: We will implement a scalable, serverless rendering model inspired by Remotion Lambda. The architecture will split a video into `N` logical chunks and render them in parallel on platforms like AWS Lambda or Google Cloud Run.
  - **Critical Detail: Concatenation Strategy**: The success of this architecture hinges on the final merge step. FFmpeg's `concat` **demuxer** is the only method that can losslessly stitch MP4 chunks without a costly and quality-degrading re-encode. This is essential for a fast and efficient distributed workflow. Methods like the `concat` filter or protocol are unsuitable as they either re-encode or do not support the MP4 container format.
- **Advanced Audio Engine**: We plan to integrate a more sophisticated audio processing library (e.g., Tone.js) for creating generative audio and applying real-time effects programmatically.

### V3: Native Node.js Encoding
For the ultimate in performance, we will investigate replacing the spawned FFmpeg process with a library like **`beamcoder`**. This would provide direct Node.js bindings to FFmpeg's underlying C libraries, allowing for in-process encoding and eliminating the overhead of process spawning, albeit at the cost of increased build complexity.
## Deployment Strategies
A robust deployment strategy is essential for a server-side rendering tool. The architecture is designed to support both simple, single-machine deployments and highly scalable, distributed rendering on cloud infrastructure.

### Containerized Rendering with Docker
Docker is the ideal packaging and deployment mechanism for the rendering engine. It ensures a consistent, reproducible environment containing Node.js, a headless browser, FFmpeg, and all necessary dependencies for GPU acceleration. The container can be designed as a microservice, exposing an HTTP endpoint to accept render jobs.

### Distributed Rendering: AWS Lambda vs. Google Cloud Run
The architecture is designed to be container-native and platform-agnostic, giving users a choice of serverless platforms that fit their needs.

- **AWS Lambda**: Ideal for users prioritizing hyper-parallelism and minimum render time. Lambda is optimized for massive, fine-grained parallelism, which is perfect for splitting a video render across hundreds or thousands of concurrent function executions. This requires a chunking architecture and a final stitching step.
- **Google Cloud Run**: Ideal for users prioritizing simplicity and long-running jobs. Cloud Run can run standard Docker containers for extended periods (up to 24 hours), allowing a single container invocation to render an entire video from start to finish without the complexity of chunking and stitching.

#### Distributed Rendering Workflow and Concatenation
The success of a distributed rendering architecture hinges on the video concatenation strategy. Merging video chunks must be done without a costly re-encode. FFmpeg offers several methods, but only one is suitable:

| Method | How it Works | Supported Formats | Use Case for This Project |
|---|---|---|---|
| **Concat Demuxer** | Operates at the file level from a text file list. Can stream copy if codecs match. | All formats, including MP4. | **Recommended**. The only method for losslessly stitching MP4 chunks. |
| Concat Protocol | Operates at the bitstream level. | Simple stream formats (e.g., MPEG-2 PS). Not compatible with MP4. | Unsuitable. Will fail or corrupt MP4 files. |
| Concat Filter | A complex filter that decodes and re-encodes frames. | All formats. | Unsuitable. Re-encoding is slow and causes quality loss. |

The distributed workflow is as follows:
1.  **Orchestration**: A coordinator function (e.g., AWS Step Function) divides the video into `N` logical chunks (e.g., frames 0-299, 300-599, etc.).
2.  **Parallel Execution**: The orchestrator invokes `N` parallel workers (e.g., Lambda functions), assigning each a frame range.
3.  **Chunk Rendering**: Each worker renders its video and audio segments as separate files (e.g., `chunk_1.mp4`, `chunk_1.aac`) and uploads them to a shared location like S3.
4.  **Final Stitching**: A final assembly job uses FFmpeg's `concat` demuxer to perform a fast, lossless merge of the video and audio chunks into the final output file.

### Development Workflow & Debugging
A seamless local development workflow is crucial for productivity. We recommend a hot-reloading environment for developers working on the library itself or on compositions using it.

- **Hot Reloading**: A recommended setup involves using `npm link` or `yarn link` to link your local library source code to a sample project (e.g., a Vite + React app). Running the library's bundler in "watch" mode alongside the sample project's dev server provides a near-instant feedback loop.
- **Debugging**: Debugging issues inside a headless browser can be challenging. We provide several tools to make it easier:
  - **Headed Mode**: Run the render process in a visible browser window using a `--headed` flag. Often, simply watching the automation unfold is the fastest way to spot an issue.
  - **Remote Debugging**: A `--debug` flag can launch the browser with a remote debugging port open. This allows you to connect the familiar Chrome DevTools to the headless instance to inspect the DOM, view console logs, and debug JavaScript live.
  - **Playwright Trace Viewer**: For post-mortem analysis, you can enable Playwright's Trace Viewer. It captures a complete trace of a render, including a video screencast, live DOM snapshots, console logs, and network requests, which is invaluable for diagnosing failed renders.

## License

Helios Engine is licensed under the **Elastic License 2.0 (ELv2)**. This license is designed to encourage widespread adoption while protecting our ability to build a SaaS platform.

### What This Means

**You Can:**
- ✅ **Build commercial products** - Use Helios Engine in any commercial application or product
- ✅ **Embed in applications** - Include Helios Engine in your software, whether open source or proprietary
- ✅ **Modify and distribute** - Fork, modify, and distribute Helios Engine
- ✅ **Create video platforms** - Build video creation tools, editors, or platforms using Helios Engine
- ✅ **Use internally** - Use Helios Engine for internal business purposes without restrictions
- ✅ **Sell products** - Sell products that use or include Helios Engine
- ✅ **Contribute** - Contribute improvements back to the open source project

**You Cannot:**
- ❌ **Offer Helios as a managed service** - You cannot provide Helios Engine as a hosted/managed service (SaaS) to third parties
- ❌ **Resell Helios infrastructure** - You cannot offer Helios Engine rendering infrastructure as a service

**What This Means in Practice:**

This license is **perfect for founders building video platforms**. You can:
- Build a video editing SaaS platform using Helios Engine ✅
- Create a video generation tool for your customers ✅
- Build a white-label video creation platform ✅
- Embed Helios Engine in your application ✅
- Sell products that use Helios Engine ✅

You just can't offer Helios Engine itself as a managed/hosted service to others.

### Why Elastic License 2.0?

We chose Elastic License 2.0 because:
- **Encourages adoption** - Developers can build commercial products without restrictions
- **Protects SaaS opportunity** - Prevents competitors from offering Helios as a managed service
- **Well-established** - Used by Elasticsearch, Kibana, and other successful projects
- **Clear boundaries** - Simple rule: build products ✅, offer managed services ❌
- **Founder-friendly** - Perfect for founders building video platforms (our target customers!)

This license allows us to build a SaaS platform around Helios while enabling a thriving ecosystem of products built on top of it.

### Commercial Licensing

If you need to offer Helios Engine as a managed service or have questions about commercial licensing, please [contact us](mailto:me@gavinbintz.com).

## Services & Commercial Offerings

Helios Engine is free and open source, allowing you to build video creation applications without restrictions. To support ongoing development and provide managed infrastructure, we plan to offer the following commercial services in the future:

### Helios API (API as a Service) 🚀 *Primary Service*

**Programmatic video rendering without managing infrastructure.**

Render videos programmatically via REST API. Ideal for developers who want to integrate video creation into their applications without managing rendering infrastructure, GPU acceleration, or distributed rendering systems.

**Planned Features:**
- **REST API** - Simple HTTP endpoints for video rendering
- **Webhook notifications** - Get notified when renders complete
- **Queue management** - Priority queues, batch rendering, job status tracking
- **Distributed rendering** - Leverage our infrastructure for fast, scalable rendering
- **Multiple formats** - MP4, WebM, GIF, and more
- **Custom resolutions** - Render at any resolution up to 4K
- **SDKs** - Official SDKs for popular languages (JavaScript, Python, etc.)

**Use Cases:**
- Integrate video generation into your SaaS platform
- Build automated video workflows
- Generate personalized videos at scale
- Create video content from templates and data
- Add video creation capabilities to existing applications

**Pricing Model (Planned):**
- **Pay-as-you-go** - Per-minute rendering costs
- **Render credits** - Bulk purchases with discounts
- **Free tier** - Limited renders per month for testing and development
- **Enterprise plans** - Custom pricing with SLA guarantees, dedicated infrastructure

This service is designed for developers and teams who want the power of Helios Engine without the complexity of managing rendering infrastructure. Perfect for founders building video platforms who need reliable, scalable rendering infrastructure.

### Helios Cloud (Managed Platform)

**A hosted video creation platform powered by Helios Engine.**

A full-featured SaaS platform for creating, editing, and managing videos. Built on Helios Engine, providing a user-friendly interface for non-technical users while leveraging the performance of the underlying engine.

**Planned Features:**
- Web-based video editor
- Integrations with data sources (e.g. databases, APIs)
- Template library with pre-built templates for common use cases
- Collaboration tools for teams
- Asset management (images, videos, audio, fonts)
- Analytics and insights

**Target Users:**
- Content creators
- Marketing teams
- Agencies
- Non-technical users who want video creation capabilities

### Enterprise Services

**For organizations with advanced requirements:**

- **Enterprise Support** - SLA-backed support, dedicated account management, priority assistance
- **Professional Services** - Custom implementations, integrations, architecture consulting
- **On-Premise Deployments** - Self-hosted Helios Engine for organizations with security/compliance requirements
- **Commercial Licensing** - For companies that want to offer Helios Engine as a managed service to their customers
- **Training & Certification** - Developer training, best practices workshops, official certification programs

### Marketplace & Ecosystem

**A marketplace for Helios extensions and assets:**

- **Template Marketplace** - Video templates created by the community
- **Plugin System** - Extensions and integrations for Helios Engine
- **Asset Marketplace** - Stock footage, music, graphics optimized for Helios
- **Integration Marketplace** - Pre-built integrations with popular tools and platforms

### Our Business Model

**Free engine, paid infrastructure and services.**

Similar to successful open-source companies like MongoDB (Atlas), Elastic (Elastic Cloud), and GitLab (GitLab.com), we believe in:

- **Open source core** - Helios Engine remains free and open source forever
- **Managed services** - Pay for convenience, scale, and support
- **Ecosystem growth** - Marketplace and community-driven extensions

This model ensures:
- ✅ Unlimited adoption of Helios Engine (no licensing barriers)
- ✅ Sustainable business to support long-term development
- ✅ Thriving ecosystem of products built on Helios
- ✅ Multiple options for users (self-hosted or managed services)

**For developers:** Use Helios Engine for free. Build your applications, deploy your own infrastructure, and scale as needed.

**For teams that want managed infrastructure:** Use Helios API or Helios Cloud to offload infrastructure management and focus on building your product.

We're committed to keeping Helios Engine open source and free, while building sustainable commercial services that add value for teams that need managed infrastructure and support.

See [LICENSE](LICENSE) for the full license text.
