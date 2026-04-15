"""
Cache Manager for F1 Telemetry Data

Handles caching of computed telemetry data to avoid reprocessing.
Uses pickle for fast serialization and file-based storage.
"""

import logging
import pickle
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class CacheManager:
    """Manages caching of F1 telemetry data"""

    def __init__(self, cache_dir: str = "computed_data"):
        """
        Initialize cache manager

        Args:
            cache_dir: Directory to store cache files (relative to project root)
        """
        project_root = Path(__file__).parent.parent.parent
        self.cache_dir = project_root / cache_dir
        self.cache_dir.mkdir(exist_ok=True)

        self.fastf1_cache_dir = project_root / ".fastf1-cache"
        self.fastf1_cache_dir.mkdir(exist_ok=True)

        logger.info(f"Cache directory: {self.cache_dir}")
        logger.info(f"FastF1 cache directory: {self.fastf1_cache_dir}")

    def _generate_cache_key(self, year: int, round_number: int, session_type: str) -> str:
        """
        Generate a cache key for a session

        Args:
            year: Season year
            round_number: Round number
            session_type: Session type (R, Q, S, SQ)

        Returns:
            Cache key string
        """
        return f"{year}_R{round_number}_{session_type}"

    def _get_cache_path(self, cache_key: str, extension: str = "pkl") -> Path:
        """
        Get the file path for a cache key

        Args:
            cache_key: Cache key
            extension: File extension (pkl, json)

        Returns:
            Path to cache file
        """
        return self.cache_dir / f"{cache_key}_telemetry.{extension}"

    def exists(self, year: int, round_number: int, session_type: str) -> bool:
        """
        Check if cached data exists for a session

        Args:
            year: Season year
            round_number: Round number
            session_type: Session type

        Returns:
            True if cache exists
        """
        cache_key = self._generate_cache_key(year, round_number, session_type)
        cache_path = self._get_cache_path(cache_key)
        return cache_path.exists()

    def get(self, year: int, round_number: int, session_type: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached data for a session

        Args:
            year: Season year
            round_number: Round number
            session_type: Session type

        Returns:
            Cached data dictionary or None if not found
        """
        cache_key = self._generate_cache_key(year, round_number, session_type)
        cache_path = self._get_cache_path(cache_key)

        if not cache_path.exists():
            logger.debug(f"Cache miss: {cache_key}")
            return None

        try:
            with open(cache_path, "rb") as f:
                data = pickle.load(f)

            logger.info(f"Cache hit: {cache_key}")
            return data

        except Exception as e:
            logger.error(f"Error loading cache {cache_key}: {e}")
            return None

    def set(self, year: int, round_number: int, session_type: str, data: Dict[str, Any]) -> bool:
        """
        Store data in cache

        Args:
            year: Season year
            round_number: Round number
            session_type: Session type
            data: Data to cache

        Returns:
            True if successful
        """
        cache_key = self._generate_cache_key(year, round_number, session_type)
        cache_path = self._get_cache_path(cache_key)

        try:
            logger.info(f"Attempting to cache to: {cache_path}")
            logger.info(f"Cache directory exists: {self.cache_dir.exists()}")

            with open(cache_path, "wb") as f:
                pickle.dump(data, f, protocol=pickle.HIGHEST_PROTOCOL)

            logger.info(f"Cached data: {cache_key}")
            return True

        except Exception as e:
            logger.error(f"Error caching data {cache_key}: {e}")
            return False

    def delete(self, year: int, round_number: int, session_type: str) -> bool:
        """
        Delete cached data for a session

        Args:
            year: Season year
            round_number: Round number
            session_type: Session type

        Returns:
            True if successful
        """
        cache_key = self._generate_cache_key(year, round_number, session_type)
        cache_path = self._get_cache_path(cache_key)

        try:
            if cache_path.exists():
                cache_path.unlink()
                logger.info(f"Deleted cache: {cache_key}")
                return True
            return False

        except Exception as e:
            logger.error(f"Error deleting cache {cache_key}: {e}")
            return False

    def clear_all(self) -> int:
        """
        Clear all cached data

        Returns:
            Number of files deleted
        """
        count = 0
        try:
            for cache_file in self.cache_dir.glob("*_telemetry.pkl"):
                cache_file.unlink()
                count += 1

            logger.info(f"Cleared {count} cache files")
            return count

        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return count

    def get_cache_info(
        self, year: int, round_number: int, session_type: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get metadata about cached data

        Args:
            year: Season year
            round_number: Round number
            session_type: Session type

        Returns:
            Dictionary with cache metadata or None
        """
        cache_key = self._generate_cache_key(year, round_number, session_type)
        cache_path = self._get_cache_path(cache_key)

        if not cache_path.exists():
            return None

        try:
            stat = cache_path.stat()
            return {
                "exists": True,
                "size_bytes": stat.st_size,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "cache_key": cache_key,
            }

        except Exception as e:
            logger.error(f"Error getting cache info {cache_key}: {e}")
            return None

    def list_cached_sessions(self) -> List[Dict[str, Any]]:
        """
        List all cached sessions

        Returns:
            List of dictionaries with cache information
        """
        cached_sessions = []

        try:
            for cache_file in self.cache_dir.glob("*_telemetry.pkl"):
                parts = cache_file.stem.replace("_telemetry", "").split("_")

                if len(parts) >= 3:
                    year = int(parts[0])
                    round_num = int(parts[1].replace("R", ""))
                    session_type = parts[2]

                    info = self.get_cache_info(year, round_num, session_type)
                    if info:
                        info.update(
                            {
                                "year": year,
                                "round": round_num,
                                "session_type": session_type,
                            }
                        )
                        cached_sessions.append(info)

            cached_sessions.sort(key=lambda x: (x["year"], x["round"]))
            return cached_sessions

        except Exception as e:
            logger.error(f"Error listing cached sessions: {e}")
            return []

    def is_stale(
        self, year: int, round_number: int, session_type: str, max_age_days: int = 30
    ) -> bool:
        """
        Check if cached data is stale

        Args:
            year: Season year
            round_number: Round number
            session_type: Session type
            max_age_days: Maximum age in days before considering stale

        Returns:
            True if cache is stale or doesn't exist
        """
        info = self.get_cache_info(year, round_number, session_type)

        if not info:
            return True

        try:
            modified = datetime.fromisoformat(info["modified"])
            age = datetime.now() - modified
            return age > timedelta(days=max_age_days)

        except Exception:
            return True

    def get_fastf1_cache_dir(self) -> str:
        """
        Get the FastF1 cache directory path

        Returns:
            Path to FastF1 cache directory
        """
        return str(self.fastf1_cache_dir)


_cache_manager: Optional[CacheManager] = None


def get_cache_manager() -> CacheManager:
    """
    Get the global cache manager instance

    Returns:
        CacheManager instance
    """
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager()
    return _cache_manager
