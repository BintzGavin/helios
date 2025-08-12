# Helios Engine
(https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
Helios is a modern, performant, and framework-agnostic engine for programmatic video creation.
The vision is to empower developers to create high-quality, dynamic videos using standard web technologies (HTML, CSS, JS) without being locked into a specific UI framework. Helios prioritizes performance, a superior developer experience, and a flexible architecture that leverages native browser APIs.
Core Principles
The development of Helios is guided by the following principles:
 * Performance First: The engine is architected for speed. We prioritize hardware-accelerated rendering paths, minimize I/O bottlenecks, and leverage the most efficient browser APIs available.
 * Truly Framework-Agnostic: The core logic is written in pure TypeScript with zero UI framework dependencies. Integration is achieved through lightweight, idiomatic adapters, ensuring developers can use the tools they already know and love. [1, 2, 3]
 * Leverage Web Standards: We prefer native, modern browser APIs over custom implementations. This includes deep integration with the Web Animations API (WAAPI) for animation control and the WebCodecs API for high-performance encoding. [4, 5, 6, 7, 8, 9, 10, 11]
 * Superior Developer Experience (DevEx): The library must be a pleasure to use. This means providing clear documentation, powerful debugging tools, and a seamless local development workflow. [12]
 * Resilience & Reliability: The rendering process must be stable and predictable. We build upon modern, reliable tooling like Playwright to minimize flaky or inconsistent outputs. [13, 14, 15, 16, 17]
Architectural Overview
Helios is designed with a modular and flexible architecture that separates logic from presentation.
1. The Composition Layer (The "How")
This layer defines the authoring experience for developers.
 * Headless Logic Engine: The core is an instantiable JavaScript class that manages all video state (e.g., currentFrame, duration, isPlaying). It exposes methods (play, pause, seek) and a subscription model for state changes, making it completely decoupled from any UI framework. [18, 19, 20, 21, 22]
 * Framework Adapters: To provide an idiomatic developer experience, we will offer small adapter packages for popular frameworks (e.g., a useVideoFrame() hook for React, a writable store for Svelte, a composable for Vue). [1, 3, 23]
 * Web Component Player: For the in-browser preview, the player UI (scrubber, controls, etc.) will be encapsulated as a standard Web Component (<helios-player>). This ensures maximum portability and isolation, allowing it to be dropped into any HTML page, regardless of the surrounding framework. [5, 24, 6, 25, 26, 27, 28]
2. The Animation System
Instead of inefficiently re-running user JavaScript on every frame, Helios will leverage the browser's native Web Animations API (WAAPI). [29, 30, 31]
 * Developers define animations declaratively using standard CSS or the element.animate() method. [32, 33, 34, 35, 36]
 * The Helios engine programmatically controls the animation timeline by setting document.timeline.currentTime.
 * This approach offloads the heavy lifting of interpolation to the browser's highly-optimized animation engine, resulting in superior performance and cleaner code. [37, 38, 39]
3. The Rendering Pipeline (The "What")
The server-side engine transforms a composition into a final video file using a powerful dual-path architecture.
 * Path 1: Canvas-to-Video (Preferred & High-Performance):
   * Use Case: Compositions that render exclusively to an HTML <canvas> (e.g., WebGL, Three.js, Pixi.js).
   * Technology: This path uses the WebCodecs API to directly encode canvas frames into video chunks with hardware acceleration, bypassing the DOM and screenshot overhead entirely for maximum speed. [4, 7, 8, 9, 10, 40, 41]
 * Path 2: DOM-to-Video (Versatile):
   * Use Case: Compositions using standard HTML, CSS, and SVG.
   * Technology: This path uses Playwright to launch a headless browser, render the DOM for each frame, and capture a screenshot. [42, 43, 44, 45, 46, 47]
Both paths feed their output into FFmpeg for final encoding and muxing into an MP4 file.
Technology Stack
 * Browser Automation: Playwright (for its resilience, cross-browser support, and modern API). [48, 49, 50, 51, 52, 53, 13, 14, 15, 16, 17]
 * Video Encoding: FFmpeg (invoked directly as a child process for stability and control). [54, 55, 56, 57, 58]
 * Core Language: TypeScript. [2, 59, 60]
 * Bundling: Vite / Rollup. [2, 59, 60]
Project Status
Alpha: This project is in the early stages of development. The architecture is defined, but the API is subject to change. We welcome contributors to help shape the future of the project!
Roadmap
Our vision extends beyond the initial release. Here are some of our future goals:
 * V2: Distributed Rendering: Implement a scalable, serverless rendering model inspired by Remotion Lambda. This will involve chunking videos and processing them in parallel on platforms like AWS Lambda and Google Cloud Run, using FFmpeg's concat demuxer for a lossless final merge. [61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72]
 * V2: Advanced Audio Engine: Integrate a more sophisticated audio processing library (e.g., Tone.js) for creating generative audio and applying real-time effects. [73, 74, 75, 76, 77, 78, 79]
 * V3: Native Node.js Encoding: For ultimate performance, we plan to investigate replacing the spawned FFmpeg process with a library like beamcoder, which provides direct Node.js bindings to FFmpeg's underlying C libraries. [80, 81, 82, 83, 84, 85, 86]
Getting Started (for Contributors)
 * Fork & Clone: Fork the repository and clone it to your local machine.
 * Install Dependencies: Navigate to the project root and run:bash
   npm install
   
 * Build the Library: To build the library for development, run:
   npm run build

   For a development server with hot-reloading, use: [87, 88, 89]
   npm run dev

Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.
Please read our CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests to us.
How to Contribute
 * Find an Issue: Look for existing issues or create your own.
 * Fork the Project: Create your own fork of the project to work on.
 * Create a Branch: git checkout -b feature/AmazingFeature
 * Commit Your Changes: git commit -m 'Add some AmazingFeature'
 * Push to the Branch: git push origin feature/AmazingFeature
 * Open a Pull Request: Create a pull request with a clear description of your changes.
License
Distributed under the MIT License. See LICENSE for more information.

