import { describe, it, expect } from 'vitest';
import { validateMarker, validateMarkers, Marker } from './markers';
import { HeliosErrorCode } from './errors';

describe('markers', () => {
  describe('validateMarker', () => {
    it('should pass for a valid marker', () => {
      const marker: Marker = { id: 'm1', time: 10, label: 'Intro' };
      expect(validateMarker(marker)).toEqual(marker);
    });

    it('should throw if id is empty', () => {
      const marker: Marker = { id: '', time: 10, label: 'Intro' };
      expect(() => validateMarker(marker)).toThrow(/Marker ID cannot be empty/);
    });

    it('should throw if time is negative', () => {
      const marker: Marker = { id: 'm1', time: -1, label: 'Intro' };
      expect(() => validateMarker(marker)).toThrow(/Marker time cannot be negative/);
    });
  });

  describe('validateMarkers', () => {
    it('should pass for a list of unique markers', () => {
      const markers: Marker[] = [
        { id: 'm1', time: 10, label: 'One' },
        { id: 'm2', time: 20, label: 'Two' }
      ];
      expect(validateMarkers(markers)).toEqual(markers);
    });

    it('should sort markers by time', () => {
      const markers: Marker[] = [
        { id: 'm2', time: 20, label: 'Two' },
        { id: 'm1', time: 10, label: 'One' }
      ];
      const sorted = validateMarkers(markers);
      expect(sorted[0].id).toBe('m1');
      expect(sorted[1].id).toBe('m2');
    });

    it('should throw for duplicate IDs', () => {
      const markers: Marker[] = [
        { id: 'm1', time: 10, label: 'One' },
        { id: 'm1', time: 20, label: 'Two' }
      ];
      expect(() => validateMarkers(markers)).toThrow(/Duplicate marker ID/);
    });
  });
});
