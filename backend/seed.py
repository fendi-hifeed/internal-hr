"""
Seed database with initial data.
Admin: fendi@hifeed.co (NOT fendi@hifeed.com)
"""
import asyncio
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select, text
from app.db.session import async_session, engine, init_db
from app.core.security import hash_password
from app.models import (
    User, UserRole,
    LeaveType, LeaveBalance, QuotaUnit,
    GeoZone, GeoZoneType,
    AttendanceLog, FlagStatus,
)


async def seed():
    await init_db()

    async with async_session() as db:
        # Check if already seeded
        result = await db.execute(select(User).limit(1))
        if result.scalar_one_or_none():
            print("Database already seeded. Skipping.")
            return

        print("Seeding database...")

        # === Create Leave Types ===
        leave_types_data = [
            {
                "type_name": "Cuti Tahunan",
                "type_code": "CT",
                "default_quota": 12,
                "quota_unit": QuotaUnit.DAYS,
                "carry_over_enabled": True,
                "carry_over_max": 6,
                "requires_attachment": False,
                "min_notice_days": 7,
                "approval_level": "DOUBLE",
                "is_active": True,
                "color_code": "#3B82F6",
                "description": "Cuti tahunan reguler",
            },
            {
                "type_name": "Sakit",
                "type_code": "S",
                "default_quota": 14,
                "quota_unit": QuotaUnit.DAYS,
                "carry_over_enabled": False,
                "requires_attachment": True,
                "min_notice_days": 0,
                "approval_level": "SINGLE",
                "is_active": True,
                "color_code": "#EF4444",
                "description": "Cuti sakit dengan surat dokter",
            },
            {
                "type_name": "Izin Khusus",
                "type_code": "IK",
                "default_quota": 3,
                "quota_unit": QuotaUnit.DAYS,
                "carry_over_enabled": False,
                "requires_attachment": False,
                "min_notice_days": 1,
                "approval_level": "SINGLE",
                "is_active": True,
                "color_code": "#F59E0B",
                "description": "Izin khusus (urgent matter)",
            },
            {
                "type_name": "Cuti Besar",
                "type_code": "CB",
                "default_quota": 30,
                "quota_unit": QuotaUnit.DAYS,
                "carry_over_enabled": False,
                "requires_attachment": False,
                "min_notice_days": 14,
                "approval_level": "MANAGEMENT",
                "is_active": True,
                "color_code": "#8B5CF6",
                "description": "Cuti besar/maternity",
            },
        ]

        leave_types = []
        for data in leave_types_data:
            lt = LeaveType(**data)
            db.add(lt)
            leave_types.append(lt)

        await db.flush()
        print(f"Created {len(leave_types)} leave types")

        # === Create Users ===
        # HR Admin: fendi@hifeed.co
        admin = User(
            id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            name="Fendi",
            email="fendi@hifeed.co",
            hashed_password=hash_password("admin123"),
            role=UserRole.HR_ADMIN,
            department="IT & HR",
            join_date=datetime(2024, 1, 1),
            is_active=True,
        )
        db.add(admin)

        # Employees
        employees_data = [
            {"name": "Dewi Kartika Sari", "email": "dewi.kartika@hifeed.co", "dept": "Human Resources"},
            {"name": "Ahmad Fauzi", "email": "ahmad.fauzi@hifeed.co", "dept": "Engineering"},
            {"name": "Rina Wulandari", "email": "rina.wulandari@hifeed.co", "dept": "Marketing"},
            {"name": "Budi Santoso", "email": "budi.santoso@hifeed.co", "dept": "Finance"},
            {"name": "Siti Aminah", "email": "siti.aminah@hifeed.co", "dept": "Operations"},
            {"name": "Joko Widodo", "email": "joko.widodo@hifeed.co", "dept": "Engineering"},
            {"name": "Maya Putri", "email": "maya.putri@hifeed.co", "dept": "Product"},
        ]

        employees = []
        for i, emp_data in enumerate(employees_data):
            emp = User(
                id=uuid.UUID(f"00000000-0000-0000-0000-{(i+2):012d}"),
                name=emp_data["name"],
                email=emp_data["email"],
                hashed_password=hash_password("admin123"),
                role=UserRole.EMPLOYEE,
                department=emp_data["dept"],
                supervisor_id=admin.id,
                join_date=datetime(2024, 1, 1) + timedelta(days=i * 30),
                is_active=True,
            )
            db.add(emp)
            employees.append(emp)

        await db.flush()
        print(f"Created 1 admin + {len(employees)} employees")

        # === Create Leave Balances for all users ===
        year = date.today().year
        all_users = [admin] + employees

        for user in all_users:
            for lt in leave_types:
                balance = LeaveBalance(
                    employee_id=user.id,
                    leave_type_id=lt.id,
                    total_quota=lt.default_quota,
                    used=0,
                    pending=0,
                    quota_year=year,
                )
                db.add(balance)

        print(f"Created leave balances for {len(all_users)} users")

        # === Create Geo Zones ===
        geo_zones_data = [
            {
                "zone_name": "Kantor Utama HiFeed",
                "zone_type": GeoZoneType.OFFICE,
                "latitude": -6.2088,
                "longitude": 106.8456,
                "radius_meters": 100,
                "address": "Jl. Sudirman No. 123, Jakarta Selatan",
                "is_active": True,
            },
            {
                "zone_name": "Kantor Cab. Bandung",
                "zone_type": GeoZoneType.BRANCH,
                "latitude": -6.9175,
                "longitude": 107.6191,
                "radius_meters": 100,
                "address": "Jl. Asia Afrika No. 45, Bandung",
                "is_active": True,
            },
            {
                "zone_name": "Remote Work Zone",
                "zone_type": GeoZoneType.REMOTE,
                "latitude": -6.2000,
                "longitude": 106.8000,
                "radius_meters": 1000,
                "address": "Jakarta Area",
                "is_active": True,
            },
        ]

        for data in geo_zones_data:
            gz = GeoZone(**data)
            db.add(gz)

        print(f"Created {len(geo_zones_data)} geo zones")

        # === Create Sample Attendance Logs ===
        today = date.today()
        for emp in employees[:5]:
            for days_ago in range(1, 15):
                d = today - timedelta(days=days_ago)
                if d.weekday() >= 5:
                    continue  # Skip weekends

                # Random status
                import random
                rand = random.random()
                if rand < 0.8:
                    flag = FlagStatus.ON_TIME
                    clock_in_hour = random.randint(7, 8)
                    clock_in_min = random.randint(0, 14)
                elif rand < 0.95:
                    flag = FlagStatus.LATE
                    clock_in_hour = random.randint(8, 9)
                    clock_in_min = random.randint(0, 59)
                else:
                    flag = FlagStatus.VERY_LATE
                    clock_in_hour = random.randint(9, 11)
                    clock_in_min = random.randint(0, 59)

                clock_in = datetime(d.year, d.month, d.day, clock_in_hour, clock_in_min)
                clock_out = datetime(d.year, d.month, d.day, 17, random.randint(0, 15))

                log = AttendanceLog(
                    employee_id=emp.id,
                    date=d,
                    clock_in_time=clock_in,
                    clock_in_flag=flag,
                    clock_in_latitude=-6.2088,
                    clock_in_longitude=106.8456,
                    clock_in_location_name="Kantor Utama HiFeed",
                    clock_out_time=clock_out,
                    clock_out_latitude=-6.2088,
                    clock_out_longitude=106.8456,
                    clock_out_location_name="Kantor Utama HiFeed",
                )
                db.add(log)

        print("Created sample attendance logs")

        await db.commit()
        print("Seed complete!")


if __name__ == "__main__":
    asyncio.run(seed())
