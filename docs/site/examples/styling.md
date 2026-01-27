---
title: "Styling"
description: "Styling techniques for Helios compositions"
---

# Styling

Helios compositions are just web pages, so you can use any styling methodology you prefer. However, there are some specific considerations for video rendering.

## Tailwind CSS

[Tailwind CSS](https://tailwindcss.com/) works excellently with Helios.

### Configuration

Ensure your `tailwind.config.js` is scoped correctly if you are in a monorepo or multipage setup, to avoid purging styles used in your composition.

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### CSS Animations

If you use Tailwind's utility classes for animation (e.g., `animate-spin`, `animate-bounce`), you must enable `autoSyncAnimations: true` in your Helios configuration. This tells Helios to use the `DomDriver` which intercepts and synchronizes standard CSS Animations.

```typescript
const helios = new Helios({
  // ...
  autoSyncAnimations: true
});
```

## CSS Modules

CSS Modules (default in Vite/React) are great for scoping styles to specific components.

```css
/* Component.module.css */
.title {
  color: red;
  font-size: 100px;
}
```

```tsx
import styles from './Component.module.css';

export const Component = () => <div className={styles.title}>Hello</div>;
```

## Fonts

When rendering video, font loading is critical. If a font loads after the render starts, you might see a "flash of unstyled text" (FOUT) or the wrong font in the video.

The `@helios-project/renderer` handles this automatically in `dom` mode by waiting for `document.fonts.ready` before capturing frames.

To ensure fonts are available:
1.  Import them in your CSS (`@import` or `@font-face`).
2.  Or use a `<link>` tag in your HTML.

```css
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@700&display=swap');

body {
  font-family: 'Roboto', sans-serif;
}
```

## Background Images

Similar to fonts, background images must be loaded before rendering. The Helios Renderer preloads images found in `<img>` tags and CSS `background-image` properties automatically.

## Layout for Video

Remember that video has a fixed aspect ratio (usually 16:9).
- Use absolute positioning or flexbox/grid to ensure your content fits within the `width` and `height` defined in your Helios configuration.
- Avoid using `vh` and `vw` units if your canvas size doesn't match the viewport size, or ensure your container mimics the viewport.
