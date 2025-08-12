# Helios Engine
(https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
(https://img.shields.io/discord/830822222995710024?color=7289DA&label=discord&logo=discord&logoColor=white)](https://discord.gg/your-invite-link)

Helios is a modern, performant, and framework-agnostic engine for programmatic video creation.
The vision is to empower developers to create high-quality, dynamic videos using standard web technologies (HTML, CSS, JS) without being locked into a specific UI framework. Helios prioritizes performance, a superior developer experience, and a flexible architecture that leverages native browser APIs to deliver a next-generation video creation toolkit for the web.
Table of Contents
 * Core Principles
   -(#architectural-deep-dive)
   -(#1-the-composition-layer-the-authoring-experience)
   -(#2-the-animation-system-a-modern-performant-approach)
   -(#3-the-rendering-pipeline-the-engine)
   -(#technology-stack)
   -(#project-status)
   -(#roadmap-the-future-of-helios)
   -(#v2-distributed-rendering--advanced-audio)
   * V3: Native Node.js Encoding
     -(#getting-started-for-contributors)
 * Contributing
 * License
Core Principles
The development of Helios is guided by a set of foundational principles that inform every architectural decision.
 * Performance First: The engine is architected for speed. We prioritize hardware-accelerated rendering paths, minimize I/O bottlenecks by piping data in memory, and leverage the most efficient browser APIs available. Performance is treated as a core feature, not an afterthought.
 * Truly Framework-Agnostic: The core logic is written in pure TypeScript with zero UI framework dependencies. Integration is achieved through a "headless" API and lightweight, idiomatic adapters for popular frameworks. This ensures developers can use the tools they already know and love without being forced into a specific ecosystem.
 * Leverage Web Standards: We prefer native, modern browser APIs over custom or third-party implementations wherever possible. This includes a deep integration with the Web Animations API (WAAPI) for animation control and the WebCodecs API for high-performance encoding, ensuring our engine is future-proof and aligned with the web platform.
 * Superior Developer Experience (DevEx): A library is only as good as its usability. We are committed to providing clear, comprehensive documentation, powerful debugging tools (including headed mode and remote debugging), and a seamless local development workflow with features like hot-reloading.
 * Resilience & Reliability: Programmatic rendering can be complex. The rendering process must be stable and predictable. We build upon a foundation of modern, reliable tooling like Playwright, which offers sophisticated auto-waiting mechanisms to eliminate the flaky tests and inconsistent outputs that often plague browser automation.
Architectural Deep Dive
Helios is designed with a modular and flexible architecture that separates logic from presentation, providing developers with maximum power and control.
1. The Composition Layer: The Authoring Experience
This layer defines how developers create and describe their video content. Our approach is centered around a "headless" philosophy, providing the brains of the operation while giving you full control over the looks.
Headless Logic Engine
The core of the library is an instantiable JavaScript class that manages all video state (e.g., currentFrame, duration, isPlaying, inputProps). It exposes methods (play, pause, seek) and a subscription model (subscribe) for state changes. This decouples the core logic from any UI framework and avoids the use of brittle global objects, allowing multiple compositions to coexist safely.
Framework Adapters
To provide an idiomatic developer experience, we will offer small, dedicated NPM packages that serve as lightweight wrappers for popular frameworks. These adapters consume the core headless engine and expose its state in a way that feels native to each ecosystem:
 * React: A useVideoFrame() hook that provides the current frame state and triggers re-renders automatically.
 * Svelte: A readable store that developers can subscribe to with the $ syntax for seamless reactivity.
 * Vue: A composable function that returns a set of reactive properties for use in Vue's Composition API.
Web Component Player
For the in-browser preview, the player UI (scrubber, controls, etc.) is encapsulated as a standard Web Component (<helios-player>). This ensures maximum portability and isolation. The player can be dropped into any HTML page, regardless of the surrounding framework, without style or script conflicts. It uses a sandboxed <iframe> internally to render the user's composition, providing a clean and isolated environment for a true WYSIWYG preview.
2. The Animation System: A Modern, Performant Approach
Instead of inefficiently re-running user JavaScript on every single frame, Helios leverages the browser's native Web Animations API (WAAPI) for a more declarative and performant animation model.
 * How it Works: Developers define their animations using standard, declarative web technologies like CSS @keyframes or the element.animate() JavaScript method. The Helios engine then programmatically controls the animation's master timeline by setting document.timeline.currentTime to the precise time corresponding to the current frame.
 * The Advantages:
   * Performance: This approach offloads the heavy lifting of calculating interpolated values for all animated properties to the browser's own highly-optimized animation engine, which can often run off the main thread.
   * Decoupling: It fundamentally separates the animation definition from the rendering loop. The developer defines the animation once, and the library's loop performs only one simple operation per frame.
   * Familiarity: It allows developers to use the full power of the web platform with an API that is already a web standard, making the composition code cleaner and more portable.
3. The Rendering Pipeline: The Engine
The server-side engine transforms a composition into a final video file. It features a powerful dual-path architecture to select the most efficient rendering strategy based on the nature of the composition.
Path 1: Canvas-to-Video (High-Performance & Preferred)
 * Use Case: Compositions that render exclusively to an HTML <canvas> element. This is ideal for content created with WebGL (e.g., Three.js), 2D graphics libraries (e.g., Pixi.js), or the native Canvas2D API.
 * Technology: This path uses the modern WebCodecs API to directly and efficiently encode canvas frames into video chunks. This process is hardware-accelerated where available and completely bypasses the overhead of rendering a full DOM and taking a screenshot, resulting in significant speed gains.
Path 2: DOM-to-Video (Versatile)
 * Use Case: Compositions that rely on the standard DOM, including HTML elements, CSS styling, and SVG graphics.
 * Technology: This path uses Playwright to launch a headless browser, render the full DOM for each frame, and capture a screenshot. This provides broad compatibility for any content that can be rendered in a web browser.
GPU Acceleration: A Foundational Requirement
For Helios, GPU acceleration is not an optional tweak but a mandatory, foundational requirement for competitive performance. By default, headless browsers often fall back to slow, CPU-based software rendering.
 * Implementation: We will ship with optimized launch flags to enable hardware acceleration across different platforms (Linux, macOS, Windows).
 * Diagnostics: To combat the common friction of environment configuration, the library will include a built-in diagnostic tool (helios.diagnose()) that programmatically checks chrome://gpu to verify that hardware acceleration is active and warns the user with helpful guidance if it is not.
Video & Audio Encoding with FFmpeg
All rendering paths feed their output into FFmpeg, the industry-standard tool for video manipulation.
 * Direct Execution: We spawn FFmpeg directly as a child process from Node.js. This is a more stable and future-proof approach than relying on third-party JavaScript wrappers, which can become outdated or introduce an unnecessary layer of abstraction.
 * Performance Optimization: To minimize disk I/O, which can be a major bottleneck, the engine pipes image data (as buffers) directly from the browser to FFmpeg's stdin, avoiding the need to write thousands of temporary frame files to disk.
Technology Stack
 * Browser Automation: Playwright - Chosen for its superior resilience (auto-waiting), native cross-browser support (Chromium, Firefox, WebKit), and modern API.
 * Video Encoding: FFmpeg - Invoked directly via child_process.spawn for maximum control, stability, and performance.
 * Core Language: TypeScript - For type safety, improved developer experience, and a more maintainable codebase.
 * Bundling: Vite / Rollup - Modern, fast, and optimized for building libraries.
Project Status
Alpha: This project is in the early stages of development. The architecture is defined, but the API is subject to change. We are actively seeking contributors to help shape the future of the project!
Roadmap: The Future of Helios
Our vision extends beyond the initial release. Here are some of our future goals:
V2: Distributed Rendering & Advanced Audio
 * Distributed Rendering: We will implement a scalable, serverless rendering model inspired by Remotion Lambda. The architecture will split a video into chunks and render them in parallel on platforms like AWS Lambda and Google Cloud Run.
   * Critical Detail: The final merge step will use FFmpeg's concat demuxer. This is the only method that can losslessly stitch MP4 chunks without a costly and quality-degrading re-encode, which is essential for a fast and efficient distributed workflow.
 * Advanced Audio Engine: We plan to integrate a more sophisticated audio processing library (e.g., Tone.js) for creating generative audio and applying real-time effects programmatically.
V3: Native Node.js Encoding
For the ultimate in performance, we will investigate replacing the spawned FFmpeg process with a library like beamcoder. This would provide direct Node.js bindings to FFmpeg's underlying C libraries, allowing for in-process encoding and eliminating the overhead of process spawning, albeit at the cost of increased build complexity.
Getting Started (for Contributors)
We are excited to have you contribute! Here’s how to get your development environment set up.
 * Fork & Clone: Fork the repository and clone it to your local machine.
   git clone https://github.com/your-username/helios-engine.git
cd helios-engine

 * Install Dependencies: Navigate to the project root and run:
   npm install

 * Build the Library: To run a one-time build of the library, use:
   npm run build

   For a development server that watches for changes and enables hot-reloading, use:
   npm run dev

Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.
Please read our CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests to us.
How to Contribute
 * Find an Issue: Look for existing issues or create your own to discuss a new feature or bug.
 * Fork the Project: Create your own fork of the project to work on.
 * Create a Branch: git checkout -b feature/AmazingFeature
 * Commit Your Changes: git commit -m 'Add some AmazingFeature'
 * Push to the Branch: git push origin feature/AmazingFeature
 * Open a Pull Request: Create a pull request with a clear description of your changes, linking it to the relevant issue.
License
Distributed under the MIT License. See LICENSE for more information.
