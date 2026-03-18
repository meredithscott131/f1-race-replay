"""
Backfills is_out flags on existing Supabase frame data without reprocessing telemetry.
Fetches frames from DB, applies retirement detection, re-uploads chunks.

Usage:
  python backfill_is_out.py --year 2024 --round 1
  python backfill_is_out.py --year 2024 --all
"""

import argparse
import json
import os
import sys
import logging

from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

sys.path.insert(0, os.path.dirname(__file__))

from core.f1_data import load_session, enable_cache
from preprocess import mark_retired_drivers, apply_finishing_from_laps


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def backfill(year: int, round: int, supabase: Client):
    logger.info(f"Backfilling {year} Round {round}...")

    # ── 1. Fetch existing chunks from Supabase ───────────────────────────────
    res = supabase.table("race_frames") \
        .select("frames, driver_colors, driver_teams, chunk_index, total_chunks") \
        .eq("year", year).eq("round", round) \
        .order("chunk_index", desc=False) \
        .execute()

    if not res.data:
        logger.warning(f"  No frames found in DB for {year} R{round}, skipping.")
        return

    # Reassemble all chunks into one flat list
    all_frames = []
    for row in res.data:
        chunk = row["frames"]
        if isinstance(chunk, str):
            chunk = json.loads(chunk)
        all_frames.extend(chunk)

    driver_colors = res.data[0]["driver_colors"]
    driver_teams  = res.data[0]["driver_teams"]

    logger.info(f"  Fetched {len(all_frames)} frames from {len(res.data)} chunks")

    # ── 2. Load full session (needed for session.laps with Driver column) ────
    enable_cache()
    session = load_session(year, round, "R")

    # ── 3. Fetch total_laps from races table ─────────────────────────────────
    race_info = supabase.table("races").select("total_laps").eq("year", year).eq("round", round).single().execute()
    total_laps = (race_info.data or {}).get("total_laps") or 0

    # ── 4. Apply flags ────────────────────────────────────────────────────────
    all_frames = mark_retired_drivers(all_frames, session)
    all_frames = apply_finishing_from_laps(all_frames, session, total_laps)
    # ── 4. Re-chunk and re-upload ────────────────────────────────────────────
    CHUNK_SIZE = 500
    chunks = [all_frames[i:i+CHUNK_SIZE] for i in range(0, len(all_frames), CHUNK_SIZE)]
    total_chunks = len(chunks)

    supabase.table("race_frames").delete() \
        .eq("year", year).eq("round", round).execute()

    for idx, chunk in enumerate(chunks):
        supabase.table("race_frames").insert({
            "year":          year,
            "round":         round,
            "driver_colors": json.dumps(driver_colors) if isinstance(driver_colors, dict) else driver_colors,
            "driver_teams":  json.dumps(driver_teams)  if isinstance(driver_teams,  dict) else driver_teams,
            "frames":        json.dumps(chunk),
            "chunk_index":   idx,
            "total_chunks":  total_chunks,
        }).execute()
        logger.info(f"  Chunk {idx+1}/{total_chunks} uploaded")

    logger.info(f"  ✅ Done — {year} Round {round} backfilled.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--year",  type=int, required=True)
    parser.add_argument("--round", type=int, default=None)
    parser.add_argument("--all",   action="store_true")
    args = parser.parse_args()

    supabase = get_supabase()

    if args.all:
        res = supabase.table("races").select("round") \
            .eq("year", args.year).order("round").execute()
        rounds = [r["round"] for r in res.data]
        logger.info(f"Backfilling {len(rounds)} rounds for {args.year}...")
        for r in rounds:
            try:
                backfill(args.year, r, supabase)
            except Exception as e:
                logger.error(f"  ❌ Failed round {r}: {e}")
    elif args.round:
        backfill(args.year, args.round, supabase)
    else:
        parser.error("Provide --round N or --all")


if __name__ == "__main__":
    main()
    