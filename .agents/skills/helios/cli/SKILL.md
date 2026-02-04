---
name: helios-cli
description: Command Line Interface for Helios. Use when you need to initialize projects, add components, launch the studio, or trigger renders from the terminal.
---

# Helios CLI

The Helios CLI is the primary entry point for developing and rendering video compositions. It wraps the core, renderer, and studio packages into a unified toolchain.

## Quick Start

```bash
# Install globally (optional)
npm install -g helios-cli

# Initialize a new project
npx helios init my-video-project

# Start the Studio
npx helios studio

# Render a video
npx helios render composition.html output.mp4
```

## Commands

### `init`
Scaffold a new Helios project with a chosen template.

```bash
npx helios init [project-name]
```
- **Templates:** React, Vue, Svelte, Solid, Vanilla, etc.
- **Setup:** Installs dependencies and creates a basic composition.

### `studio`
Launch the interactive development environment (Studio).

```bash
npx helios studio
```
- **Port:** Defaults to 5173.
- **Environment:** Sets `NODE_ENV=development`.
- **Hot Reloading:** Enabled by default via Vite.

**Environment Variables:**
- `HELIOS_PROJECT_ROOT`: Specify a custom root directory.
  ```bash
  HELIOS_PROJECT_ROOT=./projects/promo npx helios studio
  ```

### `render`
Render a composition to a video file.

```bash
npx helios render <input-file> <output-file> [options]
```

**Arguments:**
- `<input-file>`: Path to the composition HTML file (e.g., `src/composition.html`).
- `<output-file>`: Path for the output video (e.g., `out.mp4`).

**Options:**
- `-w, --width <number>`: Output width (default: 1920).
- `-h, --height <number>`: Output height (default: 1080).
- `-f, --fps <number>`: Frames per second (default: 30).
- `-d, --duration <number>`: Duration in seconds.
- `-q, --quality <number>`: Quality (CRF/Bitrate depending on codec).
- `--headless`: Run in headless mode (default: true).

### `add`
Add a pre-built component to your project from the Helios Registry.

```bash
npx helios add <component-name>
```
- **registry:** Downloads component source code into your `src/components/` directory.
- **Dependencies:** Automatically checks and warns about missing peer dependencies.

### `components`
List all available components in the Helios Registry.

```bash
npx helios components
```

## Common Workflows

### Creating a New Project
```bash
npx helios init daily-update
cd daily-update
npm install
npx helios studio
```

### Adding a Component
```bash
# Add a progress bar component
npx helios add ProgressBar

# Add a watermark component
npx helios add Watermark
```

### Production Render
```bash
# Render a high-quality 4K video
npx helios render src/index.html promo.mp4 --width 3840 --height 2160 --fps 60
```
