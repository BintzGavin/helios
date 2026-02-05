import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { helios } from './helios';

export function ChartComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current = new Chart(canvasRef.current, {
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

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    // Subscribe to Helios frames
    const unsubscribe = helios.subscribe((state) => {
      if (chartRef.current) {
        const time = state.currentTime;
        // Animate data based on time
        // Simple sine wave animation for demonstration
        const baseData = [12, 19, 3, 5, 2, 3];
        const newData = baseData.map((val, i) => {
          return Math.abs(val + Math.sin(time * 2 + i) * 10);
        });

        chartRef.current.data.datasets[0].data = newData;
        chartRef.current.update('none'); // Synchronous update
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return <canvas ref={canvasRef} />;
}
