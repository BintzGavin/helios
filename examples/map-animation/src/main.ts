import { Helios } from '../../../packages/core/src/index.ts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';

// Fix Leaflet icon paths for Vite (Common "Use What You Know" issue)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Init Map
// Use a neutral container ID
const map = L.map('map', {
    zoomControl: false, // Cleaner for video
    attributionControl: false // Cleaner for video (add custom if needed)
}).setView([51.505, -0.09], 13);

// Use OSM Tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Route Data (London -> Paris -> Berlin)
// Array of { lat, lng, time }
const route = [
  { lat: 51.505, lng: -0.09, time: 0 }, // London
  { lat: 48.8566, lng: 2.3522, time: 5 } // Paris
];

// Init Helios
const helios = new Helios({ duration: 5, fps: 30 });
helios.bindToDocumentTimeline();

// Stability Check: Wait for tiles
helios.registerStabilityCheck(() => {
   return new Promise<void>(resolve => {
       // Simple buffer for demo
       setTimeout(resolve, 100);
   });
});

// Interpolation Helper
function interpolate(start: number, end: number, progress: number) {
    return start + (end - start) * progress;
}

// Animation Loop
helios.subscribe(state => {
    const t = state.currentFrame / helios.fps;

    // Find segment
    // (Simplified: assumes 1 segment for demo)
    const p1 = route[0];
    const p2 = route[1];
    const duration = p2.time - p1.time;
    const progress = Math.max(0, Math.min(1, (t - p1.time) / duration));

    const lat = interpolate(p1.lat, p2.lat, progress);
    const lng = interpolate(p1.lng, p2.lng, progress);

    map.setView([lat, lng], 13, { animate: false });
});

// Expose helios for debugging/driving
(window as any).helios = helios;
