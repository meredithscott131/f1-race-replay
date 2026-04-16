"""
Pre-processes F1 race data and saves it locally for use with local_server.py.

Unlike preprocess.py (which uploads to Supabase), this script writes processed
data to a local `local_data/` directory so any race can be replayed entirely
offline via the local development server.

Usage:
    python preprocess_local.py --year 2024 --round 1
    python preprocess_local.py --year 2024 --all     # process every round in a season
    python preprocess_local.py --year 2024 --round 1 --force  # overwrite existing data

Output structure:
    local_data/
        {year}_{round}/
            meta.json          # race metadata (event name, circuit, country, laps, statuses)
            track_shape.json   # circuit boundary frames and DRS zones
            frames.json        # all telemetry frames with driver positions
"""

import argparse
import json
import logging
import math
import os
import sys

import numpy as np
import requests

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

sys.path.insert(0, os.path.dirname(__file__))

from core.f1_data import (
    enable_cache,
    get_circuit_rotation,
    get_driver_colors,
    get_race_telemetry,
    get_race_weekends_by_year,
    get_track_shape,
    load_session,
    load_session_minimal,
)

# Root directory for all locally stored race data
LOCAL_DATA_DIR = os.path.join(os.path.dirname(__file__), "local_data")


# ── JSON sanitisation ─────────────────────────────────────────────────────────

def _sanitize(obj):
    """
    Recursively coerce numpy scalars, NaN, and Inf to JSON-safe Python types.
    numpy bools → bool, numpy ints → int, numpy floats → float (NaN/Inf → None),
    numpy arrays → list.
    """
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_sanitize(v) for v in obj]
    if isinstance(obj, np.bool_):
        return bool(obj)
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        f = float(obj)
        return None if (math.isnan(f) or math.isinf(f)) else f
    if isinstance(obj, np.ndarray):
        return _sanitize(obj.tolist())
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    return obj


def _write_json(path: str, obj) -> None:
    """Sanitise and write an object to a JSON file, creating directories as needed."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(_sanitize(obj), f)


# ── Official finishing positions ──────────────────────────────────────────────

def get_official_positions(session) -> dict[str, int]:
    """
    Resolve official race finishing positions using a three-tier fallback strategy:

    1. FastF1 ``session.results`` — available immediately after the race.
    2. Jolpica API (community Ergast mirror) — useful when FastF1 results are
       incomplete or unavailable for older seasons.
    3. Lap-position fallback — reads positions from ~5 laps before the end of
       the race. Less accurate but always available.

    Args:
        session: A loaded FastF1 ``Session`` object.

    Returns:
        Dict mapping driver code → official finishing position (1-based).
        Empty dict if no position data could be obtained.
    """
    import pandas as pd

    # 1. FastF1 session.results
    results = session.results
    if results is not None and not results.empty and "Position" in results.columns:
        pos = {}
        for _, row in results.iterrows():
            code = row.get("Abbreviation", "")
            p = row.get("Position")
            if code and p is not None and not pd.isna(p):
                pos[code] = int(p)
        if pos:
            logger.info(f"  Official positions from session.results: {pos}")
            return pos

    # 2. Jolpica (community-maintained Ergast mirror)
    try:
        year = session.event["EventDate"].year
        round_num = session.event["RoundNumber"]
        url = f"https://api.jolpi.ca/ergast/f1/{year}/{round_num}/results.json"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        races = resp.json()["MRData"]["RaceTable"]["Races"]
        if races:
            pos = {}
            for result in races[0]["Results"]:
                code = result.get("Driver", {}).get("code", "")
                p = result.get("position")
                if code and p:
                    pos[code] = int(p)
            if pos:
                logger.info(f"  Official positions from Jolpica: {pos}")
                return pos
    except Exception as e:
        logger.warning(f"  Jolpica request failed: {e}")

    # 3. Fallback: positions from ~5 laps before the end
    logger.warning("  Falling back to mid-race positions (may be inaccurate)")
    laps = session.laps
    if laps.empty:
        return {}

    leader_lap = int(laps["LapNumber"].max())
    sample_lap = max(1, leader_lap - 5)
    pos = {}
    for _, lap in laps[laps["LapNumber"] == sample_lap].iterrows():
        code = lap.get("Driver", "")
        p = lap.get("Position")
        if code and p is not None and not pd.isna(p):
            pos[code] = int(p)

    logger.info(f"  Fallback positions from lap {sample_lap}: {pos}")
    return pos


# ── Retirement detection ──────────────────────────────────────────────────────

def mark_retired_drivers(frames: list, session) -> list:
    """
    Set ``is_out=True`` on frames belonging to drivers who stopped making
    progress more than 120 seconds before the end of the race.

    Lapped finishers continue moving until the chequered flag and are therefore
    not flagged as retired even if they are far behind the leader.

    Args:
        frames: Full list of telemetry frame dicts.
        session: Loaded FastF1 session (unused here but kept for API consistency).

    Returns:
        The same ``frames`` list with ``is_out`` set on each driver snapshot.
    """
    if not frames:
        return frames

    race_end_t = frames[-1].get("t", 0)
    RETIREMENT_THRESHOLD = 120  # seconds without distance progress = retired

    last_active: dict[str, float] = {}
    last_dist: dict[str, float] = {}

    for frame in frames:
        t = frame.get("t", 0)
        for code, d in frame.get("drivers", {}).items():
            dist = d.get("dist")
            if dist is None:
                continue
            prev = last_dist.get(code)
            if prev is None or dist > prev:
                last_active[code] = t
                last_dist[code] = dist

    retired_codes = {
        code for code, t in last_active.items()
        if (race_end_t - t) > RETIREMENT_THRESHOLD
    }

    if not retired_codes:
        logger.info("  No retired drivers detected.")
    else:
        logger.info(f"  Retired drivers: {retired_codes}")

    for frame in frames:
        t = frame.get("t", 0)
        for code, d in frame.get("drivers", {}).items():
            d["is_out"] = (code in retired_codes and t > last_active.get(code, 0))

    return frames


# ── Finishing position freeze ─────────────────────────────────────────────────

def freeze_finishing_positions(frames: list, total_laps: int, official_positions: dict) -> list:
    """
    Stamp ``finished=True`` and lock ``position`` to the official value for
    each driver once they cross the finish line (lap count exceeds ``total_laps``).

    Lapped drivers are also marked finished once the leader has taken the
    chequered flag, using their official position.

    Args:
        frames: Full list of telemetry frame dicts.
        total_laps: Total scheduled laps in the race.
        official_positions: Map of driver code → finishing position.

    Returns:
        The same ``frames`` list with ``finished`` and ``position`` stamped.
    """
    if not frames or not total_laps:
        return frames

    official_positions = official_positions or {}

    # Pass 1: find the first frame where each driver exceeds total_laps
    finish_positions: dict[str, int] = {}
    leader_finish_frame: int | None = None

    for frame_idx, frame in enumerate(frames):
        for code, d in frame.get("drivers", {}).items():
            if code not in finish_positions and d.get("lap", 0) > total_laps:
                finish_positions[code] = official_positions.get(code, d.get("position", 99))
                if official_positions.get(code) == 1 and leader_finish_frame is None:
                    leader_finish_frame = frame_idx

    # Pass 2: stamp finished flag and lock position
    for frame_idx, frame in enumerate(frames):
        after_leader = leader_finish_frame is not None and frame_idx >= leader_finish_frame

        for code, d in frame.get("drivers", {}).items():
            if d.get("is_out", False):
                d["finished"] = False
                continue

            lead_lap_done = code in finish_positions and d.get("lap", 0) > total_laps

            if lead_lap_done:
                d["finished"] = True
                d["position"] = finish_positions[code]
            elif after_leader and code in official_positions:
                # Lapped driver — race is over for them too
                d["finished"] = True
                d["position"] = official_positions[code]
            else:
                d["finished"] = False

    return frames


# ── Main processing function ──────────────────────────────────────────────────

def process_and_save(year: int, round_num: int, force: bool = False) -> None:
    """
    Process a single race and save all output as JSON files under
    ``local_data/{year}_{round_num}/``.

    Skips processing if the output directory already exists unless
    ``force=True`` is passed.

    Output files:
        - ``meta.json``        — race metadata, session info, track statuses.
        - ``track_shape.json`` — circuit boundary frames and DRS zone indices.
        - ``frames.json``      — downsampled telemetry frames (≤ 5000).

    Args:
        year: F1 season year.
        round_num: Round number within the season.
        force: Re-process and overwrite even if output already exists.
    """
    out_dir = os.path.join(LOCAL_DATA_DIR, f"{year}_{round_num}")

    if not force and os.path.exists(out_dir):
        logger.info(f"  {year} Round {round_num} already exists locally. Use --force to overwrite.")
        return

    logger.info(f"Processing {year} Round {round_num}...")

    # ── 1. Track shape (fast load — no weather or messages) ───────────────────
    logger.info("  Loading track shape...")
    session_min = load_session_minimal(year, round_num, "R")
    track_frames = get_track_shape(session_min)
    circuit_rotation = get_circuit_rotation(session_min)
    n = len(track_frames)

    # Placeholder DRS zones — two zones at roughly 15–25 % and 85–95 % of the lap
    drs_zones = [
        {"start_index": int(n * 0.15), "end_index": int(n * 0.25)},
        {"start_index": int(n * 0.85), "end_index": int(n * 0.95)},
    ]
    logger.info(f"  Track shape: {n} points")

    # ── 2. Full race telemetry ─────────────────────────────────────────────────
    logger.info("  Processing race frames (may take several minutes on first run)...")
    session_full = load_session(year, round_num, "R")
    telemetry = get_race_telemetry(session_full, "R")
    total_laps = telemetry.get("total_laps") or 0
    all_frames = telemetry["frames"]

    driver_colors = get_driver_colors(session_full)

    driver_teams: dict[str, str] = {}
    for _, row in session_full.results.iterrows():
        code = row.get("Abbreviation")
        team = row.get("TeamName", "Unknown")
        if code:
            driver_teams[code] = team

    # ── 3. Official finishing positions ───────────────────────────────────────
    official_positions = get_official_positions(session_full)
    logger.info(f"  Official positions: {official_positions}")

    # ── 4. Retirement and finish flags ────────────────────────────────────────
    all_frames = mark_retired_drivers(all_frames, session_full)
    all_frames = freeze_finishing_positions(all_frames, total_laps, official_positions)

    # ── 5. Downsample to ≤ 5000 frames ───────────────────────────────────────
    MAX_FRAMES = 5000
    if len(all_frames) > MAX_FRAMES:
        step = len(all_frames) / MAX_FRAMES
        frames_to_store = [all_frames[int(i * step)] for i in range(MAX_FRAMES)]
    else:
        frames_to_store = all_frames
    logger.info(f"  Frames: {len(frames_to_store)} (downsampled from {len(all_frames)})")

    # ── 6. Track status intervals ─────────────────────────────────────────────
    track_statuses = []
    status_data = session_full.track_status
    if status_data is not None and not status_data.empty:
        race_start_offset = session_full.laps["LapStartTime"].min().total_seconds()
        for i in range(len(status_data)):
            row = status_data.iloc[i]
            start_t = row["Time"].total_seconds() - race_start_offset
            end_t = (
                (status_data.iloc[i + 1]["Time"].total_seconds() - race_start_offset)
                if i + 1 < len(status_data)
                else None
            )
            if end_t is not None and end_t <= 0:
                continue
            track_statuses.append({
                "status": str(row["Status"]),
                "start_time": max(0.0, start_t),
                "end_time": end_t,
            })
    logger.info(f"  Track statuses: {len(track_statuses)} entries")

    # ── 7. Write JSON files ───────────────────────────────────────────────────
    logger.info(f"  Saving to {out_dir}/ ...")

    _write_json(os.path.join(out_dir, "meta.json"), {
        "year": year,
        "round": round_num,
        "event_name": str(session_min.event["EventName"]),
        "circuit_name": str(session_min.event.get("Location", "Unknown")),
        "country": str(session_min.event["Country"]),
        "date": str(session_min.event["EventDate"].date()),
        "total_laps": total_laps,
        "track_statuses": track_statuses,
        "driver_colors": driver_colors,
        "driver_teams": driver_teams,
        "official_positions": official_positions,
    })

    _write_json(os.path.join(out_dir, "track_shape.json"), {
        "frames": track_frames,
        "drs_zones": drs_zones,
        "circuit_rotation": circuit_rotation,
    })

    _write_json(os.path.join(out_dir, "frames.json"), frames_to_store)

    logger.info(f"  ✅ Done — saved to {out_dir}/")


# ── CLI entry point ───────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Pre-process F1 race data and save locally for localhost replay."
    )
    parser.add_argument("--year",  type=int, required=True, help="F1 season year")
    parser.add_argument("--round", type=int, default=None,  help="Round number")
    parser.add_argument("--all",   action="store_true",     help="Process all rounds for the year")
    parser.add_argument("--force", action="store_true",     help="Overwrite existing local data")
    args = parser.parse_args()

    enable_cache()

    if args.all:
        weekends = get_race_weekends_by_year(args.year)
        rounds = [w["round_number"] for w in weekends]
        logger.info(f"Processing all {len(rounds)} rounds for {args.year}...")
        for r in rounds:
            try:
                process_and_save(args.year, r, force=args.force)
            except Exception as e:
                logger.error(f"  ❌ Failed round {r}: {e}")
    elif args.round:
        process_and_save(args.year, args.round, force=args.force)
    else:
        parser.error("Provide --round N or --all")


if __name__ == "__main__":
    main()