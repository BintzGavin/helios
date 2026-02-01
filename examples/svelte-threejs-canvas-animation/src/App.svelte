<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { Helios } from '@helios-project/core';
  import { createHeliosStore } from './lib/store';

  let canvas: HTMLCanvasElement;
  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let cube: THREE.Mesh;

  const duration = 10;
  const fps = 30;

  const helios = new Helios({ duration, fps });
  helios.bindToDocumentTimeline();

  if (typeof window !== 'undefined') {
    (window as any).helios = helios;
  }

  const heliosStore = createHeliosStore(helios);

  // Reactive render loop
  $: if (renderer && $heliosStore) {
    update($heliosStore.currentFrame);
    renderer.render(scene, camera);
  }

  function update(frame: number) {
    const time = frame / fps;
    if (cube) {
      cube.rotation.x = time * 1;
      cube.rotation.y = time * 1;
    }
  }

  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Explicit render after resize
    renderer.render(scene, camera);
  }

  onMount(() => {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshNormalMaterial();
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    window.addEventListener('resize', onResize);

    // Initial render
    renderer.render(scene, camera);
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
        window.removeEventListener('resize', onResize);
    }
    renderer?.dispose();
  });
</script>

<canvas bind:this={canvas} style="display: block; width: 100%; height: 100%;"></canvas>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
    background-color: #111;
  }
</style>
