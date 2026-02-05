import { onMount, onCleanup } from 'solid-js';
import * as d3 from 'd3';
import { helios } from './helios';
import { DATA_SERIES } from './data';

export default function App() {
  let svgRef: SVGSVGElement | undefined;

  const margin = { top: 60, right: 60, bottom: 60, left: 60 };
  const width = 1920 - margin.left - margin.right;
  const height = 1080 - margin.top - margin.bottom;

  onMount(() => {
    if (!svgRef) return;

    // Clear any existing content
    d3.select(svgRef).selectAll("*").remove();

    const svg = d3.select(svgRef)
      .attr('width', 1920)
      .attr('height', 1080)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(DATA_SERIES[0].map(d => d.name))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, 200])
      .range([height, 0]);

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .style('font-size', '24px')
      .call(d3.axisBottom(x));

    svg.append('g')
      .style('font-size', '24px')
      .call(d3.axisLeft(y));

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .style('font-size', '48px')
      .style('font-family', 'sans-serif')
      .text('SolidJS + D3 Integration');

    const update = (time: number) => {
      const stepDuration = 1;
      const totalSteps = DATA_SERIES.length - 1;
      const safeTime = Math.max(0, Math.min(time, totalSteps * stepDuration));
      const currentIndex = Math.floor(safeTime / stepDuration);
      const nextIndex = Math.min(currentIndex + 1, totalSteps);
      const progress = (safeTime % stepDuration) / stepDuration;

      const currentData = DATA_SERIES[currentIndex];
      const nextData = DATA_SERIES[nextIndex];

      const interpolatedData = currentData.map((d, i) => {
        const nextD = nextData[i];
        return {
          name: d.name,
          value: d.value + (nextD.value - d.value) * progress,
          color: d.color
        };
      });

      const bars = svg.selectAll('.bar')
        .data(interpolatedData, (d: any) => d.name);

      bars.enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d: any) => x(d.name)!)
        .attr('width', x.bandwidth())
        .attr('fill', (d: any) => d.color)
        .merge(bars as any)
        .attr('y', (d: any) => y(d.value))
        .attr('height', (d: any) => height - y(d.value));

      bars.exit().remove();
    };

    const unsubscribe = helios.subscribe((state) => {
      update(state.currentTime);
    });

    update(0);

    onCleanup(() => {
      unsubscribe();
    });
  });

  return (
    <div style={{ width: '100%', height: '100%', background: '#f0f0f0' }}>
      <svg ref={svgRef} />
    </div>
  );
}
