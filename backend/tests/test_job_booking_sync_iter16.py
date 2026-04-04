"""
Test Job-Booking Sync, Customer History, and Statistics
Iteration 16 - Testing bug fixes for:
1. Customer history shows jobs
2. Job creates corresponding booking (shows in calendar)
3. Job status sync to booking
4. Statistics accuracy for completed jobs
5. Price/worker/service changes propagate to booking
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Module-level storage for test data
test_data = {}

@pytest.fixture(scope="module")
def session():
    """Create authenticated session for all tests"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    
    # Login
    login_res = s.post(f"{BASE_URL}/api/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    
    yield s
    
    # Cleanup after all tests
    if "job_id" in test_data:
        try:
            s.delete(f"{BASE_URL}/api/jobs/{test_data['job_id']}")
        except:
            pass
    
    if "customer_id" in test_data:
        try:
            s.delete(f"{BASE_URL}/api/customers/{test_data['customer_id']}")
        except:
            pass
    
    if "booking_id" in test_data:
        try:
            s.delete(f"{BASE_URL}/api/bookings/{test_data['booking_id']}")
        except:
            pass


class TestJobBookingSync:
    """Test job creation creates booking and syncs properly"""
    
    def test_01_create_test_customer(self, session):
        """Create a test customer for job creation"""
        unique_id = uuid.uuid4().hex[:8]
        customer_data = {
            "name": f"TEST_Customer_{unique_id}",
            "plate_number": f"TEST-{unique_id[:4].upper()}",
            "phone": "+36301234567",
            "email": f"test_{unique_id}@example.com",
            "car_type": "VW Golf",
            "location": "Debrecen"
        }
        
        res = session.post(f"{BASE_URL}/api/customers", json=customer_data)
        assert res.status_code == 200, f"Customer creation failed: {res.text}"
        
        data = res.json()
        assert "customer_id" in data
        
        test_data["customer_id"] = data["customer_id"]
        test_data["plate_number"] = customer_data["plate_number"]
        print(f"✓ Created test customer: {data['customer_id']}")
    
    def test_02_get_services(self, session):
        """Get available services for job creation"""
        res = session.get(f"{BASE_URL}/api/services")
        assert res.status_code == 200, f"Services fetch failed: {res.text}"
        
        services = res.json()
        assert len(services) > 0, "No services found"
        
        test_data["service"] = services[0]
        print(f"✓ Found {len(services)} services, using: {services[0]['name']}")
    
    def test_03_get_workers(self, session):
        """Get available workers for job creation"""
        res = session.get(f"{BASE_URL}/api/workers")
        assert res.status_code == 200, f"Workers fetch failed: {res.text}"
        
        workers = res.json()
        
        # Create workers if none exist
        if len(workers) == 0:
            worker_res = session.post(f"{BASE_URL}/api/workers", json={
                "name": "TEST_Worker_Auto",
                "phone": "+36309999999",
                "location": "Debrecen",
                "role": "dolgozo"
            })
            assert worker_res.status_code == 200, f"Worker creation failed: {worker_res.text}"
            workers = [worker_res.json()]
        
        test_data["worker"] = workers[0]
        test_data["all_workers"] = workers
        print(f"✓ Found/created {len(workers)} workers, using: {workers[0]['name']}")
    
    def test_04_create_job_creates_booking(self, session):
        """BUG FIX TEST: Creating a job should also create a booking"""
        assert "customer_id" in test_data, "Customer not created - run test_01 first"
        assert "service" in test_data, "Service not found - run test_02 first"
        assert "worker" in test_data, "Worker not found - run test_03 first"
        
        today = datetime.now(timezone.utc).strftime("%Y-%m-%dT10:00")
        
        job_data = {
            "customer_id": test_data["customer_id"],
            "service_id": test_data["service"]["service_id"],
            "worker_id": test_data["worker"]["worker_id"],
            "price": 15000,
            "location": "Debrecen",
            "date": today,
            "time_slot": "10:00",
            "notes": "TEST_job_booking_sync"
        }
        
        res = session.post(f"{BASE_URL}/api/jobs", json=job_data)
        assert res.status_code == 200, f"Job creation failed: {res.text}"
        
        job = res.json()
        assert "job_id" in job, "Job ID not returned"
        test_data["job_id"] = job["job_id"]
        
        # CRITICAL: Check that booking_id is returned (job creates booking)
        assert "booking_id" in job, "BUG: Job creation did not return booking_id - booking not created!"
        test_data["booking_id"] = job["booking_id"]
        
        print(f"✓ Job created: {job['job_id']}")
        print(f"✓ Booking created: {job['booking_id']}")
    
    def test_05_booking_appears_in_calendar(self, session):
        """BUG FIX TEST: Job-created booking should appear in GET /api/bookings"""
        assert "booking_id" in test_data, "Booking not created - run test_04 first"
        
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        res = session.get(f"{BASE_URL}/api/bookings", params={
            "date_from": today,
            "date_to": today
        })
        assert res.status_code == 200, f"Bookings fetch failed: {res.text}"
        
        bookings = res.json()
        booking_ids = [b["booking_id"] for b in bookings]
        
        assert test_data["booking_id"] in booking_ids, \
            f"BUG: Booking {test_data['booking_id']} not found in calendar! Found: {booking_ids}"
        
        print(f"✓ Booking {test_data['booking_id']} appears in calendar")
    
    def test_06_customer_history_shows_job(self, session):
        """BUG FIX TEST: Customer detail page should show job in history"""
        assert "customer_id" in test_data, "Customer not created - run test_01 first"
        assert "job_id" in test_data, "Job not created - run test_04 first"
        
        res = session.get(f"{BASE_URL}/api/customers/{test_data['customer_id']}")
        assert res.status_code == 200, f"Customer fetch failed: {res.text}"
        
        data = res.json()
        assert "customer" in data, "Customer data not returned"
        assert "jobs" in data, "Jobs history not returned"
        
        job_ids = [j.get("job_id") for j in data["jobs"]]
        
        # Check if our test job appears in history
        assert test_data["job_id"] in job_ids, \
            f"BUG: Job {test_data['job_id']} not found in customer history! Found: {job_ids}"
        
        print(f"✓ Job {test_data['job_id']} appears in customer history")
        print(f"  Customer has {len(data['jobs'])} jobs in history")
    
    def test_07_update_job_status_syncs_to_booking(self, session):
        """BUG FIX TEST: Updating job status to 'kesz' should sync to booking"""
        assert "job_id" in test_data, "Job not created - run test_04 first"
        assert "booking_id" in test_data, "Booking not created - run test_04 first"
        
        # Update job status to 'kesz' with payment
        update_data = {
            "status": "kesz",
            "payment_method": "keszpenz"
        }
        
        res = session.put(f"{BASE_URL}/api/jobs/{test_data['job_id']}", json=update_data)
        assert res.status_code == 200, f"Job update failed: {res.text}"
        
        # Verify booking status also updated
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        bookings_res = session.get(f"{BASE_URL}/api/bookings", params={
            "date_from": today,
            "date_to": today
        })
        assert bookings_res.status_code == 200
        
        bookings = bookings_res.json()
        test_booking = next((b for b in bookings if b["booking_id"] == test_data["booking_id"]), None)
        
        assert test_booking is not None, f"Booking {test_data['booking_id']} not found"
        assert test_booking["status"] == "kesz", \
            f"BUG: Booking status not synced! Expected 'kesz', got '{test_booking['status']}'"
        
        print(f"✓ Booking status synced to 'kesz'")
    
    def test_08_statistics_count_completed_job(self, session):
        """BUG FIX TEST: Completed job should appear in dashboard statistics"""
        assert "job_id" in test_data, "Job not created - run test_04 first"
        
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        res = session.get(f"{BASE_URL}/api/stats/dashboard", params={
            "date": today,
            "location": "Debrecen"
        })
        assert res.status_code == 200, f"Stats fetch failed: {res.text}"
        
        stats = res.json()
        
        # Verify stats structure
        assert "today_cars" in stats, "today_cars not in stats"
        assert "today_revenue" in stats, "today_revenue not in stats"
        assert "today_cash" in stats, "today_cash not in stats"
        assert "today_card" in stats, "today_card not in stats"
        
        # Our test job should be counted (status=kesz, payment=keszpenz, price=15000)
        assert stats["today_cars"] >= 1, f"BUG: today_cars should be >= 1, got {stats['today_cars']}"
        assert stats["today_cash"] >= 15000, f"BUG: today_cash should include 15000, got {stats['today_cash']}"
        
        print(f"✓ Statistics show: {stats['today_cars']} cars, {stats['today_cash']} Ft cash, {stats['today_card']} Ft card")
    
    def test_09_update_job_price_syncs_to_booking(self, session):
        """BUG FIX TEST: Updating job price should sync to booking"""
        assert "job_id" in test_data, "Job not created - run test_04 first"
        assert "booking_id" in test_data, "Booking not created - run test_04 first"
        
        new_price = 20000
        
        res = session.put(f"{BASE_URL}/api/jobs/{test_data['job_id']}", json={
            "price": new_price
        })
        assert res.status_code == 200, f"Job price update failed: {res.text}"
        
        # Verify booking price also updated
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        bookings_res = session.get(f"{BASE_URL}/api/bookings", params={
            "date_from": today,
            "date_to": today
        })
        
        bookings = bookings_res.json()
        test_booking = next((b for b in bookings if b["booking_id"] == test_data["booking_id"]), None)
        
        assert test_booking is not None
        assert test_booking["price"] == new_price, \
            f"BUG: Booking price not synced! Expected {new_price}, got {test_booking['price']}"
        
        print(f"✓ Booking price synced to {new_price}")
    
    def test_10_update_job_worker_syncs_to_booking(self, session):
        """BUG FIX TEST: Updating job worker should sync to booking"""
        assert "job_id" in test_data, "Job not created - run test_04 first"
        assert "booking_id" in test_data, "Booking not created - run test_04 first"
        
        workers = test_data.get("all_workers", [])
        
        if len(workers) < 2:
            # Create another worker for testing
            worker_res = session.post(f"{BASE_URL}/api/workers", json={
                "name": "TEST_Worker_2_Auto",
                "phone": "+36308888888",
                "location": "Debrecen",
                "role": "dolgozo"
            })
            if worker_res.status_code == 200:
                workers.append(worker_res.json())
        
        if len(workers) < 2:
            pytest.skip("Need at least 2 workers to test worker sync")
        
        new_worker = workers[1]  # Use second worker
        
        res = session.put(f"{BASE_URL}/api/jobs/{test_data['job_id']}", json={
            "worker_id": new_worker["worker_id"],
            "worker_name": new_worker["name"]
        })
        assert res.status_code == 200, f"Job worker update failed: {res.text}"
        
        # Verify booking worker also updated
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        bookings_res = session.get(f"{BASE_URL}/api/bookings", params={
            "date_from": today,
            "date_to": today
        })
        
        bookings = bookings_res.json()
        test_booking = next((b for b in bookings if b["booking_id"] == test_data["booking_id"]), None)
        
        assert test_booking is not None
        assert test_booking["worker_id"] == new_worker["worker_id"], \
            f"BUG: Booking worker_id not synced! Expected {new_worker['worker_id']}, got {test_booking.get('worker_id')}"
        
        print(f"✓ Booking worker synced to {new_worker['name']}")


class TestBookingPageEndpoints:
    """Test endpoints used by BookingPage"""
    
    def test_pricing_data_endpoint(self, session):
        """Test /api/services/pricing-data returns valid data"""
        res = session.get(f"{BASE_URL}/api/services/pricing-data")
        assert res.status_code == 200, f"Pricing data failed: {res.text}"
        
        data = res.json()
        assert "price_matrix" in data, "price_matrix not in response"
        assert "duration_matrix" in data, "duration_matrix not in response"
        assert "package_features" in data, "package_features not in response"
        
        # Check car sizes exist
        for size in ["S", "M", "L", "XL", "XXL"]:
            assert size in data["price_matrix"], f"Size {size} not in price_matrix"
        
        print(f"✓ Pricing data endpoint returns valid structure")
    
    def test_extras_endpoint(self, session):
        """Test /api/services/extras returns array"""
        res = session.get(f"{BASE_URL}/api/services/extras")
        assert res.status_code == 200, f"Extras failed: {res.text}"
        
        data = res.json()
        assert isinstance(data, list), "Extras should be a list"
        
        print(f"✓ Extras endpoint returns {len(data)} extras")
    
    def test_available_slots_endpoint(self, session):
        """Test /api/bookings/available-slots returns slots"""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        res = session.get(f"{BASE_URL}/api/bookings/available-slots", params={
            "location": "Debrecen",
            "date": today,
            "duration": 60
        })
        assert res.status_code == 200, f"Available slots failed: {res.text}"
        
        slots = res.json()
        assert isinstance(slots, list), "Slots should be a list"
        
        if len(slots) > 0:
            slot = slots[0]
            assert "time_slot" in slot, "time_slot not in slot"
            assert "is_available" in slot, "is_available not in slot"
        
        print(f"✓ Available slots endpoint returns {len(slots)} slots")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
