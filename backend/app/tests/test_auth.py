"""
Unit tests for authentication endpoints.
Uses subprocess curl to avoid pytest-asyncio async context issues.
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
        return {"_raw": r.stdout[:300], "_stderr": r.stderr[:200]}


def get_token(email, password):
    r = curl('POST', '/api/v1/auth/login', {"email": email, "password": password})
    return r.get("access_token")


class TestAuthLogin:
    def test_login_valid_admin(self):
        r = curl('POST', '/api/v1/auth/login', {"email": "fendi@hifeed.co", "password": "admin123"})
        assert "access_token" in r
        assert "refresh_token" in r
        assert r["user"]["email"] == "fendi@hifeed.co"
        assert r["user"]["role"] == "HR_ADMIN"

    def test_login_valid_employee(self):
        r = curl('POST', '/api/v1/auth/login', {"email": "ahmad.fauzi@hifeed.co", "password": "admin123"})
        assert "access_token" in r
        assert r["user"]["role"] == "EMPLOYEE"

    def test_login_wrong_password(self):
        r = curl('POST', '/api/v1/auth/login', {"email": "fendi@hifeed.co", "password": "wrongpassword"})
        assert "detail" in r

    def test_login_nonexistent_user(self):
        r = curl('POST', '/api/v1/auth/login', {"email": "nobody@nowhere.com", "password": "admin123"})
        assert "detail" in r

    def test_login_invalid_email_format(self):
        r = curl('POST', '/api/v1/auth/login', {"email": "not-an-email", "password": "admin123"})
        assert "detail" in r

    def test_login_empty_body(self):
        r = curl('POST', '/api/v1/auth/login', {})
        assert "detail" in r

    def test_login_missing_password(self):
        r = curl('POST', '/api/v1/auth/login', {"email": "fendi@hifeed.co"})
        assert "detail" in r


class TestAuthMe:
    def test_me_valid_token(self):
        token = get_token("fendi@hifeed.co", "admin123")
        r = curl('GET', '/api/v1/auth/me', token=token)
        assert r["email"] == "fendi@hifeed.co"
        assert r["role"] == "HR_ADMIN"
        assert "hashed_password" not in r
        assert "password" not in r

    def test_me_no_token(self):
        r = curl('GET', '/api/v1/auth/me')
        assert "detail" in r

    def test_me_invalid_token(self):
        r = curl('GET', '/api/v1/auth/me', token="invalid.token.here")
        assert "detail" in r

    def test_me_malformed_header(self):
        r = curl('GET', '/api/v1/auth/me', token="NotBearer sometoken")
        assert "detail" in r


class TestAuthRefresh:
    def test_refresh_valid_token(self):
        login = curl('POST', '/api/v1/auth/login', {"email": "fendi@hifeed.co", "password": "admin123"})
        refresh = login["refresh_token"]
        r = curl('POST', '/api/v1/auth/refresh', {"refresh_token": refresh})
        assert "access_token" in r
        assert r["access_token"]  # non-empty
        assert r.get("token_type") == "bearer"

    def test_refresh_invalid_token(self):
        r = curl('POST', '/api/v1/auth/refresh', {"refresh_token": "invalid.refresh.token"})
        assert "detail" in r