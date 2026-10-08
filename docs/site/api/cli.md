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

**Built-in components**:

| Component | Type | What it does |
|---|---|---|
| `use-video-frame` | React | Hook that re-renders on every frame. |
| `timer` | React | Shows the time as MM:SS:FF. |
| `progress-bar` | React | Shows playback progress. |
| `watermark` | React | Text or image logo overlay. |
| `shaders` | Vanilla | Renders [Shaders](/examples/shaders) WebGPU effects on Helios time. |
| `beat-clock` | Vanilla | Beats, bars, kick pulses, hits and loudness at any time, from `helios analyze` output. See [Beat Clock](/examples/beat-clock). |
| `cursor` | Vanilla | A scripted mouse pointer whose clicks land on the times you give. See [Scripted Cursor](/examples/cursor). |

Vanilla components work in any project, with or without a framework.

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
- `--preset <name>`: The x264 encoder preset. `ultrafast` (default) renders fastest but makes the largest files. `medium` or `slow` make much smaller files of the same quality and take longer to encode. Use one of those for a final delivery.
- `--mode <mode>`: `dom` screenshots the page and works for any page; `canvas` captures the first `<canvas>` and is faster (default: `dom`).
- `--gpu` / `--no-gpu`: Enable or disable GPU acceleration in the browser (for WebGL).
- `--no-headless`: Run in a visible browser window (useful for debugging).

**Color**: frames are converted to Y'CbCr with the BT.709 matrix in limited range, and the stream is tagged BT.709, so players show the page's colors instead of guessing (an untagged video often looks washed out). GIF, PNG and other RGB outputs are left as they are.

**Local pages are served over http**: `helios render page.html`, and likewise `still`, `sheet` and `verify`, serves the page from `127.0.0.1` for the length of the command. The server's root is the current directory, or the page's own folder if the page is outside it. So the page can `fetch()` data files that sit next to it, and media elements get byte-range requests. `--no-serve` loads the page from `file://` instead.

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

### `helios verify`

Checks that every frame depends only on its time. Rendering in chunks (distributed rendering), seeking and `helios still` all rely on that. The command renders sample frames in order, and then in reverse on a fresh page. The reverse pass starts cold at the last frame, like a render chunk does. If any frame comes out different, the page keeps state between frames (a counter, `x += speed`, randomness drawn per frame, timers), and the command exits 1, naming the frames that differ.

```bash
helios verify page.html --duration 12
```

With `--cues`, it also checks timed text: every lyric word or caption in the file must be on screen during its time. Each cue is sampled just after it starts, in the middle and just before it ends, all in one page session. A cue passes when each of its words shows in at least one of those frames, so a line revealed word by word passes. Matching ignores case, punctuation and accents.

```bash
helios verify page.html --duration 182 --cues lyrics.srt
# 6 sampled frames are identical rendered in order and in reverse: each frame depends only on t.
# 417/417 cues on screen at their time.
```

Text counts as on screen in two cases:
- It is DOM or SVG text that is rendered (not `display: none`, `visibility: hidden` or opacity 0) and at least 10% opaque, counting its ancestors' opacity and its colour's alpha. At least half of it must also lie inside the frame and inside any container whose overflow clips it.
- The page declared it drawn for that frame with `window.heliosDrawnText?.add(text)`. Canvas pages use this. The check sets `window.heliosDrawnText` to a new `Set` before each frame. During a normal render it is undefined, so the call does nothing.

The check confirms that each word is present at its time. It doesn't check that the word is easy to read: use `helios sheet` for that.

**Options**:
- `--duration <seconds>`: The span to sample (default: the composition's).
- `--samples <n>`: The number of frames to compare (default: `6`).
- `--cues <file>`: Timed text that must be on screen at its time. Accepts an `.srt` file, a `.vtt` file, or a `.json` file holding an array of `{ "text", "start", "end" }` in seconds. The JSON can also be an object whose `cues` or `words` array holds those, and `w`, `t0` and `t1` work as aliases.
- `--json`: Print one JSON object, `{ ok, purity: { ok, samples, differing, noisy, message }, cues?: { ok, total, shown, missing: [{ text, start, end, seen }], message } }`. It exits 1 when `ok` is false. Argument and page errors go to stderr as `Verify failed: <reason>`, with no JSON.
- `--width`, `--height`, `--crop`, `--gpu`/`--no-gpu`: As for `still`.

### `helios check`

Checks a rendered video file before you deliver it. It prints one line per check and exits 1 when a check fails or the file can't be read.

```bash
helios check out.mp4 [--json]
```

- **Video and audio**: the codec, size, frame rate, pixel format, and the audio stream (or none).
- **Color**: the matrix, primaries, transfer and range tags. An untagged Y'CbCr video is a warning: players guess, and often show it washed out.
- **Length**: the frames actually decoded against the file's duration × frame rate. A mismatch (dropped or repeated frames, or audio that runs past the picture) is a warning.
- **Flashes** (WCAG 2.3.1): more than 3 flashes, or more than 3 saturated red flashes, in any one second fails. A flash is a pair of opposing changes in relative luminance of at least 10% where the darker state is below 0.8. It counts when the area flashing together covers at least a quarter of a 10° visual field, taken as a window one third of the frame's width and height.

**Options**:
- `--json`: Print exactly one JSON object (`ok`, `file`, `video`, `audio`, `flash`, `problems`, `warnings`) for a pass or a fail. When the file can't be read, nothing goes to stdout and `Check failed: <reason>` goes to stderr.

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
