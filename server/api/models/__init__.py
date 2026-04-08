"""
API models module

Contains Pydantic models for request/response validation.
"""

from api.models.driver import (
    DriverColor,
    DriverInfo,
    DriverPosition,
)
from api.models.race import (
    AvailableYearsResponse,
    RaceScheduleResponse,
    RaceWeekend,
    SessionInfo,
    SessionType,
)
from api.models.telemetry import (
    CacheInfoResponse,
    Frame,
    TelemetryData,
    TelemetryStatusResponse,
    TrackStatus,
    WeatherData,
)

__all__ = [
    # Race models
    "RaceWeekend",
    "SessionType",
    "SessionInfo",
    "AvailableYearsResponse",
    "RaceScheduleResponse",
    # Telemetry models
    "TelemetryData",
    "Frame",
    "WeatherData",
    "TrackStatus",
    "TelemetryStatusResponse",
    "CacheInfoResponse",
    # Driver models
    "DriverPosition",
    "DriverColor",
    "DriverInfo",
]
