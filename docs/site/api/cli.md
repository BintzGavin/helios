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
- `--width <number>`: Viewport width (default: `1920`).
- `--height <number>`: Viewport height (default: `1080`).
- `--fps <number>`: Frames per second (default: `30`).
- `--duration <number>`: Duration in seconds (default: `1`).
- `--quality <number>`: CRF quality (0-51). Lower is better quality.
- `--mode <mode>`: Render mode (`canvas` or `dom`) (default: `canvas`).
- `--no-headless`: Run in a visible browser window (useful for debugging).

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
