import { supabase } from '../lib/supabase';
import type { RaceWeekend } from '../types/race.types';
import type { Frame, RaceFramesResponse } from '../types/api.types';
import type { TrackDataResponse } from '../types/track.types';

/**
 * Parses a value that may arrive from Supabase as either a JSON string or a
 * pre-parsed object. Supabase occasionally returns JSONB columns as raw strings
 * depending on the client version and column type.
 *
 * @param {unknown} val - The value to parse.
 * @returns {unknown} The parsed object, or the original value if it was not a string.
 */
const parse = (val: unknown) => typeof val === 'string' ? JSON.parse(val) : val;

/**
 * When `VITE_USE_LOCAL_API=true` is set in `.env.local`, all data requests are
 * routed to the local FastAPI server (local_server.py) instead of Supabase.
 * This allows replaying any race from locally pre-processed JSON files with no
 * internet connection or Supabase account required.
 *
 * Set `VITE_LOCAL_API_URL` to override the default base URL of `http://localhost:8001`.
 *
 * To use local mode:
 *   1. Run `python preprocess_local.py --year Y --round R` to generate data files.
 *   2. Run `python local_server.py` to start the local server.
 *   3. Add `VITE_USE_LOCAL_API=true` to `client/.env.local`.
 */
const USE_LOCAL = import.meta.env.VITE_USE_LOCAL_API === 'true';
const LOCAL_API = (import.meta.env.VITE_LOCAL_API_URL ?? 'http://localhost:8001').replace(/\/$/, '');

/**
 * Thin fetch wrapper for the local server. Throws a plain `Error` on non-OK
 * responses so callers handle errors the same way as Supabase failures.
 *
 * @param {string} path - The API path to fetch (e.g. `/api/years`).
 * @returns {Promise<T>} The parsed JSON response body.
 * @throws {Error} If the response status is not OK.
 */
async function localGet<T>(path: string): Promise<T> {
  const res = await fetch(`${LOCAL_API}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Local API error ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Collection of async functions that abstract all data fetching for race and
 * telemetry data. Each method transparently switches between Supabase (production /
 * GitHub Pages) and the local FastAPI server (local development) based on the
 * `VITE_USE_LOCAL_API` environment flag.
 *
 * All methods throw a plain `Error` on failure so callers can handle errors
 * uniformly without inspecting provider-specific error objects.
 */
export const telemetryService = {

  /**
   * Returns the distinct set of season years that have available race data,
   * sorted in descending order (most recent first).
   *
   * @returns {Promise<{ years: number[] }>} Available season years.
   * @throws {Error} If the request fails.
   */
  getAvailableYears: async (): Promise<{ years: number[] }> => {
    if (USE_LOCAL) {
      return localGet<{ years: number[] }>('/api/years');
    }

    const { data, error } = await supabase
      .from('races')
      .select('year')
      .order('year', { ascending: false });

    if (error) throw new Error(error.message);
    /** De-duplicate years since one row exists per race, not per season. */
    const years = [...new Set((data ?? []).map((r: { year: number }) => r.year))];
    return { years };
  },

  /**
   * Returns the full race schedule for a given season, ordered by round number.
   *
   * @param {number} year - The season year to fetch the schedule for.
   * @returns {Promise<RaceWeekend[]>} Ordered list of race weekends in the season.
   * @throws {Error} If the request fails.
   */
  getRaceSchedule: async (year: number): Promise<RaceWeekend[]> => {
    if (USE_LOCAL) {
      return localGet<RaceWeekend[]>(`/api/schedule/${year}`);
    }

    const { data, error } = await supabase
      .from('races')
      .select('round_number:round, event_name, circuit_name, country, date')
      .eq('year', year)
      .order('round', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as RaceWeekend[];
  },

  /**
   * Fetches track geometry and session metadata for a specific race.
   *
   * In Supabase mode, two tables are queried in parallel:
   * - `track_shapes` — circuit boundary frames, DRS zone definitions, and rotation angle.
   * - `races` — session metadata including event name, circuit, country, laps, and track statuses.
   *
   * In local mode, a single endpoint returns the combined response directly.
   *
   * @param {number} year - The season year of the race.
   * @param {number} round - The round number of the race.
   * @returns {Promise<TrackDataResponse>} Combined track geometry and session info.
   * @throws {Error} If either query fails.
   */
  getTrackData: async (year: number, round: number): Promise<TrackDataResponse> => {
    if (USE_LOCAL) {
      return localGet<TrackDataResponse>(`/api/track/${year}/${round}`);
    }

    const [trackRes, raceRes] = await Promise.all([
      supabase
        .from('track_shapes')
        .select('frames, drs_zones, circuit_rotation')
        .eq('year', year)
        .eq('round', round)
        .single(),
      supabase
        .from('races')
        .select('event_name, circuit_name, country, date, total_laps, track_statuses')
        .eq('year', year)
        .eq('round', round)
        .single(),
    ]);

    if (trackRes.error) throw new Error(trackRes.error.message);
    if (raceRes.error)  throw new Error(raceRes.error.message);

    const track = trackRes.data;
    const race  = raceRes.data;

    return {
      frames:           parse(track.frames),
      drs_zones:        parse(track.drs_zones),
      /** Circuit rotation defaults to 0 when the column is null. */
      circuit_rotation: track.circuit_rotation ?? 0,
      /** `track_statuses` defaults to an empty array when the column is null. */
      track_statuses:   parse(race.track_statuses ?? '[]'),
      session_info: {
        event_name:   race.event_name,
        circuit_name: race.circuit_name,
        country:      race.country,
        date:         race.date,
        year,
        round,
        total_laps:   race.total_laps ?? null,
      },
    };
  },

  /**
   * Fetches all telemetry frames and driver metadata for a race.
   *
   * In Supabase mode, frame data is stored as fixed-size chunks to avoid row-size
   * limits. Chunk 0 additionally holds driver colors, team mappings, and official
   * positions. All chunks are fetched sequentially then flattened into a single array.
   *
   * In local mode, all frames are returned in a single request from the local server.
   *
   * @param {number} year - The season year of the race.
   * @param {number} round - The round number of the race.
   * @returns {Promise<RaceFramesResponse>} All frames plus driver metadata.
   * @throws {Error} If the metadata row is missing or any chunk fetch fails.
   */
  getRaceFrames: async (year: number, round: number): Promise<RaceFramesResponse> => {
    if (USE_LOCAL) {
      return localGet<RaceFramesResponse>(`/api/frames/${year}/${round}`);
    }

    /** Chunk 0 doubles as the metadata row, providing the total chunk count and driver info. */
    const { data: meta, error: metaErr } = await supabase
      .from('race_frames')
      .select('total_chunks, driver_colors, driver_teams, official_positions')
      .eq('year', year)
      .eq('round', round)
      .eq('chunk_index', 0)
      .single();

    if (metaErr) throw new Error(metaErr.message);
    if (!meta)   throw new Error('No frame data found');

    const totalChunks: number = meta.total_chunks;

    /** Fetch each chunk sequentially to avoid overwhelming the Supabase connection pool. */
    const chunkFrames: unknown[][] = [];
    for (let i = 0; i < totalChunks; i++) {
      const { data, error } = await supabase
        .from('race_frames')
        .select('frames')
        .eq('year', year)
        .eq('round', round)
        .eq('chunk_index', i)
        .single();

      if (error) throw new Error(`Chunk ${i} failed: ${error.message}`);
      chunkFrames.push(parse(data.frames));
    }

    /** Flatten per-chunk arrays into a single contiguous frame list. */
    const allFrames = chunkFrames.flat() as Frame[];

    return {
      frames:             allFrames,
      driver_colors:      parse(meta.driver_colors),
      driver_teams:       parse(meta.driver_teams),
      /** `official_positions` defaults to an empty object when the column is null. */
      official_positions: parse(meta.official_positions ?? '{}'),
      total_frames:       allFrames.length,
    };
  },

  /**
   * Returns a driver's full historical results at a specific circuit, one entry
   * per race that has telemetry data available.
   *
   * Retirement status (`is_retired`) is derived from the driver's `is_out` flag
   * on their final telemetry frame rather than inferred from finishing position,
   * so classified retirements (position set, is_out true) are correctly identified.
   *
   * Always reads from Supabase — local mode does not store cross-season history.
   *
   * @param {string} driverCode - Three-letter driver code (e.g. `"HAM"`).
   * @param {string} circuitName - Circuit name to filter races by.
   * @returns {Promise<Array<{ year, round, event_name, position, is_retired, team }>>}
   *   Chronologically ordered results for the driver at this circuit.
   * @throws {Error} If the initial races query fails.
   */
  getDriverCircuitHistory: async (driverCode: string, circuitName: string) => {
    const { data: races, error: racesErr } = await supabase
      .from('races')
      .select('year, round, event_name')
      .eq('circuit_name', circuitName)
      .order('year', { ascending: true });

    if (racesErr) throw new Error(racesErr.message);
    if (!races || races.length === 0) return [];

    const results = await Promise.all(
      races.map(async race => {
        /** Fetch official positions, team mapping, and chunk count from the metadata row. */
        const { data: meta, error: metaErr } = await supabase
          .from('race_frames')
          .select('official_positions, driver_teams, total_chunks')
          .eq('year', race.year)
          .eq('round', race.round)
          .eq('chunk_index', 0)
          .single();

        if (metaErr || !meta) return null;

        const positions = parse(meta.official_positions ?? '{}');
        const teams     = parse(meta.driver_teams ?? '{}');
        const position  = positions[driverCode] ?? null;
        const team      = teams[driverCode] ?? '';

        /** Skip races where the driver has no recorded position or team. */
        if (position === null && !team) return null;

        /**
         * Derive retirement from the last frame of the last chunk rather than
         * from position, so classified retirements are correctly flagged.
         */
        let is_retired = false;
        const lastChunkIdx = (meta.total_chunks ?? 1) - 1;
        const { data: lastChunk } = await supabase
          .from('race_frames')
          .select('frames')
          .eq('year', race.year)
          .eq('round', race.round)
          .eq('chunk_index', lastChunkIdx)
          .single();

        if (lastChunk) {
          const frames     = parse(lastChunk.frames);
          const lastFrame  = frames[frames.length - 1];
          const driverData = lastFrame?.drivers?.[driverCode];
          is_retired = driverData?.is_out === true;
        }

        return {
          year:       race.year,
          round:      race.round,
          event_name: race.event_name,
          position,
          is_retired,
          team,
        };
      })
    );

    /** Filter out null entries (races the driver didn't participate in). */
    return results.filter(Boolean) as {
      year: number; round: number; event_name: string;
      position: number | null; is_retired: boolean; team: string;
    }[];
  },

  /**
   * Returns all race year/round pairs held at a specific circuit, ordered
   * chronologically. Used by `useComparisonMode` to determine which historical
   * races to fetch frames for.
   *
   * Always reads from Supabase.
   *
   * @param {string} circuitName - The circuit name to query.
   * @returns {Promise<Array<{ year: number; round: number }>>} Chronologically
   *   ordered list of races at the given circuit.
   * @throws {Error} If the Supabase query fails.
   */
  getCircuitRaceRounds: async (circuitName: string): Promise<{ year: number; round: number }[]> => {
    const { data, error } = await supabase
      .from('races')
      .select('year, round')
      .eq('circuit_name', circuitName)
      .order('year', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as { year: number; round: number }[];
  },

};
