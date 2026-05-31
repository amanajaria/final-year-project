"""
Defensive helpers for API responses — always return lists and safe scalar defaults.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Callable, Iterable, List, Optional, TypeVar

T = TypeVar("T")


def as_list(value: Optional[Iterable[T]]) -> List[T]:
    """Coerce ORM scalars / None into a plain list for JSON serialization."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    try:
        return list(value)
    except TypeError:
        return []


def safe_attr(obj: Any, attr: str, default: Any = None) -> Any:
    """Read an attribute without raising if obj is None."""
    if obj is None:
        return default
    return getattr(obj, attr, default)


def serialize_numeric(val: Any) -> Optional[float]:
    """Convert Decimal / numeric DB values to float for JSON; None stays None."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, Decimal):
        return float(val)
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def iso_or_none(val: Any) -> Optional[str]:
    """Serialize datetime/date to ISO string, or None."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, date):
        return val.isoformat()
    return str(val)


def map_serialized(
    items: Optional[Iterable[T]],
    serializer: Callable[[T], Any],
    *,
    skip_none: bool = True,
) -> List[Any]:
    """Map a sequence through serializer, optionally dropping None results."""
    out: List[Any] = []
    for item in as_list(items):
        if item is None:
            continue
        try:
            row = serializer(item)
        except Exception:
            continue
        if skip_none and row is None:
            continue
        out.append(row)
    return out


def serialize_group_request(g: Any, *, is_member: bool = False) -> dict:
    """Stable JSON dict for GroupRequest rows."""
    if g is None:
        return {}
    return {
        "id": safe_attr(g, "id"),
        "name": safe_attr(g, "name") or "",
        "description": safe_attr(g, "description"),
        "created_by_name": safe_attr(g, "created_by_name") or "",
        "num_students": safe_attr(g, "num_students") or 0,
        "status": safe_attr(g, "status") or "PENDING",
        "is_permanent": bool(safe_attr(g, "is_permanent", False)),
        "is_member": is_member,
        "created_at": iso_or_none(safe_attr(g, "created_at")),
        "deleted_by_name": safe_attr(g, "deleted_by_name"),
        "deleted_at": iso_or_none(safe_attr(g, "deleted_at")),
    }
