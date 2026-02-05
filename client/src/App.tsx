import { useState, useEffect } from 'react';
import TrackCanvas from './components/Track/TrackCanvas';
import { telemetryService } from './services/telemetryService';
import { buildTrackFromFrames } from './utils/trackDataConverter';
import type { TrackData } from './types/track.types';
import './App.css';

function App() {
  const [trackData, setTrackData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<string>('');

  const [year] = useState<number>(2024);
  const [round] = useState<number>(1);

  useEffect(() => {
    loadTrackData();
  }, [year, round]);

  const loadTrackData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('API Base URL:', import.meta.env.VITE_API_URL);
      console.log(`Loading track data for ${year} Round ${round}...`);
      
      // Use the lightweight track endpoint
      const data = await telemetryService.getTrackData(year, round, 'R');

      console.log('Track data loaded:', data);
      console.log(`Received ${data.frames.length} frames`);
      
      // Build track from frames
      const track = buildTrackFromFrames(data.frames);
      
      if (!track) {
        throw new Error('Failed to build track from frames');
      }

      setTrackData(track);
      setSessionInfo(
        `${data.session_info.event_name} - ${data.session_info.circuit_name} (${data.session_info.country})`
      );
      
      console.log('✅ Track rendered successfully!');
    } catch (err: any) {
      console.error('Full error object:', err);
      console.error('Error message:', err.message);
      console.error('Error response:', err.response);
      setError(err.response?.data?.detail || err.message || 'Failed to load track data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏎️ F1 Race Replay</h1>
        <div className="session-info">
          {loading && <p>Loading track data...</p>}
          {error && <p className="error">Error: {error}</p>}
          {sessionInfo && !loading && <p>{sessionInfo}</p>}
        </div>
      </header>

      <main className="app-main">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading {year} Round {round} track...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <h2>❌ Failed to Load Track</h2>
            <p>{error}</p>
            <button onClick={loadTrackData}>Retry</button>
          </div>
        ) : (
          <TrackCanvas trackData={trackData || undefined} />
        )}
      </main>

      <footer className="app-footer">
        <p>
          Displaying: {year} Round {round} | {trackData ? '✓ Track Loaded' : 'No Track'}
        </p>
      </footer>
    </div>
  );
}

export default App;
