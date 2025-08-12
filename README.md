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
- [Getting Started (for Contributors)](#getting-started-for-contributors)
- [Contributing](#contributing)
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
## Getting Started (for Contributors)
We are excited to have you contribute! Here’s how to get your development environment set up.
 - Fork & Clone: Fork the repository and clone it to your local machine.
   ```bash
   git clone https://github.com/your-username/helios-engine.git
   cd helios-engine
   ```

 - Install Dependencies: Navigate to the project root and run:
   ```bash
   npm install
   ```

 - Build the Library: To run a one-time build of the library, use:
   ```bash
   npm run build
   ```

   For a development server that watches for changes and enables hot-reloading, use:
   ```bash
   npm run dev
   ```
### Development Workflow & Debugging
A seamless local development workflow is crucial for productivity. We recommend a hot-reloading environment for developers working on the library itself or on compositions using it.

- **Hot Reloading**: A recommended setup involves using `npm link` or `yarn link` to link your local library source code to a sample project (e.g., a Vite + React app). Running the library's bundler in "watch" mode alongside the sample project's dev server provides a near-instant feedback loop.
- **Debugging**: Debugging issues inside a headless browser can be challenging. We provide several tools to make it easier:
  - **Headed Mode**: Run the render process in a visible browser window using a `--headed` flag. Often, simply watching the automation unfold is the fastest way to spot an issue.
  - **Remote Debugging**: A `--debug` flag can launch the browser with a remote debugging port open. This allows you to connect the familiar Chrome DevTools to the headless instance to inspect the DOM, view console logs, and debug JavaScript live.
  - **Playwright Trace Viewer**: For post-mortem analysis, you can enable Playwright's Trace Viewer. It captures a complete trace of a render, including a video screencast, live DOM snapshots, console logs, and network requests, which is invaluable for diagnosing failed renders.

## Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.
Please read our CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests to us.
#### How to Contribute
 - Find an Issue: Look for existing issues or create your own to discuss a new feature or bug.
 - Fork the Project: Create your own fork of the project to work on.
 - Create a Branch:
   ```bash
   git checkout -b feature/AmazingFeature
   ```
 - Commit Your Changes:
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
 - Push to the Branch:
   ```bash
   git push origin feature/AmazingFeature
   ```
 - Open a Pull Request: Create a pull request with a clear description of your changes, linking it to the relevant issue.
## License
Distributed under the MIT License. See LICENSE for more information.
