import type { TrackData } from '../types/track.types';

// Simple oval track for testing
export const sampleOvalTrack: TrackData = {
  innerBoundary: generateOval(0, 0, 800, 400, 40),
  outerBoundary: generateOval(0, 0, 1000, 600, 40),
  centerLine: generateOval(0, 0, 900, 500, 40),
  bounds: {
    minX: -500,
    maxX: 500,
    minY: -300,
    maxY: 300,
  },
};

function generateOval(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  numPoints: number
): Array<{ x: number; y: number }> {
  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const x = centerX + (width / 2) * Math.cos(angle);
    const y = centerY + (height / 2) * Math.sin(angle);
    points.push({ x, y });
  }
  return points;
}

// Monza-like track shape (simplified)
export const sampleMonzaTrack: TrackData = {
  innerBoundary: [
    { x: 0, y: 0 },
    { x: 1000, y: 0 },
    { x: 1100, y: -100 },
    { x: 1100, y: -400 },
    { x: 900, y: -600 },
    { x: 400, y: -600 },
    { x: 200, y: -400 },
    { x: 200, y: -200 },
    { x: 0, y: 0 },
  ],
  outerBoundary: [
    { x: -100, y: 100 },
    { x: 1000, y: 100 },
    { x: 1200, y: -100 },
    { x: 1200, y: -400 },
    { x: 1000, y: -700 },
    { x: 400, y: -700 },
    { x: 100, y: -400 },
    { x: 100, y: -200 },
    { x: -100, y: 100 },
  ],
  centerLine: [
    { x: -50, y: 50 },
    { x: 1000, y: 50 },
    { x: 1150, y: -100 },
    { x: 1150, y: -400 },
    { x: 950, y: -650 },
    { x: 400, y: -650 },
    { x: 150, y: -400 },
    { x: 150, y: -200 },
    { x: -50, y: 50 },
  ],
  bounds: {
    minX: -100,
    maxX: 1200,
    minY: -700,
    maxY: 100,
  },
};
