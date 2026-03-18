import { supabase } from '../lib/supabase';
import type { RaceWeekend } from '../types/race.types';
import type { RaceFramesResponse } from '../types/api.types';
import type { TrackDataResponse } from '../types/track-api.types';

const parse = (val: any) => typeof val === 'string' ? JSON.parse(val) : val;

export const telemetryService = {

  getAvailableYears: async (): Promise<{ years: number[] }> => {
    const { data, error } = await supabase
      .from('races')
      .select('year')
      .order('year', { ascending: false });

    if (error) throw new Error(error.message);
    const years = [...new Set((data ?? []).map((r: any) => r.year as number))];
    return { years };
  },

  getRaceSchedule: async (year: number): Promise<RaceWeekend[]> => {
    const { data, error } = await supabase
      .from('races')
      .select('round_number:round, event_name, circuit_name, country, date')
      .eq('year', year)
      .order('round', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as RaceWeekend[];
  },

  getTrackData: async (year: number, round: number): Promise<TrackDataResponse> => {
    const [trackRes, raceRes] = await Promise.all([
      supabase
        .from('track_shapes')
        .select('frames, drs_zones, circuit_rotation')
        .eq('year', year)
        .eq('round', round)
        .single(),
      supabase
        .from('races')
        .select('event_name, circuit_name, country, date, total_laps')
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
      circuit_rotation: track.circuit_rotation ?? 0,
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

  getRaceFrames: async (year: number, round: number): Promise<RaceFramesResponse> => {
    const { data, error } = await supabase
      .from('race_frames')
      .select('frames, driver_colors, driver_teams, official_positions, chunk_index, total_chunks')
      .eq('year', year)
      .eq('round', round)
      .order('chunk_index', { ascending: true });

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('No frame data found');

    const allFrames = data.flatMap((row: any) => parse(row.frames));
    const first = data[0];

    return {
      frames:             allFrames,
      driver_colors:      parse(first.driver_colors),
      driver_teams:       parse(first.driver_teams),
      official_positions: parse(first.official_positions ?? '{}'),
      total_frames:       allFrames.length,
    };
  },
};
