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

    // Draw center line (optional, for reference)
    // this.drawPath(this.trackData.centerLine, '#444444', 2, true);

    // Draw finish line
    this.drawFinishLine();
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

    // Draw checkered pattern
    const numSquares = 20;
    const dx = (outerStart.x - innerStart.x) / numSquares;
    const dy = (outerStart.y - innerStart.y) / numSquares;

    for (let i = 0; i < numSquares; i++) {
      const x1 = innerStart.x + dx * i;
      const y1 = innerStart.y + dy * i;
      const x2 = innerStart.x + dx * (i + 1);
      const y2 = innerStart.y + dy * (i + 1);

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
