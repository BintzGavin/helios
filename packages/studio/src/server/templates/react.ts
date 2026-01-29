import { Template } from './types';

export const reactTemplate: Template = {
  id: 'react',
  label: 'React',
  generate: (name: string) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
    #root { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./index.tsx"></script>
</body>
</html>`;

    const index = `import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Helios } from '@helios-project/core';

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const helios = new Helios({ duration: 5, fps: 30 });
    helios.bindToDocumentTimeline();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const unsubscribe = helios.subscribe((state) => {
      const { width, height } = canvas;
      const t = state.time;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#61dafb';
      const x = (Math.sin(t) + 1) / 2 * (width - 100) + 50;
      const y = height / 2;
      ctx.beginPath();
      ctx.arc(x, y, 50, 0, Math.PI * 2);
      ctx.fill();
    });

    return () => {
        unsubscribe();
        window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />;
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
`;

    return [
      { path: 'composition.html', content: html },
      { path: 'index.tsx', content: index }
    ];
  }
};
