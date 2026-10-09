---
name: helios-skills
description: Collection of agent skills for Helios video engine. Use when working with programmatic video creation, browser-native animations, or Helios compositions. Install individual skills by path for specific capabilities.
---

# Helios Skills Collection

This catalog contains agent skills for [Helios](https://github.com/BintzGavin/helios), a browser-native video engine for programmatic animation and rendering. It lives in `skills/` of the Helios repository.

## Installation

This is a **collection** of skills. To use them, install individual skills by their path:

```bash
# Make a video (the entry skill, also shipped in the Helios agent plugin)
npx skills add BintzGavin/helios/plugins/helios/skills/make-video

# Getting started
npx skills add BintzGavin/helios/skills/getting-started

# Core skills
npx skills add BintzGavin/helios/skills/core
npx skills add BintzGavin/helios/skills/renderer
npx skills add BintzGavin/helios/skills/player
npx skills add BintzGavin/helios/skills/studio

# Workflows
npx skills add BintzGavin/helios/skills/workflows/create-composition
npx skills add BintzGavin/helios/skills/workflows/render-video
npx skills add BintzGavin/helios/skills/workflows/visualize-data

# Design / motion
npx skills add BintzGavin/helios/skills/design/animated-video-philosophy
npx skills add BintzGavin/helios/skills/design/cinematic-product-promo-plan

# Guided video creation
npx skills add BintzGavin/helios/skills/guided/motion-design-rules
npx skills add BintzGavin/helios/skills/guided/promo-video
npx skills add BintzGavin/helios/skills/guided/explainer-video
npx skills add BintzGavin/helios/skills/guided/product-demo
npx skills add BintzGavin/helios/skills/guided/testimonial-video
npx skills add BintzGavin/helios/skills/guided/launch-announcement
npx skills add BintzGavin/helios/skills/guided/social-clip

# Framework examples
npx skills add BintzGavin/helios/skills/examples/react
npx skills add BintzGavin/helios/skills/examples/vue
npx skills add BintzGavin/helios/skills/examples/svelte

# Animation libraries
npx skills add BintzGavin/helios/skills/examples/gsap
npx skills add BintzGavin/helios/skills/examples/framer-motion
npx skills add BintzGavin/helios/skills/examples/threejs
```

## Available Skills

### Make a Video

- **plugins/helios/skills/make-video** - The entry point, kept with the Helios agent plugin in `plugins/helios/` (one level up from this catalog). One HTML page with `window.renderAt(t)`, rendered to MP4 with `npx @helios-project/cli render`, checked with stills and contact sheets, with a soundtrack. Start here when asked for a video drawn with code.

### Getting Started

- **skills/getting-started** - Installation and quick start guide. Covers package installation, requirements (Node.js, FFmpeg), basic setup, and initial composition structure. Use when setting up a new Helios project.

### Core Package Skills

- **skills/core** - Core API for Helios video engine. Covers Helios class instantiation, signals, animation helpers, and DOM synchronization.
- **skills/renderer** - Server-side rendering of Helios compositions to video files.
- **skills/player** - Embeddable video player with composition playback and controls.
- **skills/studio** - Visual editor for Helios compositions.

### Workflow Skills

- **skills/workflows/create-composition** - Workflow for creating a new Helios composition.
- **skills/workflows/render-video** - Workflow for rendering compositions to video.
- **skills/workflows/visualize-data** - Workflow for data visualization animations.

### Design Skills

- **skills/design/animated-video-philosophy** - Working philosophy for animated video: story-first motion, pacing, shots, timing, composition, medium-specific grammar, technical commitments, and anti-patterns. Use when directing or critiquing motion and programmatic video.
- **skills/design/cinematic-product-promo-plan** - Template plan for a ~45s feeling-first cinematic product promo: brief through ship, hero-element journey, look/motion/audio, deliverables matrix, accessibility. Adapt to any product category.

### Guided Video Creation Skills

- **skills/guided/motion-design-rules** - Motion design framework: anti-slideshow architecture, visual layering, physics-based easing, choreography, and quality validation. Referenced by all guided video skills.
- **skills/guided/promo-video** - End-to-end promotional / hype video. High energy, beat-synced, CTA-driven.
- **skills/guided/explainer-video** - Explainer / walkthrough video. Narrative arc, section headers, measured pacing.
- **skills/guided/product-demo** - Product demo / showcase. Feature callouts, UI zoom-ins, progressive reveals.
- **skills/guided/testimonial-video** - Social proof / testimonial video. Quote typography, customer branding, trust signals.
- **skills/guided/launch-announcement** - Product launch / release announcement. Countdown motifs, dramatic reveal.
- **skills/guided/social-clip** - Short-form social clip (Reels/TikTok/Shorts). Vertical 9:16, punchy, loop-friendly.

### Framework Integration Skills

- **skills/examples/react** - React integration patterns
- **skills/examples/vue** - Vue integration patterns
- **skills/examples/svelte** - Svelte integration patterns
- **skills/examples/solid** - Solid.js integration patterns
- **skills/examples/vanilla** - Vanilla JavaScript patterns

### Animation Library Skills

- **skills/examples/gsap** - GSAP animation integration
- **skills/examples/framer-motion** - Framer Motion integration
- **skills/examples/lottie** - Lottie animation playback
- **skills/examples/threejs** - Three.js 3D scenes
- **skills/examples/pixi** - PixiJS 2D graphics
- **skills/examples/p5** - p5.js creative coding

### Data Visualization Skills

- **skills/examples/d3** - D3.js visualizations
- **skills/examples/chartjs** - Chart.js animated charts

### Rendering Technique Skills

- **skills/examples/canvas** - Canvas 2D rendering
- **skills/examples/signals** - Reactive signals patterns
- **skills/examples/tailwind** - Tailwind CSS styling
- **skills/examples/podcast-visualizer** - Audio visualization

## When to Use

Use these skills when:

- Creating programmatic video compositions
- Working with browser-native animations (CSS, WAAPI)
- Building video rendering pipelines
- Integrating Helios with React, Vue, Svelte, or other frameworks
- Using animation libraries like GSAP, Framer Motion, or Three.js
- Creating data visualizations as video
- Setting up Helios development workflows
- Applying a consistent philosophy to motion, pacing, and visual storytelling in video
- Planning or producing feeling-first cinematic product promos (see design/cinematic-product-promo-plan)

## Repository

View all skills at https://github.com/BintzGavin/helios/tree/main/skills and the plugin at https://github.com/BintzGavin/helios/tree/main/plugins/helios
