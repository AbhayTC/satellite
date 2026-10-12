"""pytest configuration and fixtures."""
import pytest


# Enable asyncio for pytest-asyncio
def pytest_configure(config):
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )
