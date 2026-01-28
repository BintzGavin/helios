import React, { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Helios } from '../../../packages/core/src/index.ts';

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  background-color: #f0f0f0;
`;

const Box = styled.div`
  width: 200px;
  height: 200px;
  background-color: #007bff;
  animation: ${rotate} 2s linear infinite;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-family: sans-serif;
  font-weight: bold;
`;

function App() {
  useEffect(() => {
    // eslint-disable-next-line no-unused-vars
    const helios = new Helios({
      fps: 30,
      duration: 5,
      autoSyncAnimations: true,
    });
  }, []);

  return (
    <Container>
      <Box>Styled!</Box>
    </Container>
  );
}

export default App;
