---
title: "Web Component Animation"
description: "Using Helios with Shadow DOM and Custom Elements."
---

# Web Component Animation

Helios supports animating content inside **Shadow DOM**, making it perfect for modern Web Components.

## Overview

The `DomDriver` in `@helios-project/core` is capable of recursively traversing Shadow Roots to find and synchronize:
-   CSS Animations (`animation-play-state`, `animation-delay`)
-   Web Animations API (`element.animate()`)
-   Video and Audio elements

## Implementation

### 1. The Web Component

Define a standard Custom Element with a Shadow Root. Use standard CSS animations.

```typescript
export class MyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        .card {
          width: 200px;
          height: 300px;
          background: blue;
          /* Standard CSS Animation */
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      </style>
      <div class="card">
        <slot></slot>
      </div>
    `;
  }
}

customElements.define("my-card", MyCard);
```

### 2. Helios Configuration

Initialize Helios with `autoSyncAnimations: true`.

```javascript
import { Helios } from "@helios-project/core";
import "./MyCard"; // Import your component

const helios = new Helios({
  fps: 30,
  duration: 5,
  width: 1920,
  height: 1080,
  // This enables the magic
  autoSyncAnimations: true
});

helios.bindToDocumentTimeline();
```

## How It Works

1.  Helios detects `autoSyncAnimations: true` and initializes the `DomDriver`.
2.  The driver traverses the document, crossing into any open Shadow Roots.
3.  It finds all active animations and synchronizes their time to the Helios internal clock.
4.  This works for both real-time playback and frame-by-frame rendering.
