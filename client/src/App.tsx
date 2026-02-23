import { useState, useEffect, useRef } from 'react';
import Navbar from './components/Dashboard/Navbar';
import RaceViewer from './components/Dashboard/RaceViewer';
import { telemetryService } from './services/telemetryService';
import { buildTrackFromFrames } from './utils/trackDataConverter';
import type { TrackData } from './types/track.types';
import type { Frame } from './types/api.types';
import './styles/variables.css';
import './App.css';

function App() {
  const [trackData, setTrackData] = useState<TrackData | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [driverColors, setDriverColors] = useState<Record<string, [number, number, number]>>({});
  const [driverTeams, setDriverTeams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<string>('');
  const [loadingTime, setLoadingTime] = useState<number>(0);
  
  // Event info
  const [eventName, setEventName] = useState<string>('');
  const [circuitName, setCircuitName] = useState<string>('');
  const [country, setCountry] = useState<string>('');

  const [year] = useState<number>(2024);
  const [round] = useState<number>(1);
  
  const loadingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    loadRaceData();
  }, []);

  useEffect(() => {
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    };
  }, []);

  const loadRaceData = async () => {
    setLoading(true);
    setError(null);
    setLoadingTime(0);
    
    const startTime = Date.now();
    loadingIntervalRef.current = window.setInterval(() => {
      setLoadingTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    try {
      console.log(`Loading race data for ${year} Round ${round}...`);
      
      const trackResponse = await telemetryService.getTrackData(year, round, 'R');
      console.log('Track data loaded');
      
      const track = buildTrackFromFrames(trackResponse.frames, trackResponse.drs_zones);
      
      if (!track) {
        throw new Error('Failed to build track');
      }

      setTrackData(track);
      setEventName(trackResponse.session_info.event_name);
      setCircuitName(trackResponse.session_info.circuit_name);
      setCountry(trackResponse.session_info.country);
      setSessionInfo(
        `${trackResponse.session_info.event_name} - ${trackResponse.session_info.circuit_name}`
      );
      
      console.log('Loading frames...');
      const framesResponse = await telemetryService.getRaceFrames(year, round, 'R', 5000);
      console.log(`Loaded ${framesResponse.frames.length} frames`);
      
      setFrames(framesResponse.frames);
      setDriverColors(framesResponse.driver_colors);
      setDriverTeams(framesResponse.driver_teams || {});
      
      console.log('✅ Complete!');
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load');
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
      <main className="app-main">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading {year} Round {round}...</p>
            <p className="loading-time">{loadingTime}s</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <h2>❌ Failed</h2>
            <p>{error}</p>
            <button onClick={loadRaceData}>Retry</button>
          </div>
        ) : trackData && frames.length > 0 ? (
          <>
            <Navbar />
            <RaceViewer
                trackData={trackData}
                frames={frames}
                driverColors={driverColors}
                driverTeams={driverTeams}
                eventName={eventName}
                circuitName={circuitName}
                country={country} /></>
        ) : null}
      </main>
    </div>
  );
}

export default App;
