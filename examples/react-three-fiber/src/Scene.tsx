import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

export default function Scene() {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    // state.clock.elapsedTime should match what we passed to advance()
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
        meshRef.current.rotation.x = t;
        meshRef.current.rotation.y = t * 0.5;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}
