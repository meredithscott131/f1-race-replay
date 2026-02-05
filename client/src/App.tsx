import { useState, useEffect, useRef } from 'react';
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
  const [loadingTime, setLoadingTime] = useState<number>(0);  // Add this

  const [year] = useState<number>(2024);
  const [round] = useState<number>(1);
  
  const loadingIntervalRef = useRef<number | null>(null);  // Add this

  useEffect(() => {
    loadTrackData();
  }, [year, round]);

  // Cleanup interval on unmount - Add this
  useEffect(() => {
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    };
  }, []);

  const loadTrackData = async () => {
    setLoading(true);
    setError(null);
    setLoadingTime(0);
    
    // Start timer
    const startTime = Date.now();
    loadingIntervalRef.current = window.setInterval(() => {
      setLoadingTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    try {
      console.log(`Loading track data for ${year} Round ${round}...`);
      
      const data = await telemetryService.getTrackData(year, round, 'R');

      console.log('Track data loaded:', data);
      console.log(`Received ${data.frames.length} frames`);
      console.log(`DRS zones: ${data.drs_zones?.length || 0}`);
      
      // Build track from frames with DRS zones
      const track = buildTrackFromFrames(data.frames, data.drs_zones);
      
      if (!track) {
        throw new Error('Failed to build track from frames');
      }

      setTrackData(track);
      setSessionInfo(
        `${data.session_info.event_name} - ${data.session_info.circuit_name} (${data.session_info.country})`
      );
      
      console.log('✅ Track rendered successfully!');
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load track data');
    } finally {
      setLoading(false);
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏎️ F1 Track Renderer</h1>
        <div className="session-info">
          {loading && (
            <p>
              Loading track data... ({loadingTime}s elapsed)
              {loadingTime > 60 && <span> - This may take 2-3 minutes on first load...</span>}
            </p>
          )}
          {error && <p className="error">Error: {error}</p>}
          {sessionInfo && !loading && <p>{sessionInfo}</p>}
        </div>
      </header>

      <main className="app-main">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading {year} Round {round} track...</p>
            <p className="loading-time">{loadingTime} seconds elapsed</p>
            <p className="loading-note">
              {loadingTime < 30 
                ? "Processing telemetry data..."
                : loadingTime < 120
                ? "Still processing... This can take 2-3 minutes on first load"
                : "Almost done! Saving cache for faster future loads..."}
            </p>
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
          {trackData?.drsZones && trackData.drsZones.length > 0 && 
            ` | ${trackData.drsZones.length} DRS Zone${trackData.drsZones.length > 1 ? 's' : ''}`
          }
        </p>
      </footer>
    </div>
  );
}

export default App;
