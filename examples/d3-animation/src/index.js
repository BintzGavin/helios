import { Helios } from '../../../packages/core/dist/index.js';
import * as d3 from 'd3';
import { DATA_SERIES } from './data.js';

const duration = 5;
const helios = new Helios({ duration, fps: 30 });

// Expose for debugging/player
window.helios = helios;
helios.bindToDocumentTimeline();

// Setup SVG
const width = 800;
const height = 600;
const margin = { top: 30, right: 30, bottom: 30, left: 60 };

const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

// Scales
const x = d3.scaleBand()
    .range([margin.left, width - margin.right])
    .padding(0.1);

const y = d3.scaleLinear()
    .range([height - margin.bottom, margin.top]);

// Axes
const xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

const yAxis = g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

// Initial render logic
if (!DATA_SERIES || !DATA_SERIES[0]) {
    console.error("DATA_SERIES is missing or empty", DATA_SERIES);
}

const names = DATA_SERIES[0].map(d => d.name);
x.domain(names);

svg.append("g").call(xAxis);
const yAxisGroup = svg.append("g").call(yAxis);

const barGroup = svg.append("g");

// Update function
function update(time) {
    if (isNaN(time)) {
        console.warn("Time is NaN, skipping update");
        return;
    }

    const totalIntervals = DATA_SERIES.length - 1;
    const intervalDuration = duration / totalIntervals;

    // Clamp time
    const clampedTime = Math.min(Math.max(time, 0), duration);

    // Find current interval
    let currentIntervalIndex = Math.floor(clampedTime / intervalDuration);
    // Handle the end of the timeline
    if (currentIntervalIndex >= totalIntervals) {
        currentIntervalIndex = totalIntervals - 1;
    }

    const startData = DATA_SERIES[currentIntervalIndex];
    const endData = DATA_SERIES[currentIntervalIndex + 1];

    if (!startData) {
        console.error(`Start data undefined for index ${currentIntervalIndex}, time ${time}, duration ${duration}`);
        return;
    }
    if (!endData) {
         // Should not happen if index logic is correct, but safe check
         console.warn(`End data undefined for index ${currentIntervalIndex + 1}. Using start data.`);
    }

    // t is 0..1 within the interval
    let t = (clampedTime - (currentIntervalIndex * intervalDuration)) / intervalDuration;
    // Clamp t to [0, 1] to handle floating point issues or overshooting
    t = Math.max(0, Math.min(1, t));

    // Interpolate data
    const interpolatedData = startData.map(d => {
        const endD = endData ? endData.find(ed => ed.name === d.name) : d;
        return {
            name: d.name,
            value: d.value + (endD.value - d.value) * t,
            color: d.color
        };
    });

    // Update scales (adjust domain dynamically)
    y.domain([0, 200]).nice(); // Fixed domain to avoid jitter or scale jumping, or dynamic:
    // y.domain([0, d3.max(interpolatedData, d => d.value)]).nice();
    // Let's use a dynamic domain but with a fixed max to start with so it looks stable?
    // Actually dynamic is fine if we update the axis.

    // For smoother animation, let's keep the Y axis domain fixed if we want to see bars grow,
    // OR animate the axis too. D3 axes are fast enough.
    // Let's use a fixed max for this example to make the bar growth more obvious.
    // Max value in data is 180.
    y.domain([0, 200]);

    // yAxisGroup.call(yAxis); // Only needed if domain changes

    // Update bars
    const bars = barGroup.selectAll("rect")
        .data(interpolatedData, d => d.name);

    bars.enter()
        .append("rect")
        .attr("fill", d => d.color)
        .attr("x", d => x(d.name))
        .attr("width", x.bandwidth())
        .merge(bars)
        .attr("y", d => y(d.value))
        .attr("height", d => y(0) - y(d.value));

    bars.exit().remove();
}

helios.subscribe(({ currentFrame, fps }) => {
    const time = currentFrame / fps;
    update(time);
});
