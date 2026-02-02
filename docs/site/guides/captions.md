---
title: "Working with Captions"
description: "How to import, parse, and render captions in Helios"
---

# Working with Captions

Helios provides native support for parsing and rendering captions, making it easy to create accessible videos with burned-in subtitles.

## Supported Formats

Helios supports the two most common caption formats:
- **SRT (SubRip Subtitle)**: A simple text-based format.
- **WebVTT (Web Video Text Tracks)**: A standard format for web video captions.

## Core API

The `@helios-project/core` package provides utilities to parse these formats into a structured `CaptionCue` array.

### Parsing Captions

The `parseCaptions` function automatically detects the format (SRT or WebVTT) and parses it.

```typescript
import { parseCaptions } from '@helios-project/core';

const srtContent = `1
00:00:00,000 --> 00:00:02,000
Hello World!
`;

const cues = parseCaptions(srtContent);
// [{ id: "1", startTime: 0, endTime: 2000, text: "Hello World!" }]
```

You can also use format-specific parsers if needed:
- `parseSrt(content: string)`
- `parseWebVTT(content: string)`

### State Management

The `Helios` class manages caption state for you. You can initialize it with captions or set them later.

```typescript
const helios = new Helios({
  duration: 10,
  fps: 30,
  captions: srtContent // Can be string or CaptionCue[]
});

// Or update later
helios.setCaptions(newContent);
```

### Accessing Active Captions

Helios exposes a reactive signal `activeCaptions` that contains the list of cues active at the current frame. This allows you to easily render them in your composition.

```typescript
// React Example
const activeCues = useSignal(helios.activeCaptions);

return (
  <div className="captions-layer">
    {activeCues.map(cue => (
      <div key={cue.id} className="caption">
        {cue.text}
      </div>
    ))}
  </div>
);
```

## Player Integration

The `<helios-player>` component provides a UI for toggling captions and supports standard HTML `<track>` elements.

### Using Tracks

You can add captions declaratively using the standard `<track>` tag.

```html
<helios-player src="./composition.html">
  <track
    kind="captions"
    label="English"
    srclang="en"
    src="./captions.en.vtt"
    default
  />
</helios-player>
```

### Programmatic API

You can also add tracks via the API:

```typescript
const player = document.querySelector('helios-player');

const track = player.addTextTrack("captions", "English", "en");
track.addCue(new VTTCue(0, 2, "Hello World"));
```

### Exporting Captions

When rendering a video on the client-side (using the "Export" button in the Player), you can choose how captions are handled via the `export-caption-mode` attribute.

- **`burn-in`** (default): Captions are rendered into the video pixels. This requires your composition to visually render the `activeCaptions` signal.
- **`file`**: Captions are exported as a separate `.srt` sidecar file, and the video is clean.

```html
<helios-player export-caption-mode="file" ...></helios-player>
```

## Rendering (Server-Side)

When using `@helios-project/renderer` to create a video file, you can also burn in subtitles using FFmpeg filters.

```typescript
const renderer = new Renderer({
  // ...
  subtitles: './captions.srt' // Path to SRT file
});
```

This uses the FFmpeg `subtitles` filter to render the captions, which is performant but offers less styling control than rendering them via HTML/CSS in your composition.

## Styling

Since `activeCaptions` gives you raw text, you have full control over styling using standard CSS. You can implement:
- Karaoke effects (by parsing word-level timestamps)
- Animated transitions
- Dynamic positioning
- Custom fonts and colors

See the [Examples](../examples/captions) section for implementation details in various frameworks.
