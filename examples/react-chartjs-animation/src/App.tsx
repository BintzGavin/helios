import React from 'react';
import { ChartComponent } from './Chart';

export default function App() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f0f0f0'
    }}>
      <div style={{ width: '80%', height: '80%' }}>
        <ChartComponent />
      </div>
    </div>
  );
}
