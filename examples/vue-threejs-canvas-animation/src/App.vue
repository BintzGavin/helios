<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { Helios } from '../../../packages/core/src/index.ts';
import { useVideoFrame } from './composables/useVideoFrame';

const duration = 5;
const fps = 30;
const helios = new Helios({ duration, fps });
helios.bindToDocumentTimeline();

// Expose to window for debugging/player control
if (typeof window !== 'undefined') {
    window.helios = helios;
}

const canvasRef = ref(null);
const frame = useVideoFrame(helios);

let renderer;
let scene;
let camera;
let cube;

const initThree = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;

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

    // Initial render
    renderer.render(scene, camera);
};

const updateScene = () => {
    if (!renderer || !cube) return;

    const time = frame.value / fps;

    // Rotate based on time
    cube.rotation.x = time * 1;
    cube.rotation.y = time * 1;

    renderer.render(scene, camera);
};

watch(frame, updateScene);

const onResize = () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateScene();
};

onMounted(() => {
    initThree();
    window.addEventListener('resize', onResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', onResize);
    if (renderer) {
        renderer.dispose();
    }
});
</script>

<template>
  <canvas ref="canvasRef" style="display: block; width: 100%; height: 100%;"></canvas>
</template>
