import { useState, useRef, useEffect } from 'react';
import type { Frame, DriverPosition } from '../../../types/api.types';
import { getTeamLogo } from '../../../utils/teamLogos';
import { teamLogoUrl } from '../../../lib/assets';
import F1Header from './F1Header';
import '../../../styles/variables.css';
import './index.css';

interface LeaderboardProps {
  currentFrame: Frame | null;
  driverColors: Record<string, [number, number, number]>;
  driverTeams?: Record<string, string>;
  totalLaps?: number;
  officialPositions?: Record<string, number>;
}

const TYRE_COMPOUNDS: Record<number, { letter: string; bg: string }> = {
  0: { letter: 'S', bg: '#FF0000' },
  1: { letter: 'M', bg: '#FFFF00' },
  2: { letter: 'H', bg: '#bbbbbb' },
  3: { letter: 'I', bg: '#00FF00' },
  4: { letter: 'W', bg: '#0066FF' },
};

type GapMode = 'interval' | 'leader';

interface DriverWithGap extends DriverPosition {
  code: string;
  gapToLeader: number;
  intervalGap: number;
}

export default function Leaderboard({
  currentFrame, driverColors, totalLaps, driverTeams, officialPositions = {},
}: LeaderboardProps) {
  const [gapMode, setGapMode] = useState<GapMode>('interval');

  const finishGapsRef    = useRef<Record<string, { toLeader: number; interval: number }>>({});
  const lastFrameTimeRef = useRef<number>(0);

  useEffect(() => {
    if (currentFrame && currentFrame.t < lastFrameTimeRef.current - 10) {
      finishGapsRef.current = {};
    }
    lastFrameTimeRef.current = currentFrame?.t ?? 0;
  }, [currentFrame]);

  if (!currentFrame) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const driversArray: DriverWithGap[] = Object.entries(currentFrame.drivers).map(([code, pos]) => ({
    code, ...pos, gapToLeader: 0, intervalGap: 0,
  }));

  const hasOfficialPositions = Object.keys(officialPositions).length > 0;

  driversArray.sort((a, b) => {
    // Retired drivers always go to the bottom
    if (a.is_out && !b.is_out) return 1;
    if (!a.is_out && b.is_out) return -1;
    if (a.is_out && b.is_out) return 0;

    // Finished drivers: sort by official finishing position
    if (a.finished && b.finished) {
      const posA = hasOfficialPositions ? (officialPositions[a.code] ?? a.position) : a.position;
      const posB = hasOfficialPositions ? (officialPositions[b.code] ?? b.position) : b.position;
      return posA - posB;
    }

    // Finished before still-racing: finished driver goes first
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;

    // Both active and racing: sort by dist descending (further ahead = higher up)
    return b.dist - a.dist;
  });

  const REFERENCE_SPEED_MS = 55.56;
  const leaderDist = driversArray.find(d => !d.is_out)?.dist ?? 0;

  driversArray.forEach((driver, idx) => {
    if (idx === 0) {
      driver.gapToLeader = 0;
      driver.intervalGap = 0;
    } else {
      driver.gapToLeader = Math.abs(leaderDist - driver.dist) / REFERENCE_SPEED_MS;
      driver.intervalGap = Math.abs(driversArray[idx - 1].dist - driver.dist) / REFERENCE_SPEED_MS;
    }

    if (driver.finished && !finishGapsRef.current[driver.code]) {
      finishGapsRef.current[driver.code] = {
        toLeader: driver.gapToLeader,
        interval: driver.intervalGap,
      };
    }
  });

  return (
    <div className="leaderboard">
      <F1Header />
      <div className="leaderboard-header">
        <div className="header-info-item">
          <span className="header-label">LAP</span>
          <span className="header-value-bold">{currentFrame.lap}</span>
          <span className="header-value">{totalLaps ? `/${totalLaps}` : ''}</span>
        </div>

        <div className="header-right">
          <div className="gap-toggle">
            <button
              className={`gap-toggle-btn${gapMode === 'interval' ? ' active' : ''}`}
              onClick={() => setGapMode('interval')}
            >INT</button>
            <button
              className={`gap-toggle-btn${gapMode === 'leader' ? ' active' : ''}`}
              onClick={() => setGapMode('leader')}
            >LDR</button>
          </div>
          <span className="header-time">{formatTime(currentFrame.t)}</span>
        </div>
      </div>

      <div className="leaderboard-entries">
        {driversArray.map((driver, idx) => {
          const rowPos       = idx + 1;
          const tyreCompound = TYRE_COMPOUNDS[Math.floor(driver.tyre)] || TYRE_COMPOUNDS[0];
          const teamName     = driverTeams?.[driver.code] || '';
          const logoFilename = getTeamLogo(teamName) ?? '';

          const frozenGap = finishGapsRef.current[driver.code];
          const gap = driver.finished && frozenGap
            ? (gapMode === 'interval' ? frozenGap.interval : frozenGap.toLeader)
            : (gapMode === 'interval' ? driver.intervalGap : driver.gapToLeader);

          return (
            <div key={driver.code} className={[
              'lb-entry',
              driver.is_out ? 'lb-entry--out'    : '',
              rowPos === 1  ? 'lb-entry--leader' : '',
            ].filter(Boolean).join(' ')}>
              <div className="lb-position">{driver.is_out ? '' : rowPos}</div>

              <div className="lb-driver">
                <img
                  src={teamLogoUrl(logoFilename)}
                  alt={teamName}
                  className="lb-team-logo"
                  onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                />
                <span className="lb-code">{driver.code}</span>
              </div>

              <div className="lb-gap">
                {driver.is_out ? (
                  <span className="gap-out">OUT</span>
                ) : rowPos === 1 ? (
                  <span className="gap-leader">-</span>
                ) : (
                  <span className="gap-value">+{gap.toFixed(1)}</span>
                )}
              </div>

              <div className="lb-tyre" style={{ color: driver.is_out ? 'transparent' : tyreCompound.bg }}>
                {driver.is_out ? '' : tyreCompound.letter}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
