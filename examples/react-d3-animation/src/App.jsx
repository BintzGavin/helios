import React, { useRef, useEffect } from 'react';
import { Helios } from '@helios-project/core';
import * as d3 from 'd3';
import { DATA_SERIES } from './data';

const duration = 5;
const helios = new Helios({ duration, fps: 30 });
helios.bindToDocumentTimeline();

// Expose for debugging/player
window.helios = helios;

export default function App() {
  const svgRef = useRef(null);

  useEffect(() => {
    const width = 800;
    const height = 600;
    const margin = { top: 30, right: 30, bottom: 30, left: 60 };

    // Clear previous content (important for React StrictMode)
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
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
        console.error("DATA_SERIES is missing or empty");
        return;
    }

    const names = DATA_SERIES[0].map(d => d.name);
    x.domain(names);

    svg.append("g").call(xAxis);
    const yAxisGroup = svg.append("g").call(yAxis);

    // Set initial Y domain
    y.domain([0, 200]);
    yAxisGroup.call(yAxis);

    const barGroup = svg.append("g");

    // Update function
    function update(time) {
        if (isNaN(time)) return;

        const totalIntervals = DATA_SERIES.length - 1;
        const intervalDuration = duration / totalIntervals;
        const clampedTime = Math.min(Math.max(time, 0), duration);

        let currentIntervalIndex = Math.floor(clampedTime / intervalDuration);
        if (currentIntervalIndex >= totalIntervals) {
            currentIntervalIndex = totalIntervals - 1;
        }

        const startData = DATA_SERIES[currentIntervalIndex];
        const endData = DATA_SERIES[currentIntervalIndex + 1];

        if (!startData) return;

        let t = (clampedTime - (currentIntervalIndex * intervalDuration)) / intervalDuration;
        t = Math.max(0, Math.min(1, t));

        const interpolatedData = startData.map(d => {
            const endD = endData ? endData.find(ed => ed.name === d.name) : d;
            return {
                name: d.name,
                value: d.value + (endD.value - d.value) * t,
                color: d.color
            };
        });

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

    const unsubscribe = helios.subscribe(({ currentFrame, fps }) => {
        const time = currentFrame / fps;
        update(time);
    });

    return () => {
        unsubscribe();
    };
  }, []);

  return (
    <svg ref={svgRef}></svg>
  );
}
