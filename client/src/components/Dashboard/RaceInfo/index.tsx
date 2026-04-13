import type { Frame } from "../../../types/api.types";
import './index.css';

/**
 * Props for the RaceInfo component.
 *
 * @property {Frame | null} currentFrame - The frame currently being displayed; renders nothing when null.
 * @property {number} frameIndex - Zero-based index of the current frame in the frames array.
 * @property {number} totalFrames - Total number of frames in the replay session.
 */
interface RaceInfoProps {
  currentFrame: Frame | null;
  frameIndex: number;
  totalFrames: number;
}

/**
 * RaceInfo is a compact debug/info strip that surfaces three real-time values
 * from the current replay frame: the lap number, elapsed race time in seconds,
 * and the current frame position out of total frames.
 *
 * Renders nothing when `currentFrame` is null (i.e. before data has loaded).
 *
 * @param {RaceInfoProps} props - Component props.
 * @returns {JSX.Element | null} The rendered info strip, or null if no frame is available.
 */
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
