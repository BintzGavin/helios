import React from 'react';
import { Lottie } from './Lottie';
import animationData from './animation.json';

export default function App({ helios }) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
       <Lottie animationData={animationData} helios={helios} />
    </div>
  );
}
