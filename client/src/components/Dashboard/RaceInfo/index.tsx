import type { Frame } from '../../types/api.types';
import './index.css';

interface RaceInfoProps {
  currentFrame: Frame | null;
  frameIndex: number;
  totalFrames: number;
}

export default function RaceInfo({ currentFrame, frameIndex, totalFrames }: RaceInfoProps) {
  if (!currentFrame) return null;

  return (
    <div className="race-info">
      <div className="race-info-item">
        <span className="race-info-label">Lap:</span>
        <span className="race-info-value">{currentFrame.lap}</span>
      </div>
      <div className="race-info-item">
        <span className="race-info-label">Time:</span>
        <span className="race-info-value">{currentFrame.t.toFixed(1)}s</span>
      </div>
      <div className="race-info-item">
        <span className="race-info-label">Frame:</span>
        <span className="race-info-value">{frameIndex + 1}/{totalFrames}</span>
      </div>
    </div>
  );
}
