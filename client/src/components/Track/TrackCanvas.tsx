import React, { useEffect, useRef, useState } from 'react';
import { TrackRenderer } from '../../utils/trackRenderer';
import type { TrackData } from '../../types/track.types';
import './TrackCanvas.css';

interface TrackCanvasProps {
  trackData?: TrackData;
}

const TrackCanvas: React.FC<TrackCanvasProps> = ({ trackData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<TrackRenderer | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new TrackRenderer(canvas);
    rendererRef.current = renderer;

    // Set initial size
    handleResize();
    setIsReady(true);

    // Handle window resize
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update track data when it changes
  useEffect(() => {
    if (!rendererRef.current || !trackData || !isReady) return;

    rendererRef.current.setTrackData(trackData);
    rendererRef.current.render();
  }, [trackData, isReady]);

  const handleResize = () => {
    if (!canvasRef.current || !containerRef.current || !rendererRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    rendererRef.current.resize(width, height);
  };

  return (
    <div ref={containerRef} className="track-canvas-container">
      <canvas ref={canvasRef} className="track-canvas" />
      {!trackData && (
        <div className="track-canvas-placeholder">
          <p>Loading track data...</p>
        </div>
      )}
    </div>
  );
};

export default TrackCanvas;
