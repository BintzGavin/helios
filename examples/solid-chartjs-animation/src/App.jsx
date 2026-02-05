import { onMount, onCleanup } from 'solid-js';
import Chart from 'chart.js/auto';

export default function App() {
  let canvasRef;
  let chart;

  onMount(() => {
    if (!canvasRef) return;

    chart = new Chart(canvasRef, {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Sales',
          data: [12, 19, 3, 5, 2, 3],
          borderWidth: 1,
          backgroundColor: 'rgba(54, 162, 235, 0.5)'
        }]
      },
      options: {
        animation: false, // Critical for Helios control
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 30
          }
        }
      }
    });

    if (window.helios) {
      const unsubscribe = window.helios.subscribe((state) => {
        if (chart) {
          const time = state.currentTime;
          // Animate data based on time
          // Simple sine wave animation for demonstration
          const baseData = [12, 19, 3, 5, 2, 3];
          const newData = baseData.map((val, i) => {
            return Math.abs(val + Math.sin(time * 2 + i) * 10);
          });

          chart.data.datasets[0].data = newData;
          chart.update('none'); // Synchronous update
        }
      });

      onCleanup(() => {
        unsubscribe();
        if (chart) {
            chart.destroy();
        }
      });
    }
  });

  return (
    <div style={{
      position: 'relative',
      height: '800px',
      width: '1200px',
      display: 'flex',
      "flex-direction": 'column',
      "align-items": 'center',
      "justify-content": 'center'
    }}>
      <h1 style={{ "font-family": "sans-serif", "margin-bottom": "20px", color: "white" }}>SolidJS + Chart.js Integration</h1>
      <div style={{ position: 'relative', height: '100%', width: '100%' }}>
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}
