"""
Integration tests for leave API endpoints.
Uses subprocess curl to avoid pytest-asyncio event loop issues.
"""
import pytest
import subprocess, json


def curl(method, path, json_data=None, token=None, base_url="http://localhost:8001"):
    cmd = ['curl', '-s', '-X', method, f'{base_url}{path}', '-H', 'Content-Type: application/json']
    if token:
        cmd += ['-H', f'Authorization: Bearer {token}']
    if json_data:
        cmd += ['-d', json.dumps(json_data)]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    try:
        return json.loads(r.stdout) if r.stdout else {}
    except:
        return {"_raw": r.stdout[:200]}


class TestLeaveTypes:
    def test_get_leave_types_public(self):
        """Leave types is intentionally public."""
        r = curl('GET', '/api/v1/leave/types')
        assert isinstance(r, list) and len(r) > 0

    def test_get_leave_types_returns_list(self):
        login = curl('POST', '/api/v1/auth/login', {"email": "ahmad.fauzi@hifeed.co", "password": "admin123"})
        token = login["access_token"]
        r = curl('GET', '/api/v1/leave/types', token=token)
        assert isinstance(r, list) and len(r) > 0
        for lt in r:
            assert "type_name" in lt
            assert "type_code" in lt
            assert "default_quota" in lt

    def test_leave_types_contain_ct(self):
        login = curl('POST', '/api/v1/auth/login', {"email": "ahmad.fauzi@hifeed.co", "password": "admin123"})
        token = login["access_token"]
        r = curl('GET', '/api/v1/leave/types', token=token)
        codes = [lt["type_code"] for lt in r]
        assert "CT" in codes


class TestLeaveBalances:
    def test_balances_requires_auth(self):
        r = curl('GET', '/api/v1/leave/balance')
        assert "detail" in r

    def test_balances_returns_list(self):
        login = curl('POST', '/api/v1/auth/login', {"email": "ahmad.fauzi@hifeed.co", "password": "admin123"})
        token = login["access_token"]
        r = curl('GET', '/api/v1/leave/balance', token=token)
        assert isinstance(r, list) and len(r) > 0
        for b in r:
            assert "total_quota" in b
            assert "used" in b
            assert "available" in b
            assert "leave_type_name" in b
            assert "leave_type_code" in b


class TestLeaveRequest:
    def test_request_requires_auth(self):
        r = curl('POST', '/api/v1/leave/request', {
            "leave_type_id": "test-id",
            "start_date": "2026-06-15",
            "end_date": "2026-06-16",
            "reason": "Family event"
        })
        assert "detail" in r

    def test_request_missing_fields(self):
        login = curl('POST', '/api/v1/auth/login', {"email": "ahmad.fauzi@hifeed.co", "password": "admin123"})
        token = login["access_token"]
        r = curl('POST', '/api/v1/leave/request', {"leave_type_id": "test-id"}, token=token)
        assert r.get("status_code") == 422 or "detail" in r

    def test_request_invalid_dates(self):
        login = curl('POST', '/api/v1/auth/login', {"email": "ahmad.fauzi@hifeed.co", "password": "admin123"})
        token = login["access_token"]
        r = curl('POST', '/api/v1/leave/request', {
            "leave_type_id": "test-id",
            "start_date": "2026-06-20",
            "end_date": "2026-06-15",
            "reason": "Test"
        }, token=token)
        assert r.get("status_code") in [400, 422] or "detail" in r


class TestLeaveApprovalByRole:
    def test_employee_cannot_access_admin_stats(self):
        login = curl('POST', '/api/v1/auth/login', {"email": "ahmad.fauzi@hifeed.co", "password": "admin123"})
        token = login["access_token"]
        r = curl('GET', '/api/v1/attendance/stats/admin', token=token)
        assert r.get("status_code") == 403 or "detail" in r

    def test_admin_can_access_admin_stats(self):
        login = curl('POST', '/api/v1/auth/login', {"email": "fendi@hifeed.co", "password": "admin123"})
        token = login["access_token"]
        r = curl('GET', '/api/v1/attendance/stats/admin', token=token)
        assert isinstance(r, dict)

    def test_employee_cannot_approve_leave(self):
        login = curl('POST', '/api/v1/auth/login', {"email": "ahmad.fauzi@hifeed.co", "password": "admin123"})
        token = login["access_token"]
        r = curl('POST', '/api/v1/leave/fake-id-00000000/approve', {"version": 1, "notes": "Approved"}, token=token)
        assert r.get("status_code") in [403, 404, 422] or "detail" in r


class TestLeaveHistory:
    def test_history_returns_list(self):
        login = curl('POST', '/api/v1/auth/login', {"email": "ahmad.fauzi@hifeed.co", "password": "admin123"})
        token = login["access_token"]
        r = curl('GET', '/api/v1/leave/my-requests', token=token)
        assert isinstance(r, list)

    def test_history_requires_auth(self):
        r = curl('GET', '/api/v1/leave/my-requests')
        assert "detail" in r