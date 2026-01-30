import { Template, CompositionOptions } from './types';

export const threejsTemplate: Template = {
  id: 'threejs',
  label: 'Three.js',
  generate: (name: string, options: CompositionOptions) => {
    const { fps, duration } = options;
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
    import * as THREE from 'three';
    import { Helios } from '@helios-project/core';

    // Standard Three.js Setup
    const canvas = document.getElementById('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Add a Cube
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Resize Logic
    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resize);
    resize();

    // Helios Setup
    const helios = new Helios({ duration: ${duration}, fps: ${fps} });
    helios.bindToDocumentTimeline();

    // Animation Loop
    helios.subscribe((state) => {
       const time = state.time;

       // Animate the cube based on time
       cube.rotation.x = time;
       cube.rotation.y = time;

       renderer.render(scene, camera);
    });
  </script>
</body>
</html>`;

    return [
      { path: 'composition.html', content }
    ];
  }
};
