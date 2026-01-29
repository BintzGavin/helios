import { Template } from './types';

export const vanillaTemplate: Template = {
  id: 'vanilla',
  label: 'Vanilla JS',
  generate: (name: string) => {
    const content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
    canvas { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script type="module">
    import { Helios } from '@helios-project/core';

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const helios = new Helios({ duration: 5, fps: 30 });
    helios.bindToDocumentTimeline();

    helios.subscribe((state) => {
      const { width, height } = canvas;
      const t = state.time; // in seconds

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#fff';
      const x = (Math.sin(t) + 1) / 2 * (width - 100) + 50;
      const y = height / 2;
      ctx.beginPath();
      ctx.arc(x, y, 50, 0, Math.PI * 2);
      ctx.fill();
    });
  </script>
</body>
</html>`;

    return [
      { path: 'composition.html', content }
    ];
  }
};
