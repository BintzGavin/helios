# Helios Skills

Agent skills for [Helios](https://github.com/BintzGavin/helios), a browser-native video engine for programmatic animation and rendering. This catalog lives in [`skills/`](./) of the Helios repository. The Helios agent plugin, which carries the **make-video** entry skill, lives in [`plugins/helios`](../plugins/helios).

## Make a video

Ask your agent for a video drawn with code: motion graphics, a launch or explainer video, an animated chart, a logo reveal or a social clip. The **make-video** skill has it write one HTML page that draws any frame from its time `t`, then render the page frame-exact to MP4 with Helios, check stills and contact sheets, and add a soundtrack. Helios calls no generative model, so it isn't for live-action or AI-generated footage.

### Claude Code plugin

```
/plugin marketplace add BintzGavin/helios
/plugin install helios@helios
```

### Codex plugin

```bash
codex plugin marketplace add BintzGavin/helios
codex plugin add helios@helios
```

Other Agent Plugins 1.0 clients install it from [`plugins/helios`](../plugins/helios).

Either way, the plugin installs only the **make-video** skill. The rest of this catalog is reference material.

### Just the skill, via skills.sh

```bash
npx skills add BintzGavin/helios/plugins/helios/skills/make-video
```

## Installation

### Via skills.sh

Install using the [skills CLI](https://skills.sh). It lists the skills in this catalog together with **make-video**, and you pick the ones you want:

```bash
npx skills add BintzGavin/helios
```

Or install individual skills by path:

```bash
# Start here for new projects
npx skills add BintzGavin/helios/skills/getting-started

# Core packages
npx skills add BintzGavin/helios/skills/core
npx skills add BintzGavin/helios/skills/renderer
npx skills add BintzGavin/helios/skills/player
npx skills add BintzGavin/helios/skills/studio
```

## Available Skills

### Make a Video

- [**plugins/helios/skills/make-video**](../plugins/helios/skills/make-video) - The entry point. One HTML page with `window.renderAt(t)`, rendered to MP4 with `npx @helios-project/cli render`. Also covers stills and contact sheets for review, soundtracks, and music sync.

### Getting Started

- [**skills/getting-started**](./getting-started) - Installation and quick start guide. Covers package installation, requirements (Node.js, FFmpeg), basic setup, and initial composition structure.

### Core

- [**skills/core**](./core) - Core API for Helios video engine. Covers Helios class instantiation, signals, animation helpers, and DOM synchronization.

### Packages

- [**skills/renderer**](./renderer) - Server-side rendering of Helios compositions to video files.
- [**skills/player**](./player) - Embeddable video player with composition playback and controls.
- [**skills/studio**](./studio) - Visual editor for Helios compositions.

### Workflows

- [**skills/workflows/create-composition**](./workflows/create-composition) - Workflow for creating a new Helios composition.
- [**skills/workflows/render-video**](./workflows/render-video) - Workflow for rendering compositions to video.
- [**skills/workflows/visualize-data**](./workflows/visualize-data) - Workflow for data visualization animations.

### Design

- [**skills/design/animated-video-philosophy**](./design/animated-video-philosophy) - Working philosophy for animated video: story-first motion, shots and timing, composition, medium-specific grammar, technical commitments, and anti-patterns.
- [**skills/design/cinematic-product-promo-plan**](./design/cinematic-product-promo-plan) - Template production plan for ~45s feeling-first product promos (any category): brief through storyboard, visual/motion/audio specs, tooling, reframed cuts, accessibility, ship milestones.

### Guided Video Creation

End-to-end guided workflows for creating specific video types. Each skill extracts brand identity from your repo, generates beat-synced music, and produces a rendered video.

- [**skills/guided/motion-design-rules**](./guided/motion-design-rules) - Motion design framework: anti-slideshow architecture, visual layering, physics-based easing, choreography, and quality validation.
- [**skills/guided/promo-video**](./guided/promo-video) - Promotional / hype video. High energy, beat-synced, CTA-driven.
- [**skills/guided/explainer-video**](./guided/explainer-video) - Explainer / walkthrough video. Narrative arc, section headers, measured pacing.
- [**skills/guided/product-demo**](./guided/product-demo) - Product demo / showcase. Feature callouts, UI zoom-ins, progressive reveals.
- [**skills/guided/testimonial-video**](./guided/testimonial-video) - Social proof / testimonial video. Quote typography, customer branding, trust signals.
- [**skills/guided/launch-announcement**](./guided/launch-announcement) - Product launch / release announcement. Countdown motifs, dramatic reveal.
- [**skills/guided/social-clip**](./guided/social-clip) - Short-form social clip (Reels/TikTok/Shorts). Vertical 9:16, punchy, loop-friendly.

### Framework Examples

- [**skills/examples/react**](./examples/react) - React integration patterns
- [**skills/examples/vue**](./examples/vue) - Vue integration patterns
- [**skills/examples/svelte**](./examples/svelte) - Svelte integration patterns
- [**skills/examples/solid**](./examples/solid) - Solid.js integration patterns
- [**skills/examples/vanilla**](./examples/vanilla) - Vanilla JavaScript patterns

### Animation Libraries

- [**skills/examples/gsap**](./examples/gsap) - GSAP animation integration
- [**skills/examples/framer-motion**](./examples/framer-motion) - Framer Motion integration
- [**skills/examples/lottie**](./examples/lottie) - Lottie animation playback
- [**skills/examples/threejs**](./examples/threejs) - Three.js 3D scenes
- [**skills/examples/pixi**](./examples/pixi) - PixiJS 2D graphics
- [**skills/examples/p5**](./examples/p5) - p5.js creative coding

### Data Visualization

- [**skills/examples/d3**](./examples/d3) - D3.js visualizations
- [**skills/examples/chartjs**](./examples/chartjs) - Chart.js animated charts

### Rendering Techniques

- [**skills/examples/canvas**](./examples/canvas) - Canvas 2D rendering
- [**skills/examples/signals**](./examples/signals) - Reactive signals patterns
- [**skills/examples/tailwind**](./examples/tailwind) - Tailwind CSS styling
- [**skills/examples/podcast-visualizer**](./examples/podcast-visualizer) - Audio visualization

## License

The skills in this catalog and the Helios agent plugin in [`plugins/helios`](../plugins/helios) are licensed under Apache 2.0. See [LICENSE](LICENSE) for details. The rest of the Helios repository, including the engine packages, is licensed under the [Elastic License 2.0](../LICENSE).
