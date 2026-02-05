"""
Race schedule and event endpoints
"""

from fastapi import APIRouter, HTTPException, Path, Query
from typing import List
import logging

from api.models.race import RaceWeekend, AvailableYearsResponse
from core.f1_data import get_race_weekends_by_year
from config.settings import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


@router.get("/available-years", response_model=AvailableYearsResponse)
async def get_available_years():
    """
    Get list of years with available F1 data
    """
    try:
        years = settings.get_allowed_years()
        return {"years": years}
    except Exception as e:
        logger.error(f"Error getting available years: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schedule/{year}", response_model=List[RaceWeekend])
async def get_race_schedule(
    year: int = Path(..., ge=2018, le=2025, description="Season year")  # Changed Query to Path
):
    """
    Get race schedule for a specific year
    """
    try:
        logger.info(f"Fetching schedule for year {year}")
        events = get_race_weekends_by_year(year)
        logger.info(f"Found {len(events)} events for {year}")
        return events
    except Exception as e:
        logger.error(f"Error fetching schedule for {year}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load schedule for {year}: {str(e)}"
        )


@router.get("/schedule/{year}/{round}", response_model=RaceWeekend)
async def get_race_weekend(
    year: int = Path(..., ge=2018, le=2025),  # Changed Query to Path
    round: int = Path(..., ge=1, le=24, description="Round number")  # Changed Query to Path
):
    """
    Get details for a specific race weekend
    """
    try:
        events = get_race_weekends_by_year(year)
        
        weekend = next((e for e in events if e["round_number"] == round), None)
        
        if not weekend:
            raise HTTPException(
                status_code=404,
                detail=f"Round {round} not found for year {year}"
            )
        
        return weekend
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching round {round} for {year}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

