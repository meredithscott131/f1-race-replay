import type { Point, TrackBounds, TrackData } from '../types/track.types';

export class TrackRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private trackData: TrackData | null = null;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    this.ctx = ctx;
  }

  setTrackData(data: TrackData) {
    this.trackData = data;
    this.calculateScaling();
  }

  private calculateScaling() {
    if (!this.trackData) return;

    const bounds = this.trackData.bounds;
    const padding = 50; // pixels

    const worldWidth = bounds.maxX - bounds.minX;
    const worldHeight = bounds.maxY - bounds.minY;

    const availableWidth = this.canvas.width - 2 * padding;
    const availableHeight = this.canvas.height - 2 * padding;

    // Calculate scale to fit track in canvas
    const scaleX = availableWidth / worldWidth;
    const scaleY = availableHeight / worldHeight;
    this.scale = Math.min(scaleX, scaleY);

    // Calculate offset to center the track
    const scaledWidth = worldWidth * this.scale;
    const scaledHeight = worldHeight * this.scale;

    this.offsetX = (this.canvas.width - scaledWidth) / 2 - bounds.minX * this.scale;
    this.offsetY = (this.canvas.height - scaledHeight) / 2 - bounds.minY * this.scale;
  }

  private worldToScreen(point: Point): Point {
    return {
      x: point.x * this.scale + this.offsetX,
      y: point.y * this.scale + this.offsetY,
    };
  }

  clear() {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render() {
    if (!this.trackData) return;

    this.clear();

    // Draw outer boundary
    this.drawPath(this.trackData.outerBoundary, '#666666', 4);

    // Draw inner boundary
    this.drawPath(this.trackData.innerBoundary, '#666666', 4);

    // Draw DRS zones (green highlights on outer boundary)
    this.drawDRSZones();

    // Draw finish line (checkered)
    this.drawFinishLine();
  }

  private drawDRSZones() {
    if (!this.trackData) {
      console.log('No track data for DRS zones');
      return;
    }
    
    if (!this.trackData.drsZones) {
      console.log('No DRS zones in track data');
      return;
    }
    
    if (this.trackData.drsZones.length === 0) {
      console.log('DRS zones array is empty');
      return;
    }

    console.log(`Drawing ${this.trackData.drsZones.length} DRS zones`);
    const drsColor = '#00FF00'; // Bright green

    for (let i = 0; i < this.trackData.drsZones.length; i++) {
      const zone = this.trackData.drsZones[i];
      const startIdx = zone.startIndex;
      const endIdx = zone.endIndex;

      console.log(`DRS Zone ${i}: indices ${startIdx} to ${endIdx}, outer boundary length: ${this.trackData.outerBoundary.length}`);

      if (startIdx >= this.trackData.outerBoundary.length || endIdx >= this.trackData.outerBoundary.length) {
        console.warn(`DRS zone ${i} indices out of bounds`);
        continue;
      }

      // Extract the segment of outer boundary for this DRS zone
      const zoneSegment = this.trackData.outerBoundary.slice(startIdx, endIdx + 1);

      console.log(`DRS Zone ${i}: ${zoneSegment.length} points`);

      if (zoneSegment.length < 2) {
        console.warn(`DRS zone ${i} has too few points`);
        continue;
      }

      // Draw as a thicker green line on top of the track
      this.ctx.strokeStyle = drsColor;
      this.ctx.lineWidth = 8;
      this.ctx.setLineDash([]);

      this.ctx.beginPath();

      const firstPoint = this.worldToScreen(zoneSegment[0]);
      this.ctx.moveTo(firstPoint.x, firstPoint.y);

      for (let j = 1; j < zoneSegment.length; j++) {
        const screenPoint = this.worldToScreen(zoneSegment[j]);
        this.ctx.lineTo(screenPoint.x, screenPoint.y);
      }

      this.ctx.stroke();
      console.log(`✅ Drew DRS zone ${i}`);
    }
  }

  private drawPath(
    points: Point[],
    color: string,
    lineWidth: number,
    dashed: boolean = false
  ) {
    if (points.length < 2) return;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;

    if (dashed) {
      this.ctx.setLineDash([5, 5]);
    } else {
      this.ctx.setLineDash([]);
    }

    this.ctx.beginPath();

    const firstPoint = this.worldToScreen(points[0]);
    this.ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let i = 1; i < points.length; i++) {
      const screenPoint = this.worldToScreen(points[i]);
      this.ctx.lineTo(screenPoint.x, screenPoint.y);
    }

    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawFinishLine() {
    if (!this.trackData || this.trackData.innerBoundary.length === 0) return;

    const innerStart = this.worldToScreen(this.trackData.innerBoundary[0]);
    const outerStart = this.worldToScreen(this.trackData.outerBoundary[0]);

    // Extend the line slightly beyond track boundaries for visibility
    const dx = outerStart.x - innerStart.x;
    const dy = outerStart.y - innerStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return;

    // Extend 20 pixels on each side
    const extension = 20;
    const extendX = (dx / length) * extension;
    const extendY = (dy / length) * extension;

    const extendedInner = {
      x: innerStart.x - extendX,
      y: innerStart.y - extendY,
    };

    const extendedOuter = {
      x: outerStart.x + extendX,
      y: outerStart.y + extendY,
    };

    // Draw checkered pattern
    const numSquares = 20;
    const stepX = (extendedOuter.x - extendedInner.x) / numSquares;
    const stepY = (extendedOuter.y - extendedInner.y) / numSquares;

    for (let i = 0; i < numSquares; i++) {
      const x1 = extendedInner.x + stepX * i;
      const y1 = extendedInner.y + stepY * i;
      const x2 = extendedInner.x + stepX * (i + 1);
      const y2 = extendedInner.y + stepY * (i + 1);

      // Alternate between white and black
      this.ctx.strokeStyle = i % 2 === 0 ? '#FFFFFF' : '#000000';
      this.ctx.lineWidth = 6;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.calculateScaling();
    this.render();
  }
}
