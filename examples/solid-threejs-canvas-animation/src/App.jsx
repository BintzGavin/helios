import { createEffect, onCleanup, onMount } from "solid-js";
import * as THREE from "three";
import { createHeliosSignal } from "./lib/createHeliosSignal";
import { Helios } from "@helios-project/core";

if (!window.helios) {
  window.helios = new Helios({
    fps: 30,
    duration: 10,
    width: 1920,
    height: 1080
  });
}

export default function App() {
  let canvasRef;
  const state = createHeliosSignal(window.helios);

  onMount(() => {
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#1a1a1a");

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Cube
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshNormalMaterial();
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Sync with Helios
    createEffect(() => {
      const s = state();
      const t = s.currentTime;
      // Rotate 90 degrees (PI/2) per second
      cube.rotation.x = t * (Math.PI / 2);
      cube.rotation.y = t * (Math.PI / 2);
      renderer.render(scene, camera);
    });

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.render(scene, camera);
    };
    window.addEventListener("resize", handleResize);

    onCleanup(() => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    });
  });

  return <canvas ref={canvasRef} />;
}
