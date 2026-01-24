import React from 'react';
import './StudioLayout.css';

interface StudioLayoutProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  stage?: React.ReactNode;
  inspector?: React.ReactNode;
  timeline?: React.ReactNode;
}

export const StudioLayout: React.FC<StudioLayoutProps> = ({
  header,
  sidebar,
  stage,
  inspector,
  timeline,
}) => {
  return (
    <div className="studio-layout">
      <header className="area-header">{header}</header>
      <aside className="area-sidebar">{sidebar}</aside>
      <main className="area-stage">{stage}</main>
      <aside className="area-inspector">{inspector}</aside>
      <footer className="area-timeline">{timeline}</footer>
    </div>
  );
};
