import { Helios } from '../../../packages/core/src/index.ts';
import Chart from 'chart.js/auto';

// Init Helios
const helios = new Helios({ fps: 30, duration: 5 });
helios.bindToDocumentTimeline();

// Expose for debugging
(window as any).helios = helios;

// Init Chart
const canvas = document.getElementById('chart') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');

if (!ctx) throw new Error("Could not get canvas context");

const chart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: 'Sales',
            data: [10, 20, 30, 40, 50, 60],
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    },
    options: {
        animation: false, // Vital: Disable internal animation
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                max: 100
            }
        }
    }
});

// Subscribe
helios.subscribe((state) => {
    const t = state.currentTime;

    // Animate data based on time
    // Example: Sine wave animation for bar heights
    const newData = chart.data.labels!.map((_, i) => {
        // Base value + oscillation
        // Offset phase by index i to create a wave
        return 50 + 40 * Math.sin(t * 2 + i * 0.5);
    });

    chart.data.datasets[0].data = newData;
    chart.update('none'); // Render immediately
});
