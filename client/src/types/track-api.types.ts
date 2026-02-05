export interface TrackFrame {
  t: number;
  x: number;
  y: number;
}

export interface DRSZone {
  start_index: number;
  end_index: number;
}

export interface TrackDataResponse {
  frames: TrackFrame[];
  drs_zones: DRSZone[];
  circuit_rotation: number;
  session_info: {
    event_name: string;
    circuit_name: string;
    country: string;
    year: number;
    round: number;
    date: string;
  };
}
