# Mapping of tyre compound names to their integer IDs used throughout the
# telemetry pipeline and the frontend renderer.
# The integer values must stay in sync with the TYRE_COMPOUNDS constant in
# the TypeScript client (src/components/Dashboard/Leaderboard/index.tsx).
tyre_compounds_ints: dict[str, int] = {
    "SOFT":         0,
    "MEDIUM":       1,
    "HARD":         2,
    "INTERMEDIATE": 3,
    "WET":          4,
}


def get_tyre_compound_int(compound_str: str) -> int:
    """
    Convert a tyre compound name to its integer ID.

    The lookup is case-insensitive. Returns ``-1`` for any compound name that
    is not present in ``tyre_compounds_ints`` (e.g. ``"UNKNOWN"`` or an empty
    string), so callers can treat negative values as a sentinel for missing data.
    """
    return int(tyre_compounds_ints.get(compound_str.upper(), -1))


def get_tyre_compound_str(compound_int: int) -> str:
    """
    Convert a tyre compound integer ID back to its canonical name.

    Performs a linear scan of ``tyre_compounds_ints`` and returns the first
    key whose value matches ``compound_int``.
    """
    for k, v in tyre_compounds_ints.items():
        if v == compound_int:
            return k
    return "UNKNOWN"