<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import { helios } from './helios';

  let canvas: HTMLCanvasElement;
  let chart: Chart;
  let unsubscribe: () => void;

  onMount(() => {
    if (canvas) {
      chart = new Chart(canvas, {
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

      unsubscribe = helios.subscribe((state) => {
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
    }
  });

  onDestroy(() => {
    chart?.destroy();
    unsubscribe?.();
  });
</script>

<div class="chart-container">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
.chart-container {
  position: relative;
  height: 800px;
  width: 1200px;
}
</style>
