# Helios Studio

**The browser-based development environment for programmatic video.**

Helios Studio is a visual interface for composing, previewing, and debugging Helios video projects. It bridges the gap between code-driven composition and visual verification, offering a Timeline, Props Editor, and real-time Preview.

## Features

- **Visual Timeline**: Scrub through your video, view frames, and manage playback.
- **Props Editor**: Adjust composition inputs dynamically using a schema-aware editor.
- **Assets Panel**: Manage and preview project assets (images, audio, video).
- **Renders Panel**: Track render jobs and client-side exports.
- **Hot Reloading**: Instant feedback when you modify your composition code.
- **Diagnostics**: Inspect environment capabilities and system status.
- **Client-Side Export**: Export MP4/WebM directly from the browser using WebCodecs.

## Getting Started

The recommended way to use Helios Studio is by initializing a new project with the Helios CLI.

### 1. Create a New Project

Use the `init` command to scaffold a project with your preferred framework (React, Vue, Svelte, Solid, or Vanilla):

```bash
npx helios init my-project
```

### 2. Install Dependencies

Navigate to your project directory and install the necessary packages:

```bash
cd my-project
npm install
```

### 3. Start the Studio

Run the development server, which launches Helios Studio:

```bash
npm run dev
```

This will typically open the Studio at `http://localhost:5173`.

## Architecture

Studio acts as a host environment for the Helios Player.

- **Frontend**: React-based UI that wraps the `<helios-player>` component.
- **Backend**: Vite plugin (`vite-plugin-studio-api`) that provides API endpoints for file discovery, asset management, and render job orchestration.
- **Context**: `StudioContext` manages the global state (active composition, player state, assets).

## Usage

### Commands

**Start Development Server**
```bash
npx helios studio
```
Launches the Studio UI for the current directory. This is what `npm run dev` typically executes.

**Preview Production Build**
```bash
npx helios preview
```
Serves the static build output using `vite preview`, providing a production-like environment for verifying your composition before deployment.

### Standalone Usage

You can also install the Studio package directly:

```bash
# Install globally
npm install -g @helios-project/studio

# Run from any directory
helios-studio
```

For a comprehensive guide on getting started, see the [Quickstart Guide](../../docs/site/getting-started/quickstart.md).

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `Arrow Left/Right` | Previous / Next Frame |
| `Shift` + `Arrow` | Jump 10 Frames |
| `Home` | Go to Start |
| `I` | Set In Point |
| `O` | Set Out Point |
| `L` | Toggle Loop |
| `Cmd/Ctrl` + `K` | Open Composition Switcher |
| `?` | Open Shortcuts Help |

## Development

To run the Studio package locally for development (contributing):

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Run tests:
   ```bash
   npm test
   ```

## License

Elastic License 2.0 (ELv2). See root [LICENSE](../../LICENSE) for details.
