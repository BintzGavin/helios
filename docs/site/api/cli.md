---
title: "CLI API"
description: "API Reference for @helios-project/cli"
---

# CLI API

The `@helios-project/cli` package provides the command-line interface for managing Helios projects, installing components, and rendering compositions.

## Commands

### `helios init`

Initializes a new Helios project by creating a `helios.config.json` file.

```bash
helios init [options]
```

**Options**:
- `-y, --yes`: Skip prompts and use default configuration.
- `--framework <framework>`: Specify the framework (react, vue, svelte, vanilla, solid).

**Behavior**:
Prompts the user for:
1. Components directory (default: `src/components`)
2. Library directory (default: `src/lib`)

Generates `helios.config.json` in the current working directory.

### `helios add`

Adds a component from the Helios registry to your project.

```bash
helios add <component> [options]
```

**Arguments**:
- `<component>`: The name of the component to install (e.g., `Timer`, `ProgressBar`).

**Options**:
- `--no-install`: Skip automatic dependency installation.

**Behavior**:
1. Looks up the component in the built-in registry.
2. Downloads/Copies the component source code to your configured `components` directory.
3. Installs any necessary dependencies (unless `--no-install` is used).

### `helios update`

Updates a component to the latest version from the registry.

```bash
helios update <component>
```

### `helios remove`

Removes a component from the project configuration.

```bash
helios remove <component>
```

### `helios list`

Lists installed components in the project.

```bash
helios list
```

### `helios components`

Lists all available components in the registry.

```bash
helios components
```

**Output**:
Displays a list of component names and types available for installation via `helios add`.

### `helios render`

Renders a composition to a video file using `@helios-project/renderer`.

```bash
helios render <input> [options]
```

**Arguments**:
- `<input>`: Path or URL to the composition entry point (e.g., `src/index.html` or `http://localhost:3000`).

**Options**:
- `-o, --output <path>`: Output file path (default: `output.mp4`).
- `--duration <seconds>`: Duration in seconds; fractions are fine (e.g. `12.5`). Defaults to the composition's `window.helios` duration. A page without one needs this flag.
- `--fps <number>`: Frames per second (default: the composition's, else `30`).
- `--width <number>`: Viewport width (default: the composition's, else `1920`).
- `--height <number>`: Viewport height (default: the composition's, else `1080`).
- `--audio <file>`: Audio file to use as the soundtrack.
- `--quality <number>`: CRF quality (0-51). Lower is better quality.
- `--mode <mode>`: `dom` screenshots the page and works for any page; `canvas` captures the first `<canvas>` and is faster (default: `dom`).
- `--gpu` / `--no-gpu`: Enable or disable GPU acceleration in the browser (for WebGL).
- `--no-headless`: Run in a visible browser window (useful for debugging).

**Pages that draw their own frames**: a page that defines `window.renderAt(t)` (or `window.seek(t)`, or `window.__render(t)`) is called once per frame with the time `t` in seconds, and the frame is captured when it returns. If it returns a promise, the frame is captured after the promise resolves. The page needs no Helios import:

```bash
helios render page.html -o video.mp4 --duration 15 --audio song.mp3
```

### `helios still`

Renders frames of a composition as PNGs without encoding a video. Use it to check your work while you build it.

```bash
helios still <input> --at <seconds>[,<seconds>...] [options]
```

**Options**:
- `--at <seconds>`: Time or times to capture, comma-separated (e.g. `0.5,3,7.25`).
- `-o, --output <path>`: The output file for one time, or a directory for several (default: `still-<t>s.png`).
- `--width`, `--height`: Viewport size (default: the composition's, else `1920`×`1080`).
- `--crop <x,y,w,h>`: Cut each frame to this region, in pixels.
- `--gpu` / `--no-gpu`, `--no-headless`: As for `render`.

### `helios sheet`

Renders a labelled contact sheet of frames as a single PNG.

```bash
helios sheet <input> [--at <times> | --every <seconds> | --strip <start:end>] [options]
```

**Options**:
- `--at <seconds>`: Exact times, comma-separated.
- `--every <seconds>`: One frame every N seconds across the duration.
- `--strip <start:end>`: Every frame in a range, at `--fps` (default: the composition's, else `30`).
- `--duration <seconds>`: The duration used by `--every` and by the default sheet (default: the composition's). With no frame selection, the sheet shows 12 frames spread across the duration.
- `--cols <n>`, `--cell-width <px>`: Grid layout (default: up to 4 columns of 480px).
- `--crop <x,y,w,h>`: Show only this region of each frame.
- `-o, --output <path>`: Output PNG (default: `sheet.png`).

### `helios merge`

Merges multiple video files into a single output file without re-encoding.

```bash
helios merge <output> [inputs...]
```

**Arguments**:
- `<output>`: Path to the output video file (e.g., `final.mp4`).
- `[inputs...]`: List of input video files to merge (e.g., `part1.mp4 part2.mp4`).

### `helios studio`

Launches the Helios Studio development server.

```bash
helios studio [options]
```

**Behavior**:
Starts a local development server for visual editing of your compositions.
