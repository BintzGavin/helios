import React, { useState, useEffect } from 'react';
import './StudioLayout.css';
import { Resizer } from './Resizer';

interface StudioLayoutProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  stage?: React.ReactNode;
  inspector?: React.ReactNode;
  timeline?: React.ReactNode;
}

const DEFAULT_SIDEBAR_WIDTH = 250;
const DEFAULT_INSPECTOR_WIDTH = 300;
const DEFAULT_TIMELINE_HEIGHT = 300;

export const StudioLayout: React.FC<StudioLayoutProps> = ({
  header,
  sidebar,
  stage,
  inspector,
  timeline,
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('helios-layout-sidebar');
      return saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;
    } catch (e) {
      return DEFAULT_SIDEBAR_WIDTH;
    }
  });

  const [inspectorWidth, setInspectorWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('helios-layout-inspector');
      return saved ? parseInt(saved, 10) : DEFAULT_INSPECTOR_WIDTH;
    } catch (e) {
      return DEFAULT_INSPECTOR_WIDTH;
    }
  });

  const [timelineHeight, setTimelineHeight] = useState(() => {
    try {
      const saved = localStorage.getItem('helios-layout-timeline');
      return saved ? parseInt(saved, 10) : DEFAULT_TIMELINE_HEIGHT;
    } catch (e) {
      return DEFAULT_TIMELINE_HEIGHT;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('helios-layout-sidebar', sidebarWidth.toString());
    } catch (e) {
      // Ignore storage errors
    }
  }, [sidebarWidth]);

  useEffect(() => {
    try {
      localStorage.setItem('helios-layout-inspector', inspectorWidth.toString());
    } catch (e) {
      // Ignore storage errors
    }
  }, [inspectorWidth]);

  useEffect(() => {
    try {
      localStorage.setItem('helios-layout-timeline', timelineHeight.toString());
    } catch (e) {
      // Ignore storage errors
    }
  }, [timelineHeight]);

  const handleResizeSidebar = (delta: number) => {
    setSidebarWidth((prev) => Math.max(150, Math.min(600, prev + delta)));
  };

  const handleResizeInspector = (delta: number) => {
    // Dragging right (positive) decreases width
    setInspectorWidth((prev) => Math.max(200, Math.min(600, prev - delta)));
  };

  const handleResizeTimeline = (delta: number) => {
    // Dragging down (positive) decreases height
    setTimelineHeight((prev) => Math.max(100, Math.min(800, prev - delta)));
  };

  const style = {
    '--sidebar-width': `${sidebarWidth}px`,
    '--inspector-width': `${inspectorWidth}px`,
    '--timeline-height': `${timelineHeight}px`,
  } as React.CSSProperties;

  return (
    <div className="studio-layout" style={style}>
      <header className="area-header">{header}</header>

      <aside className="area-sidebar">{sidebar}</aside>
      <Resizer
        className="resizer-sidebar"
        direction="horizontal"
        onResize={handleResizeSidebar}
      />

      <main className="area-stage">{stage}</main>

      <aside className="area-inspector">{inspector}</aside>
      <Resizer
        className="resizer-inspector"
        direction="horizontal"
        onResize={handleResizeInspector}
      />

      <footer className="area-timeline">{timeline}</footer>
      <Resizer
        className="resizer-timeline"
        direction="vertical"
        onResize={handleResizeTimeline}
      />
    </div>
  );
};
