import { onMount, onCleanup } from 'solid-js';
import * as d3 from 'd3';
import { DATA_SERIES } from './data';

// Helper to interpolate between two datasets
function interpolateData(dataA, dataB, t) {
  return dataA.map((d, i) => {
    const target = dataB.find(b => b.name === d.name) || d;
    return {
      name: d.name,
      value: d.value + (target.value - d.value) * t,
      color: d.color
    };
  });
}

export default function App() {
  let svgRef;

  onMount(() => {
    if (!svgRef) return;

    const margin = { top: 20, right: 30, bottom: 40, left: 90 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Initial Setup
    const svg = d3.select(svgRef)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X axis
    const x = d3.scaleLinear()
      .domain([0, 200])
      .range([0, width]);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
        .style("fill", "white"); // White text for dark mode

    svg.select(".domain").style("stroke", "white");
    svg.selectAll(".tick line").style("stroke", "white");

    // Y axis
    const y = d3.scaleBand()
      .range([0, height])
      .domain(DATA_SERIES[0].map(d => d.name))
      .padding(0.1);

    svg.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
        .style("fill", "white")
        .style("font-size", "14px");

    svg.select(".domain").style("stroke", "white");
    svg.selectAll(".tick line").style("stroke", "white");

    // Bars
    // We create the initial selection but don't set width yet
    const bars = svg.selectAll("myRect")
      .data(DATA_SERIES[0])
      .join("rect")
      .attr("x", x(0))
      .attr("y", d => y(d.name))
      .attr("height", y.bandwidth())
      .attr("fill", d => d.color);

    // Update function driven by Helios frame
    function update(timeInSeconds) {
      // Determine which two datasets we are between
      // Each dataset represents 1 second for simplicity
      const totalDuration = DATA_SERIES.length - 1;
      const clampedTime = Math.max(0, Math.min(timeInSeconds, totalDuration));

      const index = Math.floor(clampedTime);
      const nextIndex = Math.min(index + 1, totalDuration);
      const t = clampedTime - index;

      const currentData = interpolateData(DATA_SERIES[index], DATA_SERIES[nextIndex], t);

      // Update bars with D3
      // Since we are in "takeover" mode, we manipulate DOM directly via D3
      // bypassing Solid's reactivity for high-frequency updates
      bars.data(currentData)
        .attr("width", d => x(d.value));

      // Also update Y positions if we were reordering (optional, skipping for simplicity)
    }

    // Subscribe to Helios
    // Assuming window.helios exists from index.jsx
    if (window.helios) {
      const unsubscribe = window.helios.subscribe(({ currentFrame, fps }) => {
        const time = currentFrame / fps;
        update(time);
      });

      onCleanup(() => {
        unsubscribe();
      });
    }
  });

  return (
    <div style={{
      display: 'flex',
      "flex-direction": 'column',
      "align-items": 'center',
      "justify-content": 'center',
      height: '100%'
    }}>
      <h1 style={{ "font-family": "sans-serif", "margin-bottom": "20px" }}>SolidJS + D3 Integration</h1>
      <svg ref={svgRef}></svg>
      <p style={{ "font-family": "monospace", "margin-top": "20px", color: "#888" }}>
        Driven by Helios Frame Clock
      </p>
    </div>
  );
}
