import { useState } from 'react';
import './index.css';

interface PlaybackControlsProps {
  isPaused: boolean;
  playbackSpeed: number;
  currentFrame: number;
  totalFrames: number;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (frame: number) => void;
  onRestart: () => void;
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 16];

export default function PlaybackControls({
  isPaused,
  playbackSpeed,
  currentFrame,
  totalFrames,
  onPlayPause,
  onSpeedChange,
  onSeek,
  onRestart,
}: PlaybackControlsProps) {
  const handleSpeedIncrease = () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    if (currentIndex < PLAYBACK_SPEEDS.length - 1) {
      onSpeedChange(PLAYBACK_SPEEDS[currentIndex + 1]);
    }
  };

  const handleSpeedDecrease = () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    if (currentIndex > 0) {
      onSpeedChange(PLAYBACK_SPEEDS[currentIndex - 1]);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const targetFrame = Math.floor(percent * totalFrames);
    onSeek(targetFrame);
  };

  const handleRewind = () => {
    onSeek(Math.max(0, currentFrame - 250));
  };

  const handleForward = () => {
    onSeek(Math.min(totalFrames - 1, currentFrame + 250));
  };

  const progress = totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0;

  return (
    <div className="playback-controls">
      {/* Progress Bar */}
      <div className="progress-container" onClick={handleProgressClick}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <div className="progress-handle" style={{ left: `${progress}%` }} />
        </div>
      </div>

      {/* Control Buttons Container */}
      <div className="controls-container">
        {/* Left: Playback Controls */}
        <div className="controls-section controls-left">
          <button className="control-btn" onClick={onRestart} title="Restart (R)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            </svg>
          </button>

          <button className="control-btn" onClick={handleRewind} title="Rewind (←)">
            <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
            </svg>
          </button>

          <button className="control-btn control-btn-primary" onClick={onPlayPause} title="Play/Pause (Space)">
            {isPaused ? (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            ) : (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            )}
          </button>

          <button className="control-btn" onClick={handleForward} title="Forward (→)">
            <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="controls-divider" />

        {/* Right: Speed Controls */}
        <div className="controls-section controls-right">
          <div className="speed-display">
            <button 
              className="speed-btn" 
              onClick={handleSpeedDecrease}
              disabled={playbackSpeed === PLAYBACK_SPEEDS[0]}
              title="Decrease Speed (↓)"
            >
              −
            </button>
            <span className="speed-value">{playbackSpeed}x</span>
            <button 
              className="speed-btn" 
              onClick={handleSpeedIncrease}
              disabled={playbackSpeed === PLAYBACK_SPEEDS[PLAYBACK_SPEEDS.length - 1]}
              title="Increase Speed (↑)"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
