import { HeliosError, HeliosErrorCode } from './errors.js';

export interface Marker {
  id: string;
  time: number; // in seconds
  label: string;
  color?: string; // hex code
}

export function validateMarker(marker: Marker): Marker {
  if (!marker.id || marker.id.trim() === '') {
    throw new HeliosError(
      HeliosErrorCode.INVALID_MARKER,
      'Marker ID cannot be empty',
      'Ensure every marker has a unique, non-empty "id" string.'
    );
  }

  if (marker.time < 0) {
    throw new HeliosError(
      HeliosErrorCode.INVALID_MARKER,
      `Marker time cannot be negative: ${marker.time}`,
      'Ensure "time" is greater than or equal to 0 seconds.'
    );
  }

  return { ...marker };
}

export function validateMarkers(markers: Marker[]): Marker[] {
  const seen = new Set<string>();
  const validated: Marker[] = [];

  for (const marker of markers) {
    const v = validateMarker(marker);
    if (seen.has(v.id)) {
      throw new HeliosError(
        HeliosErrorCode.INVALID_MARKER,
        `Duplicate marker ID: ${v.id}`,
        'Ensure all markers have unique IDs.'
      );
    }
    seen.add(v.id);
    validated.push(v);
  }

  // Sort by time
  return validated.sort((a, b) => a.time - b.time);
}
