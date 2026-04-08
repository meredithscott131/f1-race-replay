"""
DRS Zone Detection
"""

import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


def extract_drs_zones_from_telemetry(telemetry_df) -> List[Dict[str, int]]:
    """
    Extract DRS zones from telemetry DataFrame
    Replicates the plotDRSzones logic from the original code

    Args:
        telemetry_df: FastF1 telemetry DataFrame with DRS column

    Returns:
        List of DRS zone dicts with start/end indices
    """
    if telemetry_df is None or telemetry_df.empty:
        return []

    if "DRS" not in telemetry_df.columns:
        logger.warning("No DRS column in telemetry")
        return []

    drs_zones = []
    drs_start = None

    # Iterate through DRS values
    for i, drs_val in enumerate(telemetry_df["DRS"]):
        # DRS active when value is 10, 12, or 14
        if drs_val in [10, 12, 14]:
            if drs_start is None:
                drs_start = i
        else:
            if drs_start is not None:
                drs_end = i - 1
                drs_zones.append({"start_index": int(drs_start), "end_index": int(drs_end)})
                drs_start = None

    # Handle case where DRS zone extends to end of lap
    if drs_start is not None:
        drs_zones.append({"start_index": int(drs_start), "end_index": int(len(telemetry_df) - 1)})

    logger.info(f"Extracted {len(drs_zones)} DRS zones from telemetry")
    return drs_zones


def get_drs_zones_for_session(session, driver_code: str = None) -> List[Dict[str, int]]:
    """
    Get DRS zones for a session by analyzing a representative lap

    Args:
        session: FastF1 session
        driver_code: Driver to use (None = use race winner or fastest)

    Returns:
        List of DRS zones with indices
    """
    try:
        # Get a driver who finished the race
        if driver_code is None:
            # Use first driver in results
            driver_code = session.results.iloc[0]["Abbreviation"]

        logger.info(f"Getting DRS zones from driver: {driver_code}")

        # Get driver's laps
        driver_laps = session.laps.pick_drivers(driver_code)

        if driver_laps.empty:
            logger.warning(f"No laps for driver {driver_code}")
            return []

        # Pick a lap from the middle of the race (lap 10-20) where DRS is definitely active
        suitable_lap = None
        for lap_num in [15, 10, 20, 8, 5]:
            lap = driver_laps[driver_laps["LapNumber"] == lap_num]
            if not lap.empty:
                suitable_lap = lap.iloc[0]
                logger.info(f"Using lap {lap_num} for DRS detection")
                break

        if suitable_lap is None:
            logger.warning("No suitable lap found")
            return []

        # Get telemetry
        telemetry = suitable_lap.get_telemetry()

        # Extract DRS zones
        drs_zones = extract_drs_zones_from_telemetry(telemetry)

        return drs_zones

    except Exception as e:
        logger.error(f"Error getting DRS zones: {e}", exc_info=True)
        return []
