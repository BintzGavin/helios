# Component Structure
`<helios-player>` uses Shadow DOM.
Contains an `iframe` for preview, a `<video>` for PiP, various UI overlays (`audio-menu`, `settings-menu`, `export-menu`, `shortcuts-overlay`, `debug-overlay`, `status-overlay`, `poster-container`, `click-layer`), and a `controls` container.

# Events
`error`, `audiometering`, `playing`, `suspend`, `stalled`, `waiting`, `play`, `pause`, `seeking`, `seeked`, `ended`, `timeupdate`, `volumechange`, `ratechange`, `durationchange`, `loadstart`, `loadedmetadata`, `loadeddata`, `canplay`, `canplaythrough`, `abort`, `emptied`, `progress`, `resize`, `enterpictureinpicture`, `leavepictureinpicture`

# Attributes
`src`, `width`, `height`, `autoplay`, `loop`, `controls`, `export-format`, `input-props`, `poster`, `muted`, `interactive`, `preload`, `controlslist`, `sandbox`, `export-caption-mode`, `disablepictureinpicture`, `export-width`, `export-height`, `export-bitrate`, `export-filename`, `media-title`, `media-artist`, `media-album`, `media-artwork`, `export-mode`, `canvas-selector`, `playsinline`, `crossorigin`
