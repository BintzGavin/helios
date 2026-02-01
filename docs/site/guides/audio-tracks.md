---
title: "Audio Tracks & Fading"
description: "Managing multiple audio tracks, volume, and fading in Helios"
---

# Audio Tracks & Fading

Helios v3.4+ introduces robust support for managing multiple audio tracks, enabling granular control over volume and muting for different groups of sounds (e.g., "music", "sfx", "voiceover"). It also provides built-in attributes for smooth audio fading.

## Concepts

### Track IDs
You can assign an ID to any HTML audio or video element using the `data-helios-track-id` attribute. All elements with the same track ID belong to the same "Audio Track" group.

### Audio Discovery
The `DomDriver` automatically scans the DOM for audio/video elements. It aggregates them by their track ID and exposes them via the `helios.availableAudioTracks` signal.

## Assigning Tracks

In your composition HTML, add the `data-helios-track-id` attribute to your media elements.

```html
<!-- Background Music -->
<audio
  src="music.mp3"
  data-helios-track-id="music"
  loop
  autoplay>
</audio>

<!-- Sound Effect 1 -->
<audio
  src="click.mp3"
  data-helios-track-id="sfx">
</audio>

<!-- Sound Effect 2 -->
<audio
  src="boom.mp3"
  data-helios-track-id="sfx">
</audio>
```

In this example, we have two tracks: `"music"` and `"sfx"`.

## Controlling Tracks

You can control the volume and mute state of these tracks programmatically using the Helios Player or the Controller API.

### Via Helios Controller (Inside Composition)

If you have access to the `HeliosController` (e.g., via Bridge or Direct mode):

```typescript
// Set 'music' track to 50% volume
controller.setAudioTrackVolume('music', 0.5);

// Mute the 'sfx' track
controller.setAudioTrackMuted('sfx', true);
```

### Via Bridge Protocol (From Parent)

If you are embedding the player, you can send messages or use the `helios-player` component methods (if exposed). The standard way is via the controller instance obtained from the player.

```typescript
const player = document.querySelector('helios-player');
const controller = player.getController();

if (controller) {
  controller.setAudioTrackMuted('music', true);
}
```

## Audio Fading

You can apply linear fade-in and fade-out effects directly in HTML using data attributes. This is handled by the `DomDriver` and works for both real-time playback and rendering.

### `data-helios-fade-in`
Fades the volume from 0 to 1 over the specified number of seconds at the beginning of playback.

### `data-helios-fade-out`
Fades the volume from 1 to 0 over the specified number of seconds ending at the file's duration.

```html
<audio
  src="intro.mp3"
  data-helios-track-id="voiceover"
  data-helios-fade-in="2.0"  <!-- 2 second fade-in -->
  data-helios-fade-out="3.5" <!-- 3.5 second fade-out -->
  autoplay
></audio>
```

## Discovery Signal

You can inspect which tracks are currently available in the composition using the `availableAudioTracks` signal in the Core API.

```typescript
const tracks = helios.availableAudioTracks.value;
console.log(tracks); // ["music", "sfx", "voiceover"]
```
