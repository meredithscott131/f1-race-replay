export interface Point {
  x: number;
  y: number;
}

export interface TrackBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface DRSZoneSegment {
  startIndex: number;
  endIndex: number;
}

export interface TrackData {
  innerBoundary: Point[];
  outerBoundary: Point[];
  centerLine: Point[];
  bounds: TrackBounds;
  drsZones?: DRSZoneSegment[];
}
