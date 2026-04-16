import re
from typing import Optional


def format_time(seconds: float) -> str:
    """
    Convert a duration in seconds to a human-readable MM:SS.sss string.

    Args:
        seconds: Total duration in seconds. Must be non-negative.

    Returns:
        A zero-padded string in the form ``"MM:SS.sss"`` (e.g. ``"01:26.123"``).
        Returns ``"N/A"`` when ``seconds`` is ``None`` or negative.

    Examples:
        >>> format_time(86.123)
        '01:26.123'
        >>> format_time(-1)
        'N/A'
    """
    if seconds is None or seconds < 0:
        return "N/A"
    minutes = int(seconds // 60)
    secs = seconds % 60
    return f"{minutes:02}:{secs:06.3f}"


def parse_time_string(time_str: str) -> Optional[float]:
    """
    Parse a time string from one of several FastF1 / pandas formats and return
    the equivalent duration in seconds.

    Supported input formats:
        - ``"0 days 00:01:26.123000"``  — pandas ``Timedelta`` str representation
        - ``"00:01:26:123000"``          — HH:MM:SS:microseconds (colon-separated)
        - ``"00:01:26.123000"``          — HH:MM:SS.microseconds (dot-separated)
        - ``"01:26.123"``               — MM:SS.milliseconds
        - ``"01:26"``                   — MM:SS (no sub-second component)

    The function handles format ambiguity in the three-part case (``A:B:C``) by
    inspecting the length of the final token: if it has more than two characters
    it is treated as a microsecond value (``MM:SS:micro``), otherwise as whole
    seconds (``HH:MM:SS``).

    Args:
        time_str: The raw time string to parse. May be a ``str``, a pandas
            ``Timedelta``, or any object whose ``str()`` representation matches
            one of the supported formats.

    Returns:
        Total duration in seconds rounded to three decimal places, or ``None``
        if the input is empty, ``None``, or does not match any recognised format.

    Examples:
        >>> parse_time_string("01:26.123")
        86.123
        >>> parse_time_string("0 days 00:01:27.060000")
        87.06
        >>> parse_time_string("")
        None
    """
    # Strip the "X days " prefix produced by pandas Timedelta.__str__
    if "days" in str(time_str):
        time_str = str(time_str).split(" ", 2)[-1]
    else:
        time_str = str(time_str).split(" ")[0]

    if time_str is None:
        return None

    s = str(time_str).strip()
    if s == "":
        return None

    # Tokenise on both colons and dots so all separator variants are handled uniformly
    parts = re.split(r"[:.]", s)

    hh = 0
    micro = 0

    try:
        if len(parts) == 4:
            # Unambiguous: HH:MM:SS:micro or HH:MM:SS.micro
            hh, mm, ss, micro = parts
        elif len(parts) == 3:
            # Ambiguous three-part string: distinguish MM:SS:micro from HH:MM:SS
            # by checking whether the last token exceeds two digits (i.e. is sub-second)
            if len(parts[2]) > 2:
                mm, ss, micro = parts
            else:
                hh, mm, ss = parts
        elif len(parts) == 2:
            # Simplest case: MM:SS with no sub-second component
            mm, ss = parts
        else:
            return None

        hh = int(hh)
        mm = int(mm)
        ss = int(ss)

        # Normalise the microsecond token to exactly six digits before converting:
        # truncate if longer, left-pad with zeros on the right if shorter.
        micro = (
            int(str(micro)[:6].ljust(6, "0"))
            if micro is not None and str(micro) != ""
            else 0
        )

        total_seconds = hh * 3600 + mm * 60 + ss + micro / 1_000_000.0
        return round(total_seconds, 3)

    except Exception as e:
        print(f"Exception in parse_time_string: {e} (input: {time_str!r})")
        return None