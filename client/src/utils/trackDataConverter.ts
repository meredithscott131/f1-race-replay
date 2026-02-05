import type { TrackData, Point } from '../types/track.types';
import type { TrackFrame } from '../types/track-api.types';

/**
 * Build track from lightweight track frames (first lap only)
 * Improved version with better smoothing and boundary generation
 */
export function buildTrackFromFrames(frames: TrackFrame[]): TrackData | null {
  if (!frames || frames.length < 10) {
    console.error('Not enough frames to build track');
    return null;
  }

  console.log(`Building track from ${frames.length} frames`);

  // Extract and smooth center line
  let centerLine: Point[] = frames.map(f => ({ x: f.x, y: f.y }));
  
  // Remove duplicate consecutive points
  centerLine = removeDuplicates(centerLine);
  
  // Close the loop if needed (connect last point to first)
  if (centerLine.length > 0) {
    const first = centerLine[0];
    const last = centerLine[centerLine.length - 1];
    const distance = Math.sqrt(
      Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
    );
    
    // If last point is far from first, close the loop
    if (distance > 50) {
      centerLine.push({ ...first });
    }
  }

  console.log(`Center line has ${centerLine.length} points after processing`);

  // Calculate bounds with some padding
  const xs = centerLine.map(p => p.x);
  const ys = centerLine.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Build inner and outer boundaries with improved offset calculation
  const trackWidth = 150; // Reduced from 200 for better fit
  const innerBoundary = offsetPathImproved(centerLine, -trackWidth / 2);
  const outerBoundary = offsetPathImproved(centerLine, trackWidth / 2);

  console.log(`Track bounds: X[${minX.toFixed(0)}, ${maxX.toFixed(0)}], Y[${minY.toFixed(0)}, ${maxY.toFixed(0)}]`);

  return {
    innerBoundary,
    outerBoundary,
    centerLine,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
    },
  };
}

/**
 * Remove duplicate consecutive points
 */
function removeDuplicates(path: Point[], threshold: number = 1.0): Point[] {
  if (path.length === 0) return path;
  
  const result: Point[] = [path[0]];
  
  for (let i = 1; i < path.length; i++) {
    const prev = result[result.length - 1];
    const curr = path[i];
    
    const dist = Math.sqrt(
      Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
    );
    
    if (dist > threshold) {
      result.push(curr);
    }
  }
  
  return result;
}

/**
 * Improved offset path calculation with better normal vector handling
 */
function offsetPathImproved(path: Point[], distance: number): Point[] {
  if (path.length < 3) return path;

  const offsetPoints: Point[] = [];
  const smoothingWindow = 3; // Number of points to average for smoother normals

  for (let i = 0; i < path.length; i++) {
    // Get several surrounding points for smoother normal calculation
    const indices = [];
    for (let j = -smoothingWindow; j <= smoothingWindow; j++) {
      let idx = i + j;
      // Handle wrap-around for closed loop
      if (idx < 0) idx += path.length;
      if (idx >= path.length) idx -= path.length;
      indices.push(idx);
    }

    // Calculate average tangent direction
    let avgDx = 0;
    let avgDy = 0;
    let count = 0;

    for (let j = 0; j < indices.length - 1; j++) {
      const p1 = path[indices[j]];
      const p2 = path[indices[j + 1]];
      
      avgDx += p2.x - p1.x;
      avgDy += p2.y - p1.y;
      count++;
    }

    avgDx /= count;
    avgDy /= count;

    // Normalize
    const len = Math.sqrt(avgDx * avgDx + avgDy * avgDy) || 1;
    avgDx /= len;
    avgDy /= len;

    // Calculate perpendicular (normal) - rotate 90 degrees
    const nx = -avgDy;
    const ny = avgDx;

    // Apply offset
    const curr = path[i];
    offsetPoints.push({
      x: curr.x + nx * distance,
      y: curr.y + ny * distance,
    });
  }

  return offsetPoints;
}

/**
 * Smooth a path using moving average
 */
function smoothPath(path: Point[], windowSize: number = 5): Point[] {
  if (path.length <= windowSize) {
    return path;
  }

  const smoothed: Point[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < path.length; i++) {
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (let j = -halfWindow; j <= halfWindow; j++) {
      const idx = Math.max(0, Math.min(path.length - 1, i + j));
      sumX += path[idx].x;
      sumY += path[idx].y;
      count++;
    }

    smoothed.push({
      x: sumX / count,
      y: sumY / count,
    });
  }

  return smoothed;
}

// Keep old function for backward compatibility
export function extractTrackFromTelemetry(frames: any[]): TrackData | null {
  console.warn('Using legacy extractTrackFromTelemetry - consider using buildTrackFromFrames');
  
  if (!frames || frames.length === 0) {
    return null;
  }

  const allPoints: Point[] = [];
  const sampleRate = Math.max(1, Math.floor(frames.length / 500));
  
  for (let i = 0; i < frames.length; i += sampleRate) {
    const frame = frames[i];
    const drivers = Object.values(frame.drivers);
    
    for (const driver of drivers) {
      allPoints.push({ x: (driver as any).x, y: (driver as any).y });
    }
  }

  if (allPoints.length === 0) {
    return null;
  }

  const xs = allPoints.map(p => p.x);
  const ys = allPoints.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const centerLine: Point[] = [];
  const firstFrame = frames[0];
  const firstDriverCode = Object.keys(firstFrame.drivers)[0];
  
  if (!firstDriverCode) {
    return null;
  }

  for (const frame of frames) {
    const driver = frame.drivers[firstDriverCode];
    if (driver && driver.lap === 1) {
      centerLine.push({ x: driver.x, y: driver.y });
    }
    
    if (driver && driver.lap > 1) {
      break;
    }
  }

  const trackWidth = 150;
  const innerBoundary = offsetPathImproved(centerLine, -trackWidth / 2);
  const outerBoundary = offsetPathImproved(centerLine, trackWidth / 2);

  return {
    innerBoundary,
    outerBoundary,
    centerLine,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
    },
  };
}
