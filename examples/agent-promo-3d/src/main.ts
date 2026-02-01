import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Helios } from '../../packages/core/src/index.ts';

// --- Configuration ---
const DURATION = 30;
const FPS = 30;

// --- Shaders ---

// 1. Foggy Particles Shader
const particleVertexShader = `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aScale;
  attribute vec3 aRandom;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 pos = position;

    // Noise-like movement
    pos.x += sin(uTime * 0.5 + aRandom.x * 10.0) * 0.5;
    pos.y += cos(uTime * 0.3 + aRandom.y * 10.0) * 0.5;
    pos.z += sin(uTime * 0.2 + aRandom.z * 10.0) * 0.5;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation
    gl_PointSize = aScale * uPixelRatio * (50.0 / -mvPosition.z);

    // Fade based on depth
    float depth = -mvPosition.z;
    vAlpha = smoothstep(0.0, 10.0, depth) * (1.0 - smoothstep(20.0, 50.0, depth));

    // Color shift
    vColor = mix(vec3(0.2, 0.4, 0.8), vec3(0.1, 0.8, 0.9), aRandom.x);
  }
`;

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Soft circle
    vec2 coord = gl_PointCoord - vec2(0.5);
    float r = length(coord);
    if (r > 0.5) discard;

    float glow = 1.0 - (r * 2.0);
    glow = pow(glow, 1.5);

    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`;

// 2. City Building Shader
const cityVertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying float vHeight;

  void main() {
    vUv = uv;
    vPosition = position;

    // Assume y is up, 0 to height
    vHeight = position.y;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cityFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;

  varying vec2 vUv;
  varying vec3 vPosition;
  varying float vHeight;

  // Simple hash function
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    // Window grid pattern
    vec2 grid = fract(vUv * vec2(10.0, 20.0));
    float window = step(0.2, grid.x) * step(0.4, grid.y); // Windows are holes

    // Random flicker
    vec2 cell = floor(vUv * vec2(10.0, 20.0));
    float flicker = hash(cell + floor(uTime * 5.0));
    float lightOn = step(0.7, flicker); // 30% chance to be on

    // Reveal wipe effect (vertical)
    float reveal = smoothstep(0.0, 5.0, uTime - 2.0); // Starts at 2s
    float visibility = step(vPosition.y * 0.1, reveal * 10.0);
    if (visibility < 0.5) discard;

    // Base color
    vec3 color = mix(uColor1, uColor2, vHeight * 0.1);

    // Add windows
    vec3 windowColor = vec3(1.0, 0.9, 0.5) * 5.0; // HDR brightness
    color = mix(color, windowColor, window * lightOn * visibility);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// 3. Central Core Shader
const coreVertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;

  // Simplex Noise (simplified)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y
    // Permutations
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vUv = uv;
    vNormal = normal;

    // Pulse
    float pulse = sin(uTime * 2.0) * 0.1 + 1.0;

    // Distortion
    float noiseVal = snoise(position * 2.0 + uTime);
    vec3 newPos = position + normal * noiseVal * 0.2 * pulse;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
  }
`;

const coreFragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    // Fresnel-like effect
    vec3 viewDir = vec3(0.0, 0.0, 1.0); // Approximate view direction
    float fresnel = pow(1.0 - dot(vNormal, viewDir), 2.0);

    vec3 colorA = vec3(0.1, 0.2, 0.8);
    vec3 colorB = vec3(1.0, 0.4, 0.0);

    vec3 finalColor = mix(colorA, colorB, fresnel + sin(uTime) * 0.2);

    // Add brightness for bloom
    gl_FragColor = vec4(finalColor * 2.0, 1.0);
  }
`;

// --- Initialization ---

async function init() {
  // 1. Setup Scenes
  const container = document.getElementById('scene-container');
  const cssContainer = document.getElementById('css-container');

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.02);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 10);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const cssRenderer = new CSS3DRenderer();
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
  cssContainer.appendChild(cssRenderer.domElement);

  // Post-processing
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, 0.4, 0.85
  );
  bloomPass.threshold = 0.2;
  bloomPass.strength = 1.2; // Intense bloom
  bloomPass.radius = 0.5;
  composer.addPass(bloomPass);

  // 2. Objects

  // --- Particles ---
  const particleCount = 2000;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleScales = new Float32Array(particleCount);
  const particleRandom = new Float32Array(particleCount * 3);

  for(let i=0; i<particleCount; i++) {
    particlePositions[i*3] = (Math.random() - 0.5) * 50;
    particlePositions[i*3+1] = (Math.random() - 0.5) * 20 + 5;
    particlePositions[i*3+2] = (Math.random() - 0.5) * 50;

    particleScales[i] = Math.random();
    particleRandom[i*3] = Math.random();
    particleRandom[i*3+1] = Math.random();
    particleRandom[i*3+2] = Math.random();
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeo.setAttribute('aScale', new THREE.BufferAttribute(particleScales, 1));
  particleGeo.setAttribute('aRandom', new THREE.BufferAttribute(particleRandom, 3));

  const particleMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: window.devicePixelRatio }
    },
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const particleSystem = new THREE.Points(particleGeo, particleMat);
  scene.add(particleSystem);

  // --- City ---
  const cityGroup = new THREE.Group();
  scene.add(cityGroup);
  // Procedural boxes
  const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
  buildingGeo.translate(0, 0.5, 0); // Pivot at bottom

  const cityMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color(0x0a1020) }, // Dark Blue
      uColor2: { value: new THREE.Color(0x203050) }  // Lighter Blue
    },
    vertexShader: cityVertexShader,
    fragmentShader: cityFragmentShader
  });

  for(let i=0; i<50; i++) {
    const mesh = new THREE.Mesh(buildingGeo, cityMat);
    const x = (Math.random() - 0.5) * 60;
    const z = (Math.random() - 0.5) * 60 - 20; // Further back
    const h = Math.random() * 5 + 2;
    const w = Math.random() * 2 + 1;

    mesh.position.set(x, -5, z); // Start low
    mesh.scale.set(w, h, w);
    cityGroup.add(mesh);
  }

  // --- Core ---
  const coreGeo = new THREE.IcosahedronGeometry(2, 20);
  const coreMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }
    },
    vertexShader: coreVertexShader,
    fragmentShader: coreFragmentShader
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.set(0, 0, -50); // Start far away
  scene.add(core);


  // --- DOM Panels ---
  function createPanel(title, text) {
    const div = document.createElement('div');
    div.className = 'panel';
    div.innerHTML = `
      <h2>${title}</h2>
      <div class="content">${text}</div>
      <div class="chart-container">
        <div class="bar" style="left: 10%; height: 0%"></div>
        <div class="bar" style="left: 30%; height: 0%"></div>
        <div class="bar" style="left: 50%; height: 0%"></div>
        <div class="bar" style="left: 70%; height: 0%"></div>
      </div>
    `;
    const obj = new CSS3DObject(div);
    return obj;
  }

  const panel1 = createPanel('System Metrics', 'Optimizing render pipeline...<br>Allocating GPU buffers...');
  panel1.position.set(-8, 2, -15);
  panel1.rotation.y = 0.5;
  panel1.scale.set(0.02, 0.02, 0.02); // Scale down CSS pixels to world units
  scene.add(panel1);

  const panel2 = createPanel('Network Status', 'Connected to Agent Swarm.<br>Latency: 12ms<br>Syncing nodes...');
  panel2.position.set(8, 4, -20);
  panel2.rotation.y = -0.5;
  panel2.scale.set(0.02, 0.02, 0.02);
  scene.add(panel2);

  // --- Final Logo ---
  const logoDiv = document.createElement('div');
  logoDiv.className = 'logo-reveal';
  logoDiv.innerHTML = `
    <div class="logo-text">AGENT 3D</div>
    <div class="tagline">Future of Interface</div>
  `;
  document.body.appendChild(logoDiv); // Direct DOM overlay, not 3D

  // --- Helios Setup ---
  const helios = new Helios({ fps: FPS, duration: DURATION });
  helios.bindToDocumentTimeline();

  // --- Animation Loop ---

  // Helpers
  const easeInOutCubic = t => t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1;
  const linear = t => t;

  function update(time) {
    // Uniforms
    particleMat.uniforms.uTime.value = time;
    cityMat.uniforms.uTime.value = time;
    coreMat.uniforms.uTime.value = time;

    // Camera Movement
    // 0-3s: Drift forward
    // 3-8s: Rise up
    // 8-14s: Fly forward past panels
    // 14-20s: Approach core
    // 20-25s: Pass through core
    // 25-30s: Logo

    // Spline-like camera path
    let tx = 0, ty = 0, tz = 10, rx = 0, ry = 0;

    if (time < 3) {
      // Opening
      tz = 10 - time * 0.5; // 10 -> 8.5
      ty = 2;
    } else if (time < 8) {
      // Reveal
      const t = (time - 3) / 5;
      const e = easeInOutCubic(t);
      tz = 8.5 - e * 10; // 8.5 -> -1.5
      ty = 2 + e * 5;    // 2 -> 7
      rx = -e * 0.2;     // Look down slightly
    } else if (time < 14) {
      // Story
      const t = (time - 8) / 6;
      tz = -1.5 - t * 20; // -1.5 -> -21.5
      ty = 7;
      // Sway
      tx = Math.sin(time) * 2;
      rx = -0.2 + Math.sin(time*0.5)*0.05;
    } else if (time < 20) {
      // Approach Core
      const t = (time - 14) / 6;
      const e = t*t; // accelerate
      tz = -21.5 - e * 25; // -21.5 -> -46.5 (Close to core at -50)
      ty = 7 - e * 7;      // 7 -> 0
      tx = 0;
      rx = 0;

      // Core appears
      core.position.z = -50;
      // Shake
      if(time > 18) {
        tx = (Math.random()-0.5) * 0.5;
        ty = (Math.random()-0.5) * 0.5;
      }
    } else if (time < 25) {
      // Climax
      const t = (time - 20) / 5;
      // Pass through
      tz = -46.5 - t * 20; // -> -66.5

      // Explosion effect
      const explosion = Math.max(0, t * 10);
      core.scale.setScalar(1 + explosion);
      coreMat.opacity = 1.0 - t;
      coreMat.transparent = true;

      // Particles scatter
      particleMat.uniforms.uTime.value = time * (1 + t * 5); // Speed up
    }

    // Apply Camera
    camera.position.set(tx, ty, tz);
    camera.rotation.x = rx;
    camera.rotation.y = ry;

    // Panel Visibility / Animation
    if (time > 8 && time < 16) {
      // Fade in panels
      [panel1, panel2].forEach((p, i) => {
        const el = p.element;
        // Simple visibility check based on z distance
        const dist = p.position.z - camera.position.z;
        if (dist < 10 && dist > -5) {
            el.style.opacity = '1';
            // Animate bars
            const bars = el.querySelectorAll('.bar');
            bars.forEach(b => {
                const h = 20 + Math.sin(time * 5 + i) * 50;
                b.style.height = Math.abs(h) + '%';
            });
        } else {
            el.style.opacity = '0';
        }
      });
    }

    // Final Logo
    if (time > 24) {
      const t = Math.min(1, (time - 24) / 2); // 2s fade in
      logoDiv.style.opacity = t.toString();

      // Move background away/fade
      scene.background = new THREE.Color(0x000000);
      scene.fog.density = 0.02 + t * 0.1; // Fade to black via fog
    } else {
        logoDiv.style.opacity = '0';
    }

    // Render
    composer.render();
    cssRenderer.render(scene, camera);
  }

  helios.subscribe((state) => {
    update(state.currentTime);
  });

  // Handle resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
  });
}

init();
