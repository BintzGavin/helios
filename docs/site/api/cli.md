---
title: "CLI API"
description: "API Reference for @helios-project/cli"
---

# CLI API

The `@helios-project/cli` package provides the command-line interface for managing Helios projects, installing components, running distributed jobs, and building for production.

## Installation

```bash
npm install -g @helios-project/cli
```

## Commands

### `helios init`

Initializes a new Helios project or scaffolds from an example.

```bash
helios init [target] [options]
```

**Arguments**:
- `[target]`: The directory to initialize the project in (defaults to current directory).

**Options**:
- `-y, --yes`: Skip prompts and use default configuration (React).
- `-f, --framework <framework>`: Specify the framework (`react`, `vue`, `svelte`, `solid`, `vanilla`).
- `--example <name>`: Initialize from a specific example in the repository.
- `--repo <repo>`: Specify the repository to fetch examples from (default: `BintzGavin/helios/examples`). Supports `user/repo` or `user/repo/path`.

**Examples**:
```bash
# Interactive mode
helios init

# Scaffold a React project in 'my-video' folder
helios init my-video --framework react

# Scaffold from an example
helios init --example chartjs-animation
```

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

Removes a component from the project configuration and warns about associated files.

```bash
helios remove <component>
```

### `helios list`

Lists installed components in the project as tracked in `helios.config.json`.

```bash
helios list
```

### `helios components`

Lists all available components in the registry that can be installed via `helios add`.

```bash
helios components
```

### `helios skills install`

Installs Helios AI agent skills into the current project.

```bash
helios skills install
```

**Behavior**:
Copies bundled skill definitions to `.agents/skills/helios` in your project, enabling AI agents to understand and generate Helios code.

### `helios job run`

Executes a distributed rendering job from a JSON specification.

```bash
helios job run <file> [options]
```

**Arguments**:
- `<file>`: Path to the job specification JSON file.

**Options**:
- `--chunk <id>`: Execute only a specific chunk ID (useful for distributed workers).
- `--concurrency <number>`: Number of concurrent chunks to run locally (default: `1`).
- `--no-merge`: Skip the final video merge step.

**Example Job Spec**:
```json
{
  "chunks": [
    { "id": 0, "command": "helios render ...", "outputFile": "chunk-0.mp4" },
    { "id": 1, "command": "helios render ...", "outputFile": "chunk-1.mp4" }
  ],
  "mergeCommand": "helios merge final.mp4 chunk-0.mp4 chunk-1.mp4"
}
```

### `helios build`

Builds the project for production deployment.

```bash
helios build [dir] [options]
```

**Arguments**:
- `[dir]`: The project root directory (default: `.`).

**Options**:
- `-o, --out-dir <dir>`: Output directory (default: `dist`).

**Behavior**:
Generates a production-ready static site in `dist/` containing your composition and a lightweight player wrapper.

### `helios preview`

Previews the production build locally.

```bash
helios preview [dir] [options]
```

**Arguments**:
- `[dir]`: The project root directory (default: `.`).

**Options**:
- `-o, --out-dir <dir>`: Directory to serve (default: `dist`).
- `-p, --port <number>`: Port to listen on (default: `4173`).

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
Starts a local development server for visual editing of your compositions. It respects `helios.config.json` configuration.
