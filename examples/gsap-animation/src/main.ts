import { Helios } from "@helios-project/core";
import { gsap } from "gsap";

// 1. Initialize Helios
const helios = new Helios({
  fps: 30,
  duration: 5,
});

// 2. Setup GSAP Timeline
// IMPORTANT: The timeline must be paused so Helios can drive it!
const tl = gsap.timeline({ paused: true });

// 3. Define animations
tl.to(".box", {
  rotation: 360,
  x: 100,
  duration: 2,
  ease: "power1.inOut"
})
.to(".box", {
  scale: 2,
  backgroundColor: "#00eeff",
  duration: 2,
  ease: "elastic.out(1, 0.3)"
})
.to(".box", {
  x: 0,
  scale: 1,
  duration: 1,
  ease: "power2.out"
});

// 4. Subscribe to Helios updates to drive GSAP
helios.subscribe((state) => {
  // Convert frame count to seconds
  const timeInSeconds = state.currentFrame / state.fps;

  // Seek the GSAP timeline to the exact time
  tl.seek(timeInSeconds);
});

// 5. Start Helios (bind to document timeline for preview)
helios.bindToDocumentTimeline();

// Expose for debugging
(window as any).helios = helios;
