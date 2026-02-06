import { useState, useEffect, useRef, useCallback } from 'react';
import AnimatedTrackCanvas from '../Track';
import RaceInfo from '../RaceInfo';
import PlaybackControls from '../PlaybackControls';
import type { TrackData } from '../../types/track.types';
import type { Frame } from '../../types/api.types';
import './index.css';

interface RaceViewerProps {
  trackData: TrackData;
  frames: Frame[];
  driverColors: Record<string, [number, number, number]>;
}

export default function RaceViewer({ trackData, frames, driverColors }: RaceViewerProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Playback control handlers
  const handlePlayPause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, []);

  const handleSeek = useCallback((frame: number) => {
    setCurrentFrame(Math.max(0, Math.min(frame, frames.length - 1)));
  }, [frames]);

  const handleRestart = useCallback(() => {
    setCurrentFrame(0);
    setIsPaused(true);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeek(currentFrame - 25);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeek(currentFrame + 25);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleSpeedChange(Math.min(16, playbackSpeed * 2));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleSpeedChange(Math.max(0.25, playbackSpeed / 2));
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          handleRestart();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentFrame, playbackSpeed, handlePlayPause, handleSeek, handleRestart, handleSpeedChange]);

  // Animation loop
  const animationRef = useRef<number | undefined>(undefined);
  
  useEffect(() => {
    if (frames.length === 0) return;

    let lastTime = performance.now();
    const fps = 25;
    const frameTime = 1000 / fps;

    const animate = (currentTime: number) => {
      if (!isPaused) {
        const deltaTime = currentTime - lastTime;
        const adjustedFrameTime = frameTime / playbackSpeed;

        if (deltaTime >= adjustedFrameTime) {
          setCurrentFrame(prev => {
            const next = prev + 1;
            return next >= frames.length ? prev : next;
          });
          lastTime = currentTime;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [frames, isPaused, playbackSpeed]);

  const currentFrameData = frames[currentFrame] || null;

  return (
    <div className="race-viewer">
      {/* Left: Canvas + Controls */}
      <div className="race-canvas-column">
        <div className="canvas-wrapper">
          <AnimatedTrackCanvas
            trackData={trackData}
            frames={frames}
            driverColors={driverColors}
            currentFrame={currentFrame}
          />
        </div>
        
        <div className="playback-controls-area">
          <PlaybackControls
            isPaused={isPaused}
            playbackSpeed={playbackSpeed}
            currentFrame={currentFrame}
            totalFrames={frames.length}
            onPlayPause={handlePlayPause}
            onSpeedChange={handleSpeedChange}
            onSeek={handleSeek}
            onRestart={handleRestart}
          />
        </div>
      </div>

      {/* Right: Sidebar */}
      <aside className="race-sidebar">
        <RaceInfo
          currentFrame={currentFrameData}
          frameIndex={currentFrame}
          totalFrames={frames.length}
        />
      </aside>
    </div>
  );
}
