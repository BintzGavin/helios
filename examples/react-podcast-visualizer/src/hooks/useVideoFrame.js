import { useContext } from 'react';
import { HeliosContext } from '../components/HeliosProvider';

export function useVideoFrame() {
  const context = useContext(HeliosContext);
  if (!context) {
    throw new Error('useVideoFrame must be used within a HeliosProvider');
  }
  return context;
}
