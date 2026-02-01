import * as THREE from 'three';
import { gsap } from 'gsap';
import { Helios } from '../../../packages/core/src/index.ts';

// ===== Configuration =====
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const DURATION = 30;

// ===== Initialize Helios =====
const helios = new Helios({
  width: WIDTH,
  height: HEIGHT,
  fps: FPS,
  duration: DURATION,
});

// ===== Initialize Three.js =====
const canvasContainer = document.getElementById('canvas-container');
const scene = new THREE.Scene();
// scene.background = new THREE.Color(0x000000); // Transparent for CSS gradient

const camera = new THREE.PerspectiveCamera(60, WIDTH / HEIGHT, 0.1, 1000);
camera.position.z = 20;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio(window.devicePixelRatio);
canvasContainer.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// ===== Scene Objects Setup =====

// Scene 1: The Pixel / Bar
const pixelGeo = new THREE.BoxGeometry(1, 1, 1);
const pixelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const pixel = new THREE.Mesh(pixelGeo, pixelMat);
scene.add(pixel);

// Scene 2: The Timeline Rows
const rowsGroup = new THREE.Group();
const rowCount = 10;
const rows = [];
for (let i = 0; i < rowCount; i++) {
  const rowGeo = new THREE.BoxGeometry(20, 0.5, 0.1);
  const rowMat = new THREE.MeshBasicMaterial({ color: 0x2a2a4e });
  const row = new THREE.Mesh(rowGeo, rowMat);
  row.position.y = (i - rowCount / 2) * 1.5;
  row.visible = false;
  rowsGroup.add(row);
  rows.push(row);
}
scene.add(rowsGroup);

// Scene 3: Particles
const particleCount = 1000;
const particlesGeo = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount * 3; i++) {
  particlePositions[i] = (Math.random() - 0.5) * 40;
}
particlesGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const particlesMat = new THREE.PointsMaterial({ color: 0x3770FF, size: 0.1 });
const particles = new THREE.Points(particlesGeo, particlesMat);
particles.visible = false;
scene.add(particles);

// Scene 5: Shapes
const shapesGroup = new THREE.Group();
const barGeo = new THREE.BoxGeometry(1, 1, 1);
const barMat = new THREE.MeshStandardMaterial({ color: 0x3770FF });
const bars = [];
for (let i = 0; i < 5; i++) {
  const bar = new THREE.Mesh(barGeo, barMat);
  bar.position.x = (i - 2) * 2;
  bar.scale.y = 0.1;
  bar.position.y = -2;
  shapesGroup.add(bar);
  bars.push(bar);
}
shapesGroup.visible = false;
scene.add(shapesGroup);

// Scene 6: Developer Power Sphere
const devSphereGeo = new THREE.IcosahedronGeometry(2, 1);
const devSphereMat = new THREE.MeshStandardMaterial({ color: 0x3770FF, wireframe: true });
const devSphere = new THREE.Mesh(devSphereGeo, devSphereMat);
devSphere.visible = false;
scene.add(devSphere);

// Scene 7: Orbiting Planes
const orbitGroup = new THREE.Group();
const orbitPlanes = [];
for (let i = 0; i < 8; i++) {
  const planeGeo = new THREE.PlaneGeometry(3, 1.69); // 16:9 aspect
  const planeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 2 === 0 ? 0x3770FF : 0x7B9FFF), side: THREE.DoubleSide });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  // Position in a circle
  const angle = (i / 8) * Math.PI * 2;
  const radius = 8;
  plane.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  plane.lookAt(0, 0, 0);
  orbitGroup.add(plane);
  orbitPlanes.push(plane);
}
orbitGroup.visible = false;
scene.add(orbitGroup);

// Scene 8: Final Flare/Logo Backing
const flareGeo = new THREE.CircleGeometry(5, 32);
const flareMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
const flare = new THREE.Mesh(flareGeo, flareMat);
flare.visible = false;
scene.add(flare);


// ===== GSAP Timeline =====
const tl = gsap.timeline({ paused: true });

// Helper to toggle visibility
function setVisible(obj, visible) {
  if (obj instanceof THREE.Object3D) obj.visible = visible;
  else if (Array.isArray(obj)) obj.forEach(o => o.visible = visible);
  else if (typeof obj === 'string') {
    const el = document.querySelector(obj);
    if(el) el.style.opacity = visible ? 1 : 0;
  }
}

// === 0-2s: Cold Open ===
tl.set(pixel, { visible: true }, 0);
tl.to(pixel.scale, { x: 20, duration: 1.5, ease: "power2.inOut" }, 0.5);
// Glitch effect
tl.to(pixel.position, { x: 0.5, duration: 0.05, repeat: 5, yoyo: true }, 1.5);
tl.to('#text-scene-1', { opacity: 1, duration: 0.5 }, 0.5);
tl.to('#text-scene-1', { opacity: 0, duration: 0.2 }, 1.8);
tl.set(pixel, { visible: false }, 2);

// === 2-6s: Tension ===
tl.set(rowsGroup, { visible: true }, 2);
rows.forEach((row, i) => {
  tl.set(row, { visible: true }, 2);
  tl.from(row.scale, { x: 0, duration: 0.5, ease: "power1.out" }, 2 + i * 0.1);
});
// Misalign
tl.to(rowsGroup.rotation, { z: 0.2, duration: 2, ease: "none" }, 3);
tl.to(rowsGroup.position, { z: -5, duration: 3 }, 3);

// Text: Rigid. Fragile. Slow.
const words = document.querySelectorAll('#text-scene-2 .word');
words.forEach((w, i) => {
  tl.to(w, { opacity: 1, duration: 0.1 }, 2.5 + i * 0.8);
});
tl.to('#text-scene-2', { opacity: 0, duration: 0.5 }, 5.5);
tl.set(rowsGroup, { visible: false }, 6);

// === 6-10s: Collapse ===
tl.set(particles, { visible: true }, 6);
// Implode
tl.fromTo(particles.scale, { x: 3, y: 3, z: 3 }, { x: 0.1, y: 0.1, z: 0.1, duration: 1, ease: "power4.in" }, 6);
// Explode and freeze
tl.to(particles.scale, { x: 2, y: 2, z: 2, duration: 0.2, ease: "elastic.out" }, 7);
tl.to(particles.rotation, { y: 1, duration: 3, ease: "linear" }, 7);

const textScene3 = document.getElementById('text-scene-3');
tl.to(textScene3, { opacity: 1, duration: 0.5 }, 7.5); // "Why?"
tl.to(textScene3, { opacity: 0, duration: 0.5 }, 9.5);
// tl.set(particles, { visible: false }, 10); // Redundant if setting true immediately

// === 10-14s: Emergence ===
// Use particles again but move smoothly
tl.set(particles, { visible: true }, 10);
tl.to(particles.scale, { x: 1, y: 1, z: 1, duration: 1 }, 10);
tl.to(particles.rotation, { y: 2, x: 0.5, duration: 4, ease: "sine.inOut" }, 10);

tl.to('#text-scene-4', { opacity: 1, duration: 1 }, 10.5); // Helios
tl.to('#text-scene-4', { opacity: 0, duration: 0.5 }, 13.5);
tl.set(particles, { visible: false }, 14);

// === 14-18s: Capability Montage ===
tl.set(shapesGroup, { visible: true }, 14);
bars.forEach((bar, i) => {
  tl.to(bar.scale, { y: 2 + Math.random() * 3, duration: 1, ease: "back.out" }, 14 + i * 0.1);
  tl.to(bar.rotation, { y: Math.PI, duration: 2 }, 15);
});

// Text
const scene5Words = document.querySelectorAll('.scene-5-word');
scene5Words.forEach((w, i) => {
  tl.to(w, { opacity: 1, duration: 0.1 }, 14.5 + i * 0.5);
  if (i > 0) tl.to(scene5Words[i-1], { opacity: 0, duration: 0.1 }, 14.5 + i * 0.5);
});
tl.to(scene5Words[scene5Words.length-1], { opacity: 0, duration: 0.5 }, 17.5);
tl.set(shapesGroup, { visible: false }, 18);

// === 18-22s: Developer Power ===
tl.set(devSphere, { visible: true }, 18);
tl.to('#text-scene-6', { opacity: 1, duration: 0.5 }, 18);

// Code change effect
tl.to(devSphere.material.color, { r: 1.0, g: 0.84, b: 0.0, duration: 0.1 }, 20); // Turn Gold
tl.to(devSphere.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.5, ease: "back.out" }, 20);

tl.to('#text-scene-6', { opacity: 0, duration: 0.5 }, 21.5);
tl.set(devSphere, { visible: false }, 22);

// === 22-26s: Scale and Vision ===
tl.set(orbitGroup, { visible: true }, 22);
tl.to(orbitGroup.rotation, { y: Math.PI * 2, duration: 4, ease: "power1.inOut" }, 22);
tl.to(camera.position, { z: 30, duration: 4 }, 22);

const scene7Parts = document.querySelectorAll('.scene-7-part');
scene7Parts.forEach((part, i) => {
  tl.to(part, { opacity: 1, duration: 0.5 }, 22.5 + i * 1.0);
});
tl.to('#text-scene-7', { opacity: 0, duration: 0.5 }, 25.5);
tl.set(orbitGroup, { visible: false }, 26);

// === 26-30s: Final Statement ===
tl.set(flare, { visible: true }, 26);
tl.to(flare.material, { opacity: 0.5, duration: 0.5 }, 26);
tl.to(flare.scale, { x: 1.5, y: 1.5, duration: 4 }, 26);
tl.to('#text-scene-8', { opacity: 1, duration: 1 }, 26.5);
tl.to('#text-scene-8', { scale: 1.1, duration: 3.5 }, 26.5);


// ===== Render Loop =====
helios.subscribe((state) => {
  const time = state.currentFrame / FPS;
  tl.seek(time);
  renderer.render(scene, camera);
});

helios.bindToDocumentTimeline();

// Expose for debugging
window.helios = helios;
window.scene = scene;
window.tl = tl;
