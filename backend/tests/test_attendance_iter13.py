"""
Attendance API Tests - Iteration 13
Tests for worker check-in/check-out functionality
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAttendanceAPI:
    """Attendance endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        print(f"Login successful")
        
        # Get workers to use for testing
        workers_response = self.session.get(f"{BASE_URL}/api/workers")
        assert workers_response.status_code == 200
        self.workers = workers_response.json()
        print(f"Found {len(self.workers)} workers")
        
        yield
        
    def test_get_today_attendance(self):
        """Test GET /api/attendance/today returns today's attendance records"""
        response = self.session.get(f"{BASE_URL}/api/attendance/today")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Today's attendance records: {len(data)}")
        
        # Verify structure if records exist
        if len(data) > 0:
            record = data[0]
            assert "worker_id" in record
            assert "worker_name" in record
            assert "date" in record
            assert "status" in record
            print(f"Sample record: worker={record['worker_name']}, status={record['status']}")
    
    def test_get_today_attendance_with_location_filter(self):
        """Test GET /api/attendance/today with location filter"""
        response = self.session.get(f"{BASE_URL}/api/attendance/today?location=Debrecen")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Debrecen attendance records: {len(data)}")
        
        # Verify all records are for Debrecen
        for record in data:
            assert record.get("location") == "Debrecen", f"Expected Debrecen, got {record.get('location')}"
    
    def test_check_in_success(self):
        """Test POST /api/attendance/check-in creates attendance record"""
        if len(self.workers) == 0:
            pytest.skip("No workers available for testing")
        
        # Find a worker who hasn't checked in today
        test_worker = None
        for worker in self.workers:
            # Check if worker already has attendance today
            today_response = self.session.get(f"{BASE_URL}/api/attendance/today")
            today_records = today_response.json()
            worker_record = next((r for r in today_records if r["worker_id"] == worker["worker_id"]), None)
            
            if not worker_record:
                test_worker = worker
                break
        
        if not test_worker:
            # All workers have attendance - try to find one that's checked out
            for worker in self.workers:
                today_response = self.session.get(f"{BASE_URL}/api/attendance/today")
                today_records = today_response.json()
                worker_record = next((r for r in today_records if r["worker_id"] == worker["worker_id"]), None)
                
                if worker_record and worker_record["status"] == "checked_out":
                    print(f"Worker {worker['name']} already checked out today - cannot check in again")
                    continue
                elif worker_record and worker_record["status"] == "checked_in":
                    print(f"Worker {worker['name']} already checked in - will test check-out instead")
                    test_worker = worker
                    break
            
            if not test_worker:
                pytest.skip("All workers have completed attendance cycle today")
        
        # If worker is already checked in, skip this test
        today_response = self.session.get(f"{BASE_URL}/api/attendance/today")
        today_records = today_response.json()
        worker_record = next((r for r in today_records if r["worker_id"] == test_worker["worker_id"]), None)
        
        if worker_record and worker_record["status"] == "checked_in":
            pytest.skip(f"Worker {test_worker['name']} already checked in")
        
        # Perform check-in
        response = self.session.post(f"{BASE_URL}/api/attendance/check-in", json={
            "worker_id": test_worker["worker_id"],
            "location": test_worker.get("location", "Debrecen"),
            "notes": "Test check-in from pytest"
        })
        
        assert response.status_code == 200, f"Check-in failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "check_in" in data
        assert "attendance_id" in data
        print(f"Check-in successful for {test_worker['name']}: {data}")
        
        # Verify the record was created
        verify_response = self.session.get(f"{BASE_URL}/api/attendance/today")
        verify_data = verify_response.json()
        worker_record = next((r for r in verify_data if r["worker_id"] == test_worker["worker_id"]), None)
        
        assert worker_record is not None, "Attendance record not found after check-in"
        assert worker_record["status"] == "checked_in"
        print(f"Verified: Worker {test_worker['name']} is now checked in")
    
    def test_check_in_duplicate_fails(self):
        """Test POST /api/attendance/check-in fails if already checked in"""
        if len(self.workers) == 0:
            pytest.skip("No workers available for testing")
        
        # Find a worker who is already checked in
        today_response = self.session.get(f"{BASE_URL}/api/attendance/today")
        today_records = today_response.json()
        
        checked_in_worker = None
        for record in today_records:
            if record["status"] == "checked_in":
                checked_in_worker = record
                break
        
        if not checked_in_worker:
            pytest.skip("No worker currently checked in to test duplicate check-in")
        
        # Try to check in again - should fail
        response = self.session.post(f"{BASE_URL}/api/attendance/check-in", json={
            "worker_id": checked_in_worker["worker_id"],
            "location": checked_in_worker.get("location", "Debrecen")
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"Duplicate check-in correctly rejected: {response.json()}")
    
    def test_check_out_success(self):
        """Test POST /api/attendance/check-out works for checked-in worker"""
        if len(self.workers) == 0:
            pytest.skip("No workers available for testing")
        
        # Find a worker who is checked in
        today_response = self.session.get(f"{BASE_URL}/api/attendance/today")
        today_records = today_response.json()
        
        checked_in_worker = None
        for record in today_records:
            if record["status"] == "checked_in":
                checked_in_worker = record
                break
        
        if not checked_in_worker:
            pytest.skip("No worker currently checked in to test check-out")
        
        # Perform check-out
        response = self.session.post(f"{BASE_URL}/api/attendance/check-out", json={
            "worker_id": checked_in_worker["worker_id"],
            "location": checked_in_worker.get("location", "Debrecen"),
            "notes": "Test check-out from pytest"
        })
        
        assert response.status_code == 200, f"Check-out failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "check_out" in data
        assert "hours_worked" in data
        assert isinstance(data["hours_worked"], (int, float))
        print(f"Check-out successful: hours_worked={data['hours_worked']}")
        
        # Verify the record was updated
        verify_response = self.session.get(f"{BASE_URL}/api/attendance/today")
        verify_data = verify_response.json()
        worker_record = next((r for r in verify_data if r["worker_id"] == checked_in_worker["worker_id"]), None)
        
        assert worker_record is not None
        assert worker_record["status"] == "checked_out"
        assert worker_record.get("hours_worked") is not None
        print(f"Verified: Worker is now checked out with {worker_record['hours_worked']} hours")
    
    def test_check_out_without_check_in_fails(self):
        """Test POST /api/attendance/check-out fails if not checked in"""
        if len(self.workers) == 0:
            pytest.skip("No workers available for testing")
        
        # Find a worker who is NOT checked in
        today_response = self.session.get(f"{BASE_URL}/api/attendance/today")
        today_records = today_response.json()
        
        not_checked_in_worker = None
        for worker in self.workers:
            worker_record = next((r for r in today_records if r["worker_id"] == worker["worker_id"]), None)
            if not worker_record or worker_record["status"] != "checked_in":
                not_checked_in_worker = worker
                break
        
        if not not_checked_in_worker:
            pytest.skip("All workers are checked in - cannot test check-out without check-in")
        
        # Try to check out without being checked in - should fail
        response = self.session.post(f"{BASE_URL}/api/attendance/check-out", json={
            "worker_id": not_checked_in_worker["worker_id"],
            "location": not_checked_in_worker.get("location", "Debrecen")
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"Check-out without check-in correctly rejected: {response.json()}")
    
    def test_get_attendance_with_filters(self):
        """Test GET /api/attendance with various filters"""
        # Test without filters
        response = self.session.get(f"{BASE_URL}/api/attendance")
        assert response.status_code == 200
        all_records = response.json()
        print(f"Total attendance records: {len(all_records)}")
        
        # Test with location filter
        response = self.session.get(f"{BASE_URL}/api/attendance?location=Debrecen")
        assert response.status_code == 200
        debrecen_records = response.json()
        print(f"Debrecen records: {len(debrecen_records)}")
        
        # Test with date filter
        today = datetime.now().strftime("%Y-%m-%d")
        response = self.session.get(f"{BASE_URL}/api/attendance?date={today}")
        assert response.status_code == 200
        today_records = response.json()
        print(f"Today's records: {len(today_records)}")
    
    def test_get_worker_attendance(self):
        """Test GET /api/attendance/worker/{worker_id}"""
        if len(self.workers) == 0:
            pytest.skip("No workers available for testing")
        
        worker = self.workers[0]
        response = self.session.get(f"{BASE_URL}/api/attendance/worker/{worker['worker_id']}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Worker {worker['name']} has {len(data)} attendance records")
        
        # Verify all records belong to this worker
        for record in data:
            assert record["worker_id"] == worker["worker_id"]
    
    def test_get_worker_attendance_stats(self):
        """Test GET /api/attendance/stats/{worker_id}"""
        if len(self.workers) == 0:
            pytest.skip("No workers available for testing")
        
        worker = self.workers[0]
        current_month = datetime.now().strftime("%Y-%m")
        
        response = self.session.get(f"{BASE_URL}/api/attendance/stats/{worker['worker_id']}?month={current_month}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "worker_id" in data
        assert "month" in data
        assert "total_days_worked" in data
        assert "total_hours_worked" in data
        assert "average_hours_per_day" in data
        
        print(f"Worker {worker['name']} stats for {current_month}:")
        print(f"  Days worked: {data['total_days_worked']}")
        print(f"  Hours worked: {data['total_hours_worked']}")
        print(f"  Avg hours/day: {data['average_hours_per_day']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
