"""
Local replay server for F1 race data.

Serves locally pre-processed race data (produced by preprocess_local.py) via
HTTP endpoints whose response shapes exactly match what the frontend's
telemetryService.ts expects from Supabase.  No internet connection or Supabase
account is required once the data files exist.

Usage:
    python local_server.py

Then set the following in client/.env.local:
    VITE_USE_LOCAL_API=true
    VITE_LOCAL_API_URL=http://localhost:8001

Endpoints:
    GET /api/years                          → { years: number[] }
    GET /api/schedule/{year}               → RaceWeekend[]
    GET /api/track/{year}/{round}          → TrackDataResponse
    GET /api/frames/{year}/{round}         → RaceFramesResponse
    GET /health                            → { status: "ok", races: [...] }
"""

import json
import logging
import os

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

LOCAL_DATA_DIR = os.path.join(os.path.dirname(__file__), "local_data")

app = FastAPI(
    title="F1 Race Replay — Local Server",
    description="Serves locally stored race data for the F1 replay frontend.",
    version="1.0.0",
)

# Allow requests from the Vite dev server on any localhost port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _race_dir(year: int, round_num: int) -> str:
    return os.path.join(LOCAL_DATA_DIR, f"{year}_{round_num}")


def _load_json(path: str):
    """Load a JSON file, raising a 404 HTTPException if the file doesn't exist."""
    if not os.path.exists(path):
        raise HTTPException(
            status_code=404,
            detail=f"Data file not found: {path}. "
                   f"Run `python preprocess_local.py --year Y --round R` first.",
        )
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _list_available_races() -> list[dict]:
    """
    Scan LOCAL_DATA_DIR for processed race folders and return their metadata.
    Each folder is named ``{year}_{round}`` and contains a ``meta.json``.
    """
    races = []
    if not os.path.exists(LOCAL_DATA_DIR):
        return races

    for entry in sorted(os.listdir(LOCAL_DATA_DIR)):
        meta_path = os.path.join(LOCAL_DATA_DIR, entry, "meta.json")
        if not os.path.exists(meta_path):
            continue
        try:
            meta = json.loads(open(meta_path, encoding="utf-8").read())
            races.append(meta)
        except Exception:
            continue

    return races


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Returns server status and a list of all locally available races."""
    races = _list_available_races()
    return {
        "status": "ok",
        "races_available": len(races),
        "races": [
            {"year": r["year"], "round": r["round"], "event_name": r["event_name"]}
            for r in races
        ],
    }


@app.get("/api/years")
def get_years():
    """
    Returns the distinct season years that have at least one locally stored race.
    Matches the shape returned by ``telemetryService.getAvailableYears``.
    """
    races = _list_available_races()
    years = sorted({r["year"] for r in races}, reverse=True)
    return {"years": years}


@app.get("/api/schedule/{year}")
def get_schedule(year: int):
    """
    Returns all locally stored races for a given season, ordered by round number.
    Matches the ``RaceWeekend[]`` shape returned by ``telemetryService.getRaceSchedule``.
    """
    races = _list_available_races()
    season = sorted(
        [r for r in races if r["year"] == year],
        key=lambda r: r["round"],
    )
    if not season:
        raise HTTPException(
            status_code=404,
            detail=f"No local data found for {year}. "
                   f"Run `python preprocess_local.py --year {year} --all` first.",
        )

    return [
        {
            "round_number": r["round"],
            "event_name":   r["event_name"],
            "circuit_name": r["circuit_name"],
            "country":      r["country"],
            "date":         r["date"],
        }
        for r in season
    ]


@app.get("/api/track/{year}/{round_num}")
def get_track(year: int, round_num: int):
    """
    Returns track geometry and session metadata for a specific race.
    Matches the ``TrackDataResponse`` shape consumed by ``telemetryService.getTrackData``.
    """
    out_dir = _race_dir(year, round_num)
    meta   = _load_json(os.path.join(out_dir, "meta.json"))
    track  = _load_json(os.path.join(out_dir, "track_shape.json"))

    return {
        "frames":           track["frames"],
        "drs_zones":        track["drs_zones"],
        "circuit_rotation": track.get("circuit_rotation", 0),
        "track_statuses":   meta.get("track_statuses", []),
        "session_info": {
            "event_name":   meta["event_name"],
            "circuit_name": meta["circuit_name"],
            "country":      meta["country"],
            "date":         meta["date"],
            "year":         meta["year"],
            "round":        meta["round"],
            "total_laps":   meta.get("total_laps"),
        },
    }


@app.get("/api/frames/{year}/{round_num}")
def get_frames(year: int, round_num: int):
    """
    Returns all telemetry frames and driver metadata for a specific race.
    Matches the ``RaceFramesResponse`` shape consumed by ``telemetryService.getRaceFrames``.
    """
    out_dir = _race_dir(year, round_num)
    meta   = _load_json(os.path.join(out_dir, "meta.json"))
    frames = _load_json(os.path.join(out_dir, "frames.json"))

    return {
        "frames":             frames,
        "driver_colors":      meta.get("driver_colors", {}),
        "driver_teams":       meta.get("driver_teams", {}),
        "official_positions": meta.get("official_positions", {}),
        "total_frames":       len(frames),
    }


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if not os.path.exists(LOCAL_DATA_DIR):
        logger.warning(
            f"No local_data/ directory found at {LOCAL_DATA_DIR}. "
            "Run preprocess_local.py to generate race data first."
        )
    else:
        races = _list_available_races()
        logger.info(f"Found {len(races)} locally stored race(s).")
        for r in races:
            logger.info(f"  {r['year']} Round {r['round']} — {r['event_name']}")

    uvicorn.run(app, host="0.0.0.0", port=8001)