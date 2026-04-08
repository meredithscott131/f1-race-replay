"""
Core module for F1 Race Replay API

Provides core functionality for F1 data fetching, processing, and caching.
"""

from core.cache_manager import CacheManager, get_cache_manager
from core.drs_zones import extract_drs_zones_from_telemetry, get_drs_zones_for_session
from core.f1_data import (
    enable_cache,
    get_circuit_rotation,
    get_driver_colors,
    get_driver_quali_telemetry,
    get_quali_telemetry,
    get_qualifying_results,
    get_race_telemetry,
    get_race_weekends_by_year,
    list_rounds,
    list_sprints,
    load_session,
)
from core.telemetry_processor import TelemetryProcessor, process_race_telemetry
from core.time import format_time, parse_time_string
from core.tyres import get_tyre_compound_int, get_tyre_compound_str

__all__ = [
    # F1 Data functions
    "enable_cache",
    "load_session",
    "get_driver_colors",
    "get_circuit_rotation",
    "get_race_telemetry",
    "get_qualifying_results",
    "get_driver_quali_telemetry",
    "get_quali_telemetry",
    "get_race_weekends_by_year",
    "list_rounds",
    "list_sprints",
    # Cache management
    "get_cache_manager",
    "CacheManager",
    # Telemetry processing
    "TelemetryProcessor",
    "process_race_telemetry",
    # DRS zones
    "get_drs_zones_for_session",
    "extract_drs_zones_from_telemetry",
    # Utilities
    "format_time",
    "parse_time_string",
    "get_tyre_compound_int",
    "get_tyre_compound_str",
]
