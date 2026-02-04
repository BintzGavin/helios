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

**Behavior**:
Prompts the user for:
1. Components directory (default: `src/components`)
2. Library directory (default: `src/lib`)

Generates `helios.config.json` in the current working directory.

### `helios add`

Adds a component from the Helios registry to your project.

```bash
helios add <component>
```

**Arguments**:
- `<component>`: The name of the component to install (e.g., `Timer`, `ProgressBar`).

**Behavior**:
1. Looks up the component in the built-in registry.
2. Downloads/Copies the component source code to your configured `components` directory.
3. Installs any necessary dependencies (prints a list of required packages).

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

### `helios studio`

Launches the Helios Studio development server.

```bash
helios studio [options]
```

**Behavior**:
Starts a local development server for visual editing of your compositions.
