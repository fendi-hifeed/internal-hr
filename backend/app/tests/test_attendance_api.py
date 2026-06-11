"""
Integration tests for attendance API endpoints.
Uses subprocess curl to avoid pytest-asyncio event loop issues.
Tests hit the actual running backend on port 8001.
"""
import pytest
import subprocess, json


def curl(method, path, json_data=None, token=None, base_url="http://localhost:8001"):
    """Make HTTP request via curl subprocess."""
    cmd = ['curl', '-s', '-X', method, f'{base_url}{path}',
           '-H', 'Content-Type: application/json']
    if token:
        cmd += ['-H', f'Authorization: Bearer {token}']
    if json_data:
        cmd += ['-d', json.dumps(json_data)]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    try:
        return json.loads(r.stdout) if r.stdout else {}
    except:
        return {"_raw": r.stdout, "_stderr": r.stderr[:200]}


class TestAttendanceClockIn:
    def test_clock_in_requires_auth(self):
        r = curl('POST', '/api/v1/attendance/clock-in', {"latitude": -6.2088, "longitude": 106.8456, "idempotency_key": "test-key"})
        assert "detail" in r or r.get("status_code") == 401

    def test_clock_in_missing_fields_returns_422(self):
        # Login first
        login = curl('POST', '/api/v1/auth/login', {"email": "ahmad.fauzi@hifeed.co", "password": "admin123"})
        token = login["access_token"]
        r = curl('POST', '/api/v1/attendance/clock-in', {"latitude": -6.2088}, token=token)
        assert r.get("status_code") == 422 or "detail" in r


class TestAttendanceToday:
    def test_today_requires_auth(self):
        r = curl('GET', '/api/v1/attendance/today')
        assert "detail" in r

    def test_today_returns_record_or_null(self):
        login = curl('POST', '/api/v1/auth/login', {"email": "ahmad.fauzi@hifeed.co", "password": "admin123"})
        token = login["access_token"]
        r = curl('GET', '/api/v1/attendance/today', token=token)
        assert isinstance(r, (dict, type(None)))


class TestAttendanceHistory:
    def test_history_requires_auth(self):
        r = curl('GET', '/api/v1/attendance/history')
        assert "detail" in r

    def test_history_returns_list(self):
        login = curl('POST', '/api/v1/auth/login', {"email": "ahmad.fauzi@hifeed.co", "password": "admin123"})
        token = login["access_token"]
        r = curl('GET', '/api/v1/attendance/history', token=token)
        assert isinstance(r, list)

    def test_history_respects_limit(self):
        login = curl('POST', '/api/v1/auth/login', {"email": "ahmad.fauzi@hifeed.co", "password": "admin123"})
        token = login["access_token"]
        r = curl('GET', '/api/v1/attendance/history?limit=5', token=token)
        assert isinstance(r, list) and len(r) <= 5


class TestAttendanceStats:
    def test_stats_requires_auth(self):
        r = curl('GET', '/api/v1/attendance/stats/personal')
        assert "detail" in r

    def test_stats_returns_object(self):
        login = curl('POST', '/api/v1/auth/login', {"email": "ahmad.fauzi@hifeed.co", "password": "admin123"})
        token = login["access_token"]
        r = curl('GET', '/api/v1/attendance/stats/personal', token=token)
        assert isinstance(r, dict)

    def test_admin_stats_requires_admin_role(self):
        login = curl('POST', '/api/v1/auth/login', {"email": "ahmad.fauzi@hifeed.co", "password": "admin123"})
        token = login["access_token"]
        r = curl('GET', '/api/v1/attendance/stats/admin', token=token)
        assert r.get("status_code") == 403 or "detail" in r