---
name: example-tailwind-animation
description: Learn how to use Tailwind CSS with Helios. Use for styling compositions and animating with utility classes.
---

# Tailwind CSS Animation

Use Tailwind CSS to style and animate Helios compositions. Combine standard Tailwind utility classes with Helios's `autoSyncAnimations` feature.

## Quick Start

1. **Configure Helios:**
   ```typescript
   const helios = new Helios({
     // ...
     autoSyncAnimations: true, // Enable CSS synchronization
     animationScope: document.getElementById('app')
   });
   ```

2. **Use Tailwind Classes:**
   ```html
   <div class="w-full h-full bg-slate-900 flex items-center justify-center">
     <div class="animate-bounce text-6xl text-white font-bold">
       Hello Helios
     </div>
   </div>
   ```

3. **Custom Keyframes (`tailwind.config.js`):**
   ```javascript
   module.exports = {
     theme: {
       extend: {
         animation: {
           'spin-slow': 'spin 3s linear infinite',
         }
       }
     }
   }
   ```

## Key Patterns

### Scoped Styles
When working in a monorepo or example folder, ensure your `tailwind.config.js` `content` array correctly targets your files to avoid global style leakage or missing styles.

### Auto-Sync
With `autoSyncAnimations: true`, standard CSS animations (like `animate-bounce`, `animate-spin`) are automatically hijacked by Helios. `helios.seek()` will scrub the CSS animation to the correct point in time.

## Source
- Example: `examples/tailwind-animation/`
