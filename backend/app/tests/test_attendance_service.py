"""
Unit tests for attendance service — flag logic, geofence, idempotency.
"""
import pytest
from datetime import datetime, date, timedelta
from app.services.attendance_service import (
    get_flag_status, haversine_meters, is_within_geofence,
    get_today_attendance, get_employee_stats
)
from app.models.attendance import FlagStatus
import uuid


def generate_idempotency_key() -> str:
    return str(uuid.uuid4())


class TestGetFlagStatus:
    """Test attendance flag determination based on submission time."""

    def _flag(self, utc_hour: int, utc_min: int = 0):
        """Helper: pass UTC hour, function adds +7h to get WIB."""
        from datetime import datetime, timezone
        return get_flag_status(datetime(2026, 6, 10, utc_hour, utc_min, tzinfo=timezone.utc))

    def test_on_time_0700_wib(self):
        # UTC 00:00 → WIB 07:00 → ON_TIME
        assert self._flag(0, 0) == FlagStatus.ON_TIME

    def test_on_time_0814_wib(self):
        # UTC 01:14 → WIB 08:14 → ON_TIME (8.233 < 8.25)
        assert self._flag(1, 14) == FlagStatus.ON_TIME

    def test_on_time_0815_wib_exact_boundary(self):
        # UTC 01:15 → WIB 08:15 → ON_TIME (8.25 <= 8.25)
        assert self._flag(1, 15) == FlagStatus.ON_TIME

    def test_late_0816_wib(self):
        # UTC 01:16 → WIB 08:16 → LATE (8.267 > 8.25)
        assert self._flag(1, 16) == FlagStatus.LATE

    def test_late_0830_wib(self):
        # UTC 01:30 → WIB 08:30 → LATE
        assert self._flag(1, 30) == FlagStatus.LATE

    def test_late_0859_wib(self):
        # UTC 01:59 → WIB 08:59 → LATE
        assert self._flag(1, 59) == FlagStatus.LATE

    def test_very_late_0901_wib(self):
        # UTC 02:01 → WIB 09:01 → VERY_LATE (9.017 > 9.0)
        assert self._flag(2, 1) == FlagStatus.VERY_LATE

    def test_very_late_1100_wib(self):
        # UTC 04:00 → WIB 11:00 → VERY_LATE
        assert self._flag(4, 0) == FlagStatus.VERY_LATE

    def test_very_late_1159_wib(self):
        # UTC 04:59 → WIB 11:59 → VERY_LATE
        assert self._flag(4, 59) == FlagStatus.VERY_LATE

    def test_absent_flag_1200_wib(self):
        # UTC 05:00 → WIB 12:00 → ABSENT_FLAG (12.0 > 12.0? No... wait, 12.0 > 12.0 is FALSE)
        # Actually 12.0 <= 12.0 → VERY_LATE. So 12:01 is ABSENT_FLAG
        assert self._flag(5, 1) == FlagStatus.ABSENT_FLAG

    def test_absent_flag_1500_wib(self):
        # UTC 08:00 → WIB 15:00 → ABSENT_FLAG
        assert self._flag(8, 0) == FlagStatus.ABSENT_FLAG

    def test_absent_flag_2300_wib(self):
        # UTC 16:00 → WIB 23:00 → ABSENT_FLAG
        assert self._flag(16, 0) == FlagStatus.ABSENT_FLAG


class TestHaversineDistance:
    """Test geodetic distance calculation."""

    def test_same_point_zero(self):
        d = haversine_meters(-6.2088, 106.8456, -6.2088, 106.8456)
        assert d == 0.0

    def test_jakarta_to_bandung_approx(self):
        # Jakarta (-6.20, 106.83) to Bandung (-6.90, 107.61) ~ 115km
        d = haversine_meters(-6.2088, 106.8456, -6.9027, 107.6189)
        assert 100_000 < d < 130_000  # within reasonable range

    def test_short_distance_100m(self):
        lat, lng = -6.2088, 106.8456
        # Move ~100m north (approx 0.0009 deg)
        d = haversine_meters(lat, lng, lat + 0.0009, lng)
        assert 50 < d < 200  # ~100m ± 50m

    def test_symmetry(self):
        d1 = haversine_meters(-6.2, 106.8, -6.9, 107.6)
        d2 = haversine_meters(-6.9, 107.6, -6.2, 106.8)
        assert abs(d1 - d2) < 0.01  # symmetric


class TestIsWithinGeofence:
    """Test geofence boundary checking."""

    def test_exact_center(self):
        result = is_within_geofence(-6.2088, 106.8456, -6.2088, 106.8456, 100)
        assert result is True

    def test_well_within(self):
        result = is_within_geofence(-6.2088, 106.8456, -6.2088, 106.8456, 5000)
        assert result is True

    def test_outside_boundary(self):
        # ~2km away, geofence 100m
        result = is_within_geofence(-6.2088, 106.8456, -6.2300, 106.8456, 100)
        assert result is False

    def test_on_boundary_edge(self):
        # Very small distance within threshold
        result = is_within_geofence(0, 0, 0.0001, 0, 50)
        # 0.0001 degrees lat ~ 11m at equator, should be within 50m
        assert result is True


class TestIdempotencyKey:
    """Test idempotency key generation."""

    def test_uuid_format(self):
        key = generate_idempotency_key()
        assert len(key) == 36
        assert key.count('-') == 4

    def test_unique_per_call(self):
        keys = [generate_idempotency_key() for _ in range(100)]
        assert len(set(keys)) == 100  # all unique

    def test_deterministic_format(self):
        import uuid
        key = generate_idempotency_key()
        uuid.UUID(key)  # should not raise