"""
Session management endpoints
"""

import logging

from fastapi import APIRouter, HTTPException, Path, Query

from config.settings import get_settings
from core.f1_data import get_circuit_rotation, load_session

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


@router.get("/info/{year}/{round}")
async def get_session_info(
    year: int = Path(..., ge=2018, le=2025),  # Changed to Path
    round: int = Path(..., ge=1, le=24),  # Changed to Path
    session_type: str = Query("R", regex="^(R|S|Q|SQ)$"),
):
    """Get basic session information"""
    try:
        logger.info(f"Loading session info: {year} R{round} {session_type}")

        session = load_session(year, round, session_type)

        return {
            "event_name": str(session.event["EventName"]),
            "circuit_name": str(session.event.get("Location", "Unknown")),
            "country": str(session.event["Country"]),
            "year": year,
            "round": round,
            "date": str(session.event["EventDate"].date()),
            "session_type": session_type,
            "circuit_rotation": get_circuit_rotation(session),
        }

    except Exception as e:
        logger.error(f"Error loading session info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load session info: {str(e)}")


@router.get("/types")
async def get_session_types():
    """Get available session types"""
    return {
        "session_types": [
            {"code": "R", "name": "Race", "description": "Main race"},
            {"code": "S", "name": "Sprint", "description": "Sprint race"},
            {"code": "Q", "name": "Qualifying", "description": "Qualifying session"},
            {
                "code": "SQ",
                "name": "Sprint Qualifying",
                "description": "Sprint qualifying",
            },
        ]
    }


@router.get("/validate/{year}/{round}")
async def validate_session(
    year: int = Path(..., ge=2018, le=2025),  # Changed to Path
    round: int = Path(..., ge=1, le=24),  # Changed to Path
    session_type: str = Query("R", regex="^(R|S|Q|SQ)$"),
):
    """Validate if a session exists"""
    try:
        session = load_session(year, round, session_type)

        return {
            "valid": True,
            "exists": True,
            "event_name": str(session.event["EventName"]),
            "message": "Session is available",
        }

    except Exception as e:
        logger.warning(f"Session validation failed: {e}")
        return {"valid": False, "exists": False, "message": str(e)}
