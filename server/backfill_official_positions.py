"""
Backfills official_positions into existing race_frames rows.
Only loads session.results (fast) — does NOT re-download full telemetry.

Usage:
  python backfill_official_positions.py --year 2024 --round 1
  python backfill_official_positions.py --year 2024 --all
"""

import argparse
import json
import os
import logging

from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

import sys
sys.path.insert(0, os.path.dirname(__file__))
from core.f1_data import load_session, enable_cache
from preprocess import get_official_positions


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def backfill(year: int, round: int, supabase: Client):
    logger.info(f"Backfilling official_positions for {year} Round {round}...")

    enable_cache()
    session = load_session(year, round, "R")
    official_positions = get_official_positions(session)

    if not official_positions:
        logger.warning("  No official positions found, skipping.")
        return

    logger.info(f"  Positions: {official_positions}")

    # Patch every chunk row for this race — official_positions is the same for all
    res = supabase.table("race_frames") \
        .select("id, chunk_index") \
        .eq("year", year).eq("round", round) \
        .execute()

    if not res.data:
        logger.warning("  No rows found in race_frames, skipping.")
        return

    pos_json = json.dumps(official_positions)
    for row in res.data:
        supabase.table("race_frames") \
            .update({"official_positions": pos_json}) \
            .eq("id", row["id"]) \
            .execute()

    logger.info(f"  ✅ Patched {len(res.data)} chunk(s) for {year} Round {round}.")


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