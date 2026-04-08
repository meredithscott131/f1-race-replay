import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRaceLoader } from '../hooks/useRaceLoader';
import RaceViewer from '../components/Dashboard/RaceViewer';

export default function DashboardPage() {
  const { year: yearStr, round: roundStr } = useParams<{ year: string; round: string }>();
  const navigate = useNavigate();

  const year  = Number(yearStr);
  const round = Number(roundStr);

  const {
    eventName, circuitName, country, totalLaps,
    trackData, frames, driverColors, driverTeams, officialPositions, trackStatuses,
    loading, error,
    hasPrevRace, hasNextRace,
    prevRace, nextRace,
    selectRace, loadRaceData, reset,
  } = useRaceLoader();

  useEffect(() => {
    if (year && round) selectRace(year, round);
    // selectRace is recreated each render but is stable in behaviour;
    // we only want this to fire when the URL params change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, round]);

  const handleGoHome = () => {
    reset();
    navigate('/');
  };

  const handlePrevRace = () => {
    if (prevRace) navigate(`/race/${prevRace.year}/${prevRace.round}`);
  };

  const handleNextRace = () => {
    if (nextRace) navigate(`/race/${nextRace.year}/${nextRace.round}`);
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
        <p>Loading {year} Round {round}…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <h2>❌ Failed</h2>
        <p>{error}</p>
        <button onClick={() => loadRaceData(year, round)}>Retry</button>
        <button
          onClick={handleGoHome}
          style={{ marginTop: 8, background: 'transparent', border: '1px solid #aaa', color: '#aaa' }}
        >
          ← Back to schedule
        </button>
      </div>
    );
  }

  if (!trackData || frames.length === 0) return null;

  return (
    <RaceViewer
      trackData={trackData}
      frames={frames}
      driverColors={driverColors}
      driverTeams={driverTeams}
      eventName={eventName}
      circuitName={circuitName}
      country={country}
      year={year}
      totalLaps={totalLaps}
      officialPositions={officialPositions}
      trackStatuses={trackStatuses}
      hasPrevRace={hasPrevRace}
      hasNextRace={hasNextRace}
      onHome={handleGoHome}
      onPrevRace={handlePrevRace}
      onNextRace={handleNextRace}
    />
  );
}
