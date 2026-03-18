import { useEffect, useRef, useCallback } from 'react';
import type { TrackData, Point } from '../../../types/track.types';
import type { Frame } from '../../../types/api.types';
import './index.css';

interface AnimatedTrackCanvasProps {
  trackData?: TrackData | null;
  frames?: Frame[];
  driverColors?: Record<string, [number, number, number]>;
  currentFrame: number;
  interpolatedFrame?: Frame | null;
  leaderCode?: string | null;
}

export default function AnimatedTrackCanvas({
  trackData, frames, driverColors, currentFrame, interpolatedFrame, leaderCode
}: AnimatedTrackCanvasProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scaleRef        = useRef<number>(1);
  const offsetXRef      = useRef<number>(0);
  const offsetYRef      = useRef<number>(0);
  const dprRef          = useRef<number>(1);
  const optimalAngleRef = useRef<number>(0);
  const centroidRef     = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const calculateScaling = useCallback(() => {
    if (!trackData || !canvasRef.current) return;

    const canvas  = canvasRef.current;
    const padding = 40;
    const availableWidth  = canvas.width  / dprRef.current - 2 * padding;
    const availableHeight = canvas.height / dprRef.current - 2 * padding;

    const points = [...trackData.outerBoundary, ...trackData.innerBoundary];
    if (points.length === 0) return;

    const { bounds } = trackData;
    const cx = (bounds.maxX + bounds.minX) / 2;
    const cy = (bounds.maxY + bounds.minY) / 2;
    centroidRef.current = { x: cx, y: cy };

    // Try every degree 0–179 and pick the rotation that maximises scale
    let bestScale = 0;
    let bestAngle = 0;

    for (let deg = 0; deg < 180; deg++) {
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      let minRX = Infinity, maxRX = -Infinity;
      let minRY = Infinity, maxRY = -Infinity;

      for (const p of points) {
        const dx = p.x - cx, dy = p.y - cy;
        const rx =  cos * dx - sin * dy;
        const ry =  sin * dx + cos * dy;
        if (rx < minRX) minRX = rx; if (rx > maxRX) maxRX = rx;
        if (ry < minRY) minRY = ry; if (ry > maxRY) maxRY = ry;
      }

      const scale = Math.min(
        availableWidth  / (maxRY - minRY),
        availableHeight / (maxRX - minRX),
      );

      if (scale > bestScale) { bestScale = scale; bestAngle = rad; }
    }

    optimalAngleRef.current = bestAngle;
    scaleRef.current = bestScale;

    // Recompute bounds at best angle for centred offsets
    const cos = Math.cos(bestAngle);
    const sin = Math.sin(bestAngle);
    let minRX = Infinity, maxRX = -Infinity;
    let minRY = Infinity, maxRY = -Infinity;

    for (const p of points) {
      const dx = p.x - cx, dy = p.y - cy;
      const rx =  cos * dx - sin * dy;
      const ry =  sin * dx + cos * dy;
      if (rx < minRX) minRX = rx; if (rx > maxRX) maxRX = rx;
      if (ry < minRY) minRY = ry; if (ry > maxRY) maxRY = ry;
    }

    const cssWidth  = canvas.width  / dprRef.current;
    const cssHeight = canvas.height / dprRef.current;
    offsetXRef.current = cssWidth  / 2 + (maxRY + minRY) / 2 * bestScale;
    offsetYRef.current = cssHeight / 2 + (maxRX + minRX) / 2 * bestScale;
  }, [trackData]);

  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const container = containerRef.current;
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      canvasRef.current.width  = container.clientWidth  * dpr;
      canvasRef.current.height = container.clientHeight * dpr;
      const ctx = canvasRef.current.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      calculateScaling();
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateScaling]);

  useEffect(() => { calculateScaling(); }, [calculateScaling]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !trackData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const worldToScreen = (point: Point): Point => {
      const { x: cx, y: cy } = centroidRef.current;
      const cos = Math.cos(optimalAngleRef.current);
      const sin = Math.sin(optimalAngleRef.current);
      const dx = point.x - cx, dy = point.y - cy;
      const rx = cos * dx - sin * dy;
      const ry = sin * dx + cos * dy;
      return {
        x: -ry * scaleRef.current + offsetXRef.current,
        y: -rx * scaleRef.current + offsetYRef.current,
      };
    };

    const drawPath = (points: Point[], color: string, lineWidth: number) => {
      if (points.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      const first = worldToScreen(points[0]);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i++) {
        const p = worldToScreen(points[i]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    };

    const drawStar = (cx: number, cy: number, outerR: number, innerR: number) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = '#FFD700';
      ctx.fill();
    };

    // ── Clear + track ────────────────────────────────────────────────────────
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width / dprRef.current, canvas.height / dprRef.current);

    drawPath(trackData.outerBoundary, '#666666', 3);
    drawPath(trackData.innerBoundary, '#666666', 3);

    if (trackData.drsZones) {
      for (const zone of trackData.drsZones) {
        const segment = trackData.outerBoundary.slice(zone.startIndex, zone.endIndex + 1);
        if (segment.length > 1) drawPath(segment, '#00FF00', 6);
      }
    }

    // ── Finish line ──────────────────────────────────────────────────────────
    if (trackData.innerBoundary.length > 0 && trackData.outerBoundary.length > 0) {
      const innerStart = worldToScreen(trackData.innerBoundary[0]);
      const outerStart = worldToScreen(trackData.outerBoundary[0]);
      const dx = outerStart.x - innerStart.x;
      const dy = outerStart.y - innerStart.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const ex = (dx / len) * 16, ey = (dy / len) * 16;
        const ei = { x: innerStart.x - ex, y: innerStart.y - ey };
        const eo = { x: outerStart.x + ex, y: outerStart.y + ey };
        for (let i = 0; i < 20; i++) {
          const t1 = i / 20, t2 = (i + 1) / 20;
          ctx.strokeStyle = i % 2 === 0 ? '#FFFFFF' : '#000000';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(ei.x + t1 * (eo.x - ei.x), ei.y + t1 * (eo.y - ei.y));
          ctx.lineTo(ei.x + t2 * (eo.x - ei.x), ei.y + t2 * (eo.y - ei.y));
          ctx.stroke();
        }
      }
    }

    // ── Drivers ──────────────────────────────────────────────────────────────
    const frameToRender = interpolatedFrame || (frames && frames[currentFrame]);
    if (!frameToRender) return;

    // Find current leader: sourced from RaceViewer so it matches the leaderboard exactly

    for (const [code, pos] of Object.entries(frameToRender.drivers)) {
      const screenPos  = worldToScreen({ x: pos.x, y: pos.y });
      const isOut      = pos.is_out === true;
      const color      = driverColors?.[code] || [255, 255, 255];
      const dotColor   = isOut ? 'rgba(255,255,255,0.5)' : `rgb(${color[0]},${color[1]},${color[2]})`;
      const labelColor = isOut ? 'rgba(255,255,255,0.5)' : '#FFFFFF';

      // Dot
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = labelColor;
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(code, screenPos.x, screenPos.y - 10);
    }

    // Draw leader star last so it's always on top of every other driver
    if (leaderCode && frameToRender.drivers[leaderCode]) {
      const leaderPos = worldToScreen({
        x: frameToRender.drivers[leaderCode].x,
        y: frameToRender.drivers[leaderCode].y,
      });
      drawStar(leaderPos.x, leaderPos.y - 22, 5, 2.5);
    }
  }, [trackData, frames, currentFrame, driverColors, interpolatedFrame]);

  return (
    <div ref={containerRef} className="animated-track-canvas-container">
      <canvas ref={canvasRef} className="animated-track-canvas" />
      {!trackData && (
        <div className="track-loading-placeholder">
          <p>Loading track data...</p>
        </div>
      )}
    </div>
  );
}
