import { Helios } from '../../../packages/core/src/index.ts';
import { gsap } from 'gsap';

// ===== Configuration =====
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const DURATION = 15; // seconds

// ===== Initialize Helios =====
const helios = new Helios({
  width: WIDTH,
  height: HEIGHT,
  fps: FPS,
  duration: DURATION,
});

// ===== Create Background Particles =====
function createParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 50; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.width = `${2 + Math.random() * 4}px`;
    particle.style.height = particle.style.width;
    container.appendChild(particle);
  }
}

// ===== Create Sun Rays =====
function createRays() {
  const container = document.getElementById('rays-container');
  const rayCount = 12;
  for (let i = 0; i < rayCount; i++) {
    const ray = document.createElement('div');
    ray.className = 'ray';
    ray.style.transform = `rotate(${(360 / rayCount) * i}deg)`;
    container.appendChild(ray);
  }
}

// ===== Initialize DOM Elements =====
createParticles();
createRays();

// ===== Main Timeline (PAUSED - Helios will drive it) =====
const tl = gsap.timeline({ paused: true });

// Get DOM elements
const logoContainer = document.getElementById('logo-container');
const sunIcon = logoContainer.querySelector('.sun-icon');
const logoText = logoContainer.querySelector('.logo-text');
const rays = document.querySelectorAll('.ray');
const particles = document.querySelectorAll('.particle');

const taglineContainer = document.getElementById('tagline-container');
const tagline = taglineContainer.querySelector('.tagline');

const codeContainer = document.getElementById('code-container');
const codeBlock = codeContainer.querySelector('.code-block');
const arrow = codeContainer.querySelector('.arrow');
const videoPreview = codeContainer.querySelector('.video-preview');

const frameworksContainer = document.getElementById('frameworks-container');
const frameworksTitle = frameworksContainer.querySelector('.frameworks-title');
const frameworkItems = document.querySelectorAll('.framework-item');

const ctaContainer = document.getElementById('cta-container');
const ctaText = ctaContainer.querySelector('.cta-text');
const ctaSub = ctaContainer.querySelector('.cta-sub');

const endCard = document.getElementById('end-card');

// ===== TIMELINE STRUCTURE =====
// Scene 1 (Logo):      0.0s - 3.0s
// Scene 2 (Tagline):   3.0s - 5.5s
// Scene 3 (Code):      5.5s - 9.0s
// Scene 4 (Frameworks): 9.0s - 11.5s
// Scene 5 (CTA):       11.5s - 13.5s
// Scene 6 (End Card):  13.5s - 15.0s

// ===== Background Particles (throughout) =====
tl.to(particles, {
  opacity: 0.6,
  duration: 1,
  stagger: { each: 0.02, from: 'random' }
}, 0);

tl.to(particles, {
  y: '-=80',
  x: 'random(-30, 30)',
  duration: DURATION,
  ease: 'none',
  stagger: { each: 0.05, from: 'random' }
}, 0);

// ===== SCENE 1: Logo Reveal (0s - 3s) =====

// Sun icon appears
tl.to(sunIcon, {
  opacity: 1,
  scale: 1.2,
  duration: 0.6,
  ease: 'back.out(1.7)'
}, 0.2);

// Sun rays burst out
tl.to(rays, {
  opacity: 0.6,
  scaleY: 1,
  duration: 0.5,
  stagger: 0.02,
  ease: 'power2.out'
}, 0.5);

// Rays rotate
tl.to('#rays-container', {
  rotation: 30,
  duration: 2.0,
  ease: 'power1.inOut'
}, 0.5);

// Logo text reveal
tl.to(logoText, {
  opacity: 1,
  y: 0,
  duration: 0.6,
  ease: 'power3.out'
}, 0.9);

// Fade out logo scene
tl.to([logoContainer, '#rays-container'], {
  opacity: 0,
  scale: 0.95,
  duration: 0.4,
  ease: 'power2.in'
}, 2.5);

// ===== SCENE 2: Tagline (3s - 5.5s) =====

// Tagline fade in
tl.to(tagline, {
  opacity: 1,
  y: 0,
  duration: 0.6,
  ease: 'power3.out'
}, 3.0);

// Tagline fade out
tl.to(taglineContainer, {
  opacity: 0,
  scale: 0.98,
  duration: 0.4,
  ease: 'power2.in'
}, 5.0);

// ===== SCENE 3: Code to Video (5.5s - 9s) =====

// Show code container
tl.to(codeContainer, {
  opacity: 1,
  duration: 0.1
}, 5.5);

// Code block slides in
tl.fromTo(codeBlock, 
  { x: -80, opacity: 0 },
  { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
  5.6
);

// Arrow appears
tl.to(arrow, {
  opacity: 1,
  duration: 0.4,
  ease: 'power2.out'
}, 6.2);

// Arrow pulses
tl.to(arrow, {
  scale: 1.15,
  duration: 0.25,
  ease: 'power2.inOut',
  yoyo: true,
  repeat: 1
}, 6.5);

// Video preview appears
tl.fromTo(videoPreview,
  { x: 80, opacity: 0, scale: 0.9 },
  { x: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.4)' },
  7.0
);

// Play icon pulses
tl.to('.play-icon', {
  scale: 1.1,
  duration: 0.3,
  ease: 'power2.inOut',
  yoyo: true,
  repeat: 1
}, 7.6);

// Fade out code scene
tl.to(codeContainer, {
  opacity: 0,
  scale: 0.98,
  duration: 0.4,
  ease: 'power2.in'
}, 8.5);

// ===== SCENE 4: Frameworks (9s - 11.5s) =====

// Show frameworks container
tl.to(frameworksContainer, {
  opacity: 1,
  duration: 0.1
}, 9.0);

// Title appears
tl.to(frameworksTitle, {
  opacity: 1,
  y: 0,
  duration: 0.5,
  ease: 'power3.out'
}, 9.1);

// Framework items stagger in
tl.to(frameworkItems, {
  opacity: 1,
  y: 0,
  duration: 0.4,
  stagger: 0.12,
  ease: 'back.out(1.4)'
}, 9.4);

// Fade out frameworks
tl.to(frameworksContainer, {
  opacity: 0,
  scale: 0.98,
  duration: 0.4,
  ease: 'power2.in'
}, 11.0);

// ===== SCENE 5: CTA (11.5s - 13.5s) =====

// Show CTA container
tl.to(ctaContainer, {
  opacity: 1,
  duration: 0.1
}, 11.5);

// CTA text appears
tl.to(ctaText, {
  opacity: 1,
  y: 0,
  duration: 0.5,
  ease: 'power3.out'
}, 11.6);

// Sub text appears
tl.to(ctaSub, {
  opacity: 1,
  y: 0,
  duration: 0.4,
  ease: 'power2.out'
}, 12.0);

// Fade out CTA
tl.to(ctaContainer, {
  opacity: 0,
  scale: 0.98,
  duration: 0.35,
  ease: 'power2.in'
}, 13.1);

// ===== SCENE 6: End Card (13.5s - 15s) =====

// End card appears
tl.to(endCard, {
  opacity: 1,
  scale: 1,
  duration: 0.5,
  ease: 'back.out(1.4)'
}, 13.5);

// Gentle pulse on end card
tl.to(endCard, {
  scale: 1.02,
  duration: 0.4,
  ease: 'power2.inOut',
  yoyo: true,
  repeat: 1
}, 14.1);

// Ensure timeline extends to exactly DURATION
// This empty tween guarantees the timeline is 15 seconds long
tl.to({}, { duration: 0.01 }, DURATION - 0.01);

// ===== Sync GSAP with Helios =====
helios.subscribe((state) => {
  const timeInSeconds = state.currentFrame / FPS;
  tl.seek(timeInSeconds);
});

// ===== Bind to Document Timeline (Critical for Renderer) =====
helios.bindToDocumentTimeline();

// ===== Expose for Detection =====
window.helios = helios;

// ===== Initial State =====
tl.seek(0);

console.log('🎬 Helios Promo Video Composition Loaded');
console.log(`   Duration: ${DURATION}s | FPS: ${FPS} | Resolution: ${WIDTH}x${HEIGHT}`);
console.log(`   GSAP Timeline Duration: ${tl.duration()}s`);
