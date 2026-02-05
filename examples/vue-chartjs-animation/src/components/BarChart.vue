<template>
  <div class="chart-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import Chart from 'chart.js/auto';
import { helios } from '../helios';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const chartInstance = ref<Chart | null>(null);

let unsubscribe: (() => void) | null = null;

onMounted(() => {
  if (canvasRef.value) {
    chartInstance.value = new Chart(canvasRef.value, {
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
      if (chartInstance.value) {
        const time = state.currentTime;
        // Animate data based on time
        // Simple sine wave animation for demonstration
        const baseData = [12, 19, 3, 5, 2, 3];
        const newData = baseData.map((val, i) => {
          return Math.abs(val + Math.sin(time * 2 + i) * 10);
        });

        chartInstance.value.data.datasets[0].data = newData;
        chartInstance.value.update('none'); // Synchronous update
      }
    });
  }
});

onUnmounted(() => {
  if (chartInstance.value) {
    chartInstance.value.destroy();
  }
  if (unsubscribe) {
    unsubscribe();
  }
});
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 800px;
  width: 1200px;
}
</style>
