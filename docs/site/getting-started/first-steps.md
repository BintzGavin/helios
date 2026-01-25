---
title: "First Steps"
description: "Learn the basics of creating a Helios composition."
---

# First Steps

A "Composition" in Helios is simply a web page that uses the `Helios` class to drive animations.

## The Helios Lifecycle

1.  **Initialize**: Create a `Helios` instance with configuration (duration, fps).
2.  **Bind**: Bind the instance to the document timeline (or a custom driver).
3.  **Subscribe**: Listen for frame updates and render your content.

## Basic Example

Here is a minimal example using vanilla JavaScript:

```javascript
import { Helios } from '@helios-project/core';

// 1. Initialize
const helios = new Helios({
  duration: 5, // seconds
  fps: 30
});

// 2. Bind to Document Timeline
// This allows the browser's requestAnimationFrame loop to drive the animation
// when running in the browser. The Renderer will override this.
helios.bindToDocumentTimeline();

// 3. Subscribe to updates
helios.subscribe((state) => {
  const { currentFrame, time } = state;

  // Render your frame here based on currentFrame or time
  console.log(`Frame: ${currentFrame}`);

  // Example: Update DOM element
  const box = document.getElementById('box');
  if (box) {
    box.style.transform = `translateX(${currentFrame}px)`;
  }
});

// Optional: Expose to window for the Player or debugging
window.helios = helios;
```

## Next Steps

- Check out the **[Guides](/guides/creating-compositions)** for more advanced usage like Signals and Sequencing.
- Explore **[Examples](/examples/react-example)** to see how to integrate with frameworks.
