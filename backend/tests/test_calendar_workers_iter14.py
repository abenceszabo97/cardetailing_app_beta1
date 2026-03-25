"""
Test Calendar and Workers features - Iteration 14
Tests: Attendance PDF API, Leave Stats API, Shift Type support
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestShiftTypeAndAttendance:
    """Tests for shift_type field and attendance/leave APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        
        # Get a worker for testing
        workers_res = self.session.get(f"{BASE_URL}/api/workers")
        assert workers_res.status_code == 200
        workers = workers_res.json()
        if workers:
            self.worker_id = workers[0]["worker_id"]
            self.worker_name = workers[0]["name"]
        else:
            pytest.skip("No workers available for testing")
        
        yield
        
        # Cleanup: Delete test shifts created during tests
        shifts_res = self.session.get(f"{BASE_URL}/api/shifts")
        if shifts_res.status_code == 200:
            for shift in shifts_res.json():
                if "TEST_" in shift.get("worker_name", "") or shift.get("shift_id", "").startswith("shft_test"):
                    self.session.delete(f"{BASE_URL}/api/shifts/{shift['shift_id']}")
    
    def test_create_shift_with_normal_type(self):
        """Test creating a shift with normal shift_type"""
        response = self.session.post(f"{BASE_URL}/api/shifts", json={
            "worker_id": self.worker_id,
            "location": "Debrecen",
            "start_time": "2026-01-25T08:00:00",
            "end_time": "2026-01-25T16:00:00",
            "shift_type": "normal",
            "lunch_start": "12:00",
            "lunch_end": "12:30"
        })
        assert response.status_code == 200, f"Failed to create shift: {response.text}"
        data = response.json()
        assert data["shift_type"] == "normal"
        assert data["lunch_start"] == "12:00"
        assert data["lunch_end"] == "12:30"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/shifts/{data['shift_id']}")
    
    def test_create_shift_with_vacation_type(self):
        """Test creating a shift with vacation shift_type"""
        response = self.session.post(f"{BASE_URL}/api/shifts", json={
            "worker_id": self.worker_id,
            "location": "Debrecen",
            "start_time": "2026-01-26T08:00:00",
            "end_time": "2026-01-26T16:00:00",
            "shift_type": "vacation"
        })
        assert response.status_code == 200, f"Failed to create vacation shift: {response.text}"
        data = response.json()
        assert data["shift_type"] == "vacation"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/shifts/{data['shift_id']}")
    
    def test_create_shift_with_sick_leave_type(self):
        """Test creating a shift with sick_leave shift_type"""
        response = self.session.post(f"{BASE_URL}/api/shifts", json={
            "worker_id": self.worker_id,
            "location": "Debrecen",
            "start_time": "2026-01-27T08:00:00",
            "end_time": "2026-01-27T16:00:00",
            "shift_type": "sick_leave"
        })
        assert response.status_code == 200, f"Failed to create sick_leave shift: {response.text}"
        data = response.json()
        assert data["shift_type"] == "sick_leave"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/shifts/{data['shift_id']}")
    
    def test_update_shift_type(self):
        """Test updating shift_type from normal to vacation"""
        # Create a normal shift
        create_res = self.session.post(f"{BASE_URL}/api/shifts", json={
            "worker_id": self.worker_id,
            "location": "Debrecen",
            "start_time": "2026-01-28T08:00:00",
            "end_time": "2026-01-28T16:00:00",
            "shift_type": "normal"
        })
        assert create_res.status_code == 200
        shift_id = create_res.json()["shift_id"]
        
        # Update to vacation
        update_res = self.session.put(f"{BASE_URL}/api/shifts/{shift_id}", json={
            "shift_type": "vacation"
        })
        assert update_res.status_code == 200
        
        # Verify update
        shifts_res = self.session.get(f"{BASE_URL}/api/shifts")
        shifts = shifts_res.json()
        updated_shift = next((s for s in shifts if s["shift_id"] == shift_id), None)
        assert updated_shift is not None
        assert updated_shift["shift_type"] == "vacation"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/shifts/{shift_id}")
    
    def test_attendance_report_api(self):
        """Test GET /api/shifts/attendance-report returns correct structure"""
        response = self.session.get(f"{BASE_URL}/api/shifts/attendance-report?month=2026-01")
        assert response.status_code == 200, f"Attendance report failed: {response.text}"
        data = response.json()
        
        assert "month" in data
        assert data["month"] == "2026-01"
        assert "workers" in data
        assert isinstance(data["workers"], list)
        
        # If there are workers with shifts, verify structure
        if data["workers"]:
            worker = data["workers"][0]
            assert "worker_id" in worker
            assert "worker_name" in worker
            assert "shifts" in worker
            assert "total_hours" in worker
            assert "normal_days" in worker
            assert "vacation_days" in worker
            assert "sick_days" in worker
    
    def test_attendance_report_shift_details(self):
        """Test attendance report includes shift details with shift_type"""
        # Create test shifts
        shifts_to_create = [
            {"shift_type": "normal", "date": "2026-02-01"},
            {"shift_type": "vacation", "date": "2026-02-02"},
            {"shift_type": "sick_leave", "date": "2026-02-03"}
        ]
        created_ids = []
        
        for shift_data in shifts_to_create:
            res = self.session.post(f"{BASE_URL}/api/shifts", json={
                "worker_id": self.worker_id,
                "location": "Debrecen",
                "start_time": f"{shift_data['date']}T08:00:00",
                "end_time": f"{shift_data['date']}T16:00:00",
                "shift_type": shift_data["shift_type"]
            })
            if res.status_code == 200:
                created_ids.append(res.json()["shift_id"])
        
        # Get attendance report
        response = self.session.get(f"{BASE_URL}/api/shifts/attendance-report?month=2026-02")
        assert response.status_code == 200
        data = response.json()
        
        # Find our worker
        worker_data = next((w for w in data["workers"] if w["worker_id"] == self.worker_id), None)
        if worker_data:
            # Verify shift types are tracked
            assert worker_data["normal_days"] >= 1
            assert worker_data["vacation_days"] >= 1
            assert worker_data["sick_days"] >= 1
            
            # Verify shift details include shift_type
            for shift in worker_data["shifts"]:
                assert "shift_type" in shift
                assert shift["shift_type"] in ["normal", "vacation", "sick_leave"]
        
        # Cleanup
        for shift_id in created_ids:
            self.session.delete(f"{BASE_URL}/api/shifts/{shift_id}")
    
    def test_leave_stats_api(self):
        """Test GET /api/shifts/leave-stats returns correct structure"""
        response = self.session.get(f"{BASE_URL}/api/shifts/leave-stats?year=2026")
        assert response.status_code == 200, f"Leave stats failed: {response.text}"
        data = response.json()
        
        assert "year" in data
        assert data["year"] == "2026"
        assert "workers" in data
        assert isinstance(data["workers"], list)
        
        # If there are workers with shifts, verify structure
        if data["workers"]:
            worker = data["workers"][0]
            assert "worker_id" in worker
            assert "worker_name" in worker
            assert "vacation_days" in worker
            assert "sick_days" in worker
            assert "normal_days" in worker
    
    def test_leave_stats_counts_correctly(self):
        """Test leave stats counts vacation and sick days correctly"""
        # Create test shifts
        created_ids = []
        
        # Create 2 vacation days
        for i in range(2):
            res = self.session.post(f"{BASE_URL}/api/shifts", json={
                "worker_id": self.worker_id,
                "location": "Debrecen",
                "start_time": f"2026-03-{10+i}T08:00:00",
                "end_time": f"2026-03-{10+i}T16:00:00",
                "shift_type": "vacation"
            })
            if res.status_code == 200:
                created_ids.append(res.json()["shift_id"])
        
        # Create 1 sick day
        res = self.session.post(f"{BASE_URL}/api/shifts", json={
            "worker_id": self.worker_id,
            "location": "Debrecen",
            "start_time": "2026-03-15T08:00:00",
            "end_time": "2026-03-15T16:00:00",
            "shift_type": "sick_leave"
        })
        if res.status_code == 200:
            created_ids.append(res.json()["shift_id"])
        
        # Get leave stats
        response = self.session.get(f"{BASE_URL}/api/shifts/leave-stats?year=2026")
        assert response.status_code == 200
        data = response.json()
        
        # Find our worker
        worker_data = next((w for w in data["workers"] if w["worker_id"] == self.worker_id), None)
        if worker_data:
            assert worker_data["vacation_days"] >= 2
            assert worker_data["sick_days"] >= 1
        
        # Cleanup
        for shift_id in created_ids:
            self.session.delete(f"{BASE_URL}/api/shifts/{shift_id}")
    
    def test_attendance_report_lunch_deduction(self):
        """Test attendance report deducts lunch time from total hours"""
        # Create shift with lunch
        res = self.session.post(f"{BASE_URL}/api/shifts", json={
            "worker_id": self.worker_id,
            "location": "Debrecen",
            "start_time": "2026-04-01T08:00:00",
            "end_time": "2026-04-01T16:00:00",
            "shift_type": "normal",
            "lunch_start": "12:00",
            "lunch_end": "12:30"
        })
        assert res.status_code == 200
        shift_id = res.json()["shift_id"]
        
        # Get attendance report
        response = self.session.get(f"{BASE_URL}/api/shifts/attendance-report?month=2026-04")
        assert response.status_code == 200
        data = response.json()
        
        # Find our worker
        worker_data = next((w for w in data["workers"] if w["worker_id"] == self.worker_id), None)
        if worker_data:
            # Find the shift
            shift_data = next((s for s in worker_data["shifts"] if s["date"] == "2026-04-01"), None)
            if shift_data:
                # 8 hours - 0.5 hours lunch = 7.5 hours
                assert shift_data["hours"] == 7.5
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/shifts/{shift_id}")


class TestBookingsAPI:
    """Tests for bookings API used by Calendar"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert login_res.status_code == 200
        yield
    
    def test_get_bookings_with_date_range(self):
        """Test GET /api/bookings with date range parameters"""
        response = self.session.get(f"{BASE_URL}/api/bookings", params={
            "date_from": "2026-01-01",
            "date_to": "2026-01-31"
        })
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_bookings_with_location(self):
        """Test GET /api/bookings with location filter"""
        response = self.session.get(f"{BASE_URL}/api/bookings", params={
            "location": "Debrecen"
        })
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestWorkerStatsAPI:
    """Tests for worker monthly stats API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert login_res.status_code == 200
        yield
    
    def test_worker_monthly_stats(self):
        """Test GET /api/stats/worker-monthly returns correct structure"""
        response = self.session.get(f"{BASE_URL}/api/stats/worker-monthly", params={
            "month": "2026-01"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if data:
            worker = data[0]
            assert "worker_id" in worker
            assert "name" in worker
            assert "location" in worker
            assert "days_worked" in worker
            assert "hours_worked" in worker
            assert "cars_completed" in worker
            assert "revenue" in worker
    
    def test_worker_monthly_stats_with_location(self):
        """Test worker stats filtered by location"""
        response = self.session.get(f"{BASE_URL}/api/stats/worker-monthly", params={
            "month": "2026-01",
            "location": "Debrecen"
        })
        assert response.status_code == 200
        data = response.json()
        
        # All returned workers should be from Debrecen
        for worker in data:
            assert worker["location"] == "Debrecen"
