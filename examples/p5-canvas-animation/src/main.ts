import { Helios } from '@helios-project/core';
import p5 from 'p5';

const helios = new Helios({ fps: 30, duration: 10 });

const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(window.innerWidth, window.innerHeight);
    p.noLoop(); // CRITICAL: Stop P5's internal loop
  };

  p.draw = () => {
    // CRITICAL: Use Helios time, not P5 time
    const time = helios.currentTime.value;
    const progress = (time % 10) / 10;

    p.background(20);
    p.fill(255, 0, 0);
    p.noStroke();

    // Example animation logic
    const x = p.width * progress;
    const y = p.height / 2;
    p.ellipse(x, y, 100);
  };

  p.windowResized = () => {
    p.resizeCanvas(window.innerWidth, window.innerHeight);
  };
};

const container = document.getElementById('p5-container');
if (container) {
  const mySketch = new p5(sketch, container);

  // Bind to document timeline for Renderer
  helios.bindToDocumentTimeline();

  // Drive P5 from Helios
  helios.subscribe(() => {
    // p.redraw() executes draw() once
    mySketch.redraw();
  });

  // Expose for debugging
  (window as any).helios = helios;
}
