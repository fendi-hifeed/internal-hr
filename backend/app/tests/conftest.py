"""
Pytest configuration — integration tests use inline client creation (no fixtures).
Service/unit tests have no dependencies.
"""
import pytest
import asyncio


@pytest.fixture(scope="session")
def event_loop_policy():
    """Set event loop policy before any tests run."""
    return asyncio.DefaultEventLoopPolicy()


pytest_plugins = []