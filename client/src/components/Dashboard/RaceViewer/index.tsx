import { useState, useCallback } from 'react';
import AnimatedTrackCanvas from '../Track';
import PlaybackControls from '../PlaybackControls';
import Navbar from '../Navbar';
import RaceEventPopup from '../RaceEventPopup';
import DriverSummaryPanel from '../DriverSummaryPanel';
import Leaderboard from '../Leaderboard';
import SessionBanner from '../SessionBanner';
import { useRacePlayback } from '../../../hooks/useRacePlayback';
import { useComparisonMode } from '../../../hooks/useComparisonMode';
import { useTrackStatus } from '../../../hooks/useTrackStatus';
import type { TrackData } from '../../../types/track-api.types';
import type { Frame, TrackStatus } from '../../../types/api.types';
import './index.css';

/**
 * Props for the RaceViewer component.
 *
 * @property {TrackData} trackData - Static track geometry used to render the circuit map.
 * @property {Frame[]} frames - Ordered array of telemetry frames for the full race replay.
 * @property {Record<string, [number, number, number]>} driverColors - Map of driver code to RGB color tuple.
 * @property {Record<string, string>} driverTeams - Map of driver code to team name.
 * @property {Record<string, number>} [officialPositions] - Optional override map of driver code to official finishing position.
 * @property {TrackStatus[]} [trackStatuses] - Array of track status intervals (flags, safety cars) for the session.
 * @property {string} [eventName] - Display name of the race event (e.g. "Monaco Grand Prix").
 * @property {string} [circuitName] - Name of the circuit, used by the DriverSummaryPanel for historical lookups.
 * @property {string} [country] - Country of the event, shown in the SessionBanner.
 * @property {number} [year] - Season year; hidden from the SessionBanner while comparison mode is active.
 * @property {number} [totalLaps] - Total scheduled laps, passed to the leaderboard and playback controls.
 * @property {{ x: number; y: number }[]} [prevTrackFrames] - World-space XY reference-lap points for
 *   the previous race circuit, forwarded to PlaybackControls to render a mini track map in the
 *   prev-race button. Sliced from `TrackDataResponse.frames` by the caller.
 * @property {{ x: number; y: number }[]} [nextTrackFrames] - World-space XY reference-lap points for
 *   the next race circuit, forwarded to PlaybackControls for the next-race button mini map.
 * @property {() => void} onHome - Callback to navigate back to the race selection screen.
 * @property {() => void} [onPrevRace] - Optional callback to load the previous race session.
 * @property {() => void} [onNextRace] - Optional callback to load the next race session.
 * @property {boolean} [hasPrevRace] - Whether a previous race is available for navigation.
 * @property {boolean} [hasNextRace] - Whether a next race is available for navigation.
 */
interface RaceViewerProps {
  trackData: TrackData;
  frames: Frame[];
  driverColors: Record<string, [number, number, number]>;
  driverTeams: Record<string, string>;
  officialPositions?: Record<string, number>;
  trackStatuses?: TrackStatus[];
  eventName?: string;
  circuitName?: string;
  country?: string;
  year?: number;
  totalLaps?: number;
  prevTrackFrames?: { x: number; y: number }[];
  nextTrackFrames?: { x: number; y: number }[];
  onHome: () => void;
  onPrevRace?: () => void;
  onNextRace?: () => void;
  hasPrevRace?: boolean;
  hasNextRace?: boolean;
}

/**
 * Determines the driver code of the current race leader from a telemetry frame.
 * Prioritises official finishing positions when available, falling back to the
 * frame's own position data. Retired drivers (`is_out`) are excluded from consideration.
 *
 * Finished drivers are always sorted ahead of still-racing drivers to correctly
 * reflect the leaderboard once the chequered flag has fallen.
 *
 * @param {Frame | null} frame - The current display frame; returns null immediately when absent.
 * @param {Record<string, number>} officialPositions - Map of driver code to official position.
 * @returns {string | null} The driver code of the leader, or null if it cannot be determined.
 */
function deriveLeaderCode(
  frame: Frame | null,
  officialPositions: Record<string, number>,
): string | null {
  if (!frame) return null;
  const hasOfficial = Object.keys(officialPositions).length > 0;
  const sorted = Object.entries(frame.drivers)
    .filter(([, d]) => !d.is_out)
    .sort(([codeA, a], [codeB, b]) => {
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      const posA = hasOfficial ? (officialPositions[codeA] ?? a.position) : a.position;
      const posB = hasOfficial ? (officialPositions[codeB] ?? b.position) : b.position;
      return posA - posB;
    });
  return sorted[0]?.[0] ?? null;
}

/**
 * RaceViewer is the top-level race replay screen. It composes all major UI regions:
 * - **Navbar** — home button, Driver Summary toggle, and About modal.
 * - **Sidebar** — switches between the live Leaderboard and the DriverSummaryPanel.
 * - **Canvas column** — SessionBanner, animated track canvas, RaceEventPopup overlay,
 *   and the PlaybackControls bar (which shows mini circuit maps for adjacent races).
 */
export default function RaceViewer({
  trackData, frames, driverColors, driverTeams,
  officialPositions = {},
  trackStatuses = [],
  eventName, circuitName, country, year, totalLaps,
  prevTrackFrames, nextTrackFrames,
  onHome,
  onPrevRace, onNextRace, hasPrevRace = false, hasNextRace = false,
}: RaceViewerProps) {
  const [focusedDrivers, setFocusedDrivers] = useState<Set<string>>(new Set());

  const {
    currentFrameIndex, interpolatedFrame,
    isPaused, playbackSpeed,
    lapFrameIndices, displayFrame, totalTime,
    handlePlayPause, handleSpeedChange,
    handleSeek, handleSeekToLap, handleRestart: baseHandleRestart,
  } = useRacePlayback(frames, totalLaps);

  const {
    isComparisonMode, comparisonDriver, comparisonPositions,
    setComparisonDriver, toggleComparisonMode, closeComparison,
  } = useComparisonMode(circuitName, currentFrameIndex);

  const { activeEvent, activeStatus, resetStatus } = useTrackStatus(
    displayFrame,
    trackStatuses,
  );

  const handleRestart = useCallback(() => {
    baseHandleRestart();
    resetStatus();
  }, [baseHandleRestart, resetStatus]);

  /**
   * Toggles a driver's presence in the focused set.
   * Adding a driver focuses them; clicking again removes the focus.
   */
  const handleToggleDriver = useCallback((code: string) => {
    setFocusedDrivers(prev => {
      const next = new Set(prev);
      if (next.has(code)) { next.delete(code); } else { next.add(code); }
      return next;
    });
  }, []);

  const leaderCode = deriveLeaderCode(displayFrame, officialPositions);

  return (
    <div className="race-viewer">
      <Navbar
        onHome={onHome}
        onToggleComparison={toggleComparisonMode}
        isComparisonMode={isComparisonMode}
      />

      <aside className="race-sidebar">
        {isComparisonMode ? (
          <DriverSummaryPanel
            circuitName={circuitName ?? ''}
            driverCodes={Object.keys(driverColors)}
            driverColors={driverColors}
            driverTeams={driverTeams}
            selectedDriver={comparisonDriver}
            onDriverSelect={setComparisonDriver}
            onClose={closeComparison}
          />
        ) : (
          <Leaderboard
            currentFrame={displayFrame} driverColors={driverColors}
            totalLaps={totalLaps} driverTeams={driverTeams}
            officialPositions={officialPositions}
            focusedDrivers={focusedDrivers}
            onToggleDriver={handleToggleDriver}
          />
        )}
      </aside>

      <div className="race-canvas-column">
        <SessionBanner
          eventName={eventName} circuitName={circuitName}
          country={country} year={isComparisonMode ? undefined : year}
          weather={isComparisonMode ? null : displayFrame?.weather}
        />
        <div
          className="canvas-wrapper"
          style={{ borderColor: !isComparisonMode && activeStatus !== '1' ? (activeEvent?.color ?? '') : '' }}
        >
          <AnimatedTrackCanvas
            trackData={trackData} frames={frames} driverColors={driverColors}
            currentFrame={currentFrameIndex} interpolatedFrame={interpolatedFrame}
            leaderCode={leaderCode} focusedDrivers={focusedDrivers}
            comparisonMode={isComparisonMode}
            comparisonPositions={comparisonPositions}
            comparisonDriverColor={comparisonDriver ? driverColors[comparisonDriver] : undefined}
          />
          <RaceEventPopup event={activeEvent} isActive={!isComparisonMode && activeStatus !== '1'} />
        </div>
        <div className="playback-controls-area">
          <PlaybackControls
            isPaused={isPaused} playbackSpeed={playbackSpeed}
            currentFrame={currentFrameIndex} totalFrames={frames.length}
            totalLaps={totalLaps} lapFrameIndices={lapFrameIndices}
            trackStatuses={isComparisonMode ? [] : trackStatuses} totalTime={totalTime}
            prevTrackFrames={prevTrackFrames}
            nextTrackFrames={nextTrackFrames}
            onPlayPause={handlePlayPause} onSpeedChange={handleSpeedChange}
            onSeek={handleSeek} onSeekToLap={handleSeekToLap}
            onRestart={handleRestart}
            onPrevRace={onPrevRace} onNextRace={onNextRace}
            hasPrevRace={hasPrevRace} hasNextRace={hasNextRace}
          />
        </div>
      </div>
    </div>
  );
}
