import * as THREE from 'three';
import { Helios } from '@helios-project/core';

// Setup Three.js
const canvas = document.getElementById('composition-canvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1).normalize();
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
scene.add(ambientLight);

// Object
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Resize Logic
const onResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

window.addEventListener('resize', onResize);
// Init size
onResize();

// Setup Helios
const helios = new Helios({ duration: 5, fps: 30 });
helios.bindToDocumentTimeline();

// Drive Animation
function draw(frame: number) {
  const time = frame / 30; // fps hardcoded to match Helios config

  // Rotate cube based on time
  cube.rotation.x = time;
  cube.rotation.y = time;

  renderer.render(scene, camera);
}

helios.subscribe((state) => {
  draw(state.currentFrame);
});

// Initial draw
draw(0);

// Expose for debugging
(window as any).helios = helios;
(window as any).scene = scene;
