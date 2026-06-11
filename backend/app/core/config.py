from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "HiFeed HR Presensi"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://hifeed_openclaw:admin123@localhost:5432/hr_presensi"
    DATABASE_URL_SYNC: str = "postgresql://hifeed_openclaw:admin123@localhost:5432/hr_presensi"

    # JWT
    SECRET_KEY: str = "hifeed-hr-presensi-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480   # 8 hours — standard workday
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Attendance Window (WIB = UTC+7)
    CLOCK_IN_START_HOUR: int = 6   # 06:00 WIB
    CLOCK_IN_END_HOUR: int = 12   # 12:00 WIB - after this = ABSENT_FLAG
    ON_TIME_CUTOFF_HOUR: float = 8.25  # 08:15 WIB
    LATE_CUTOFF_HOUR: float = 9.0     # 09:00 WIB
    AUTO_LOGOUT_HOUR: int = 17  # 17:00 WIB

    # Security
    MIN_PASSWORD_LENGTH: int = 8
    MAX_SESSION_PER_USER: int = 1
    SESSION_INACTIVITY_MINUTES: int = 30

    # Geo-fence
    DEFAULT_GEO_RADIUS_METERS: int = 100
    MIN_GPS_ACCURACY_METERS: int = 50

    # Photo
    MAX_PHOTO_SIZE_MB: int = 2
    MIN_PHOTO_DIMENSION: int = 640

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()