"""
X-CLEAN API Tests - Iteration 4
Testing: Dashboard KPIs, Advanced Analytics, Day Management, Services CRUD, Inventory CRUD, Workers CRUD, Shifts CRUD
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://xclean-preview-1.preview.emergentagent.com')
SESSION_TOKEN = "test_fresh_session"

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Cookie": f"session_token={SESSION_TOKEN}"
    })
    return session

class TestHealthAndAuth:
    """Test health check and authentication"""
    
    def test_api_health(self, api_client):
        """API health check"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "X-CLEAN API"
        print("✓ API health check passed")
    
    def test_auth_me(self, api_client):
        """Test authenticated user endpoint"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert data["email"] == "admin@xclean.hu"
        assert data["role"] == "admin"
        print(f"✓ Auth /me passed - User: {data['name']}")

class TestDashboardStats:
    """Test Dashboard KPIs and Advanced Analytics"""
    
    def test_dashboard_stats(self, api_client):
        """Test dashboard stats endpoint with all KPIs"""
        response = api_client.get(f"{BASE_URL}/api/stats/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Check all required KPI fields
        required_fields = [
            "today_cars", "today_revenue", "today_cash", "today_card",
            "month_cars", "month_revenue", "month_cash", "month_card"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✓ Dashboard stats - Today: {data['today_cars']} cars, Month: {data['month_cars']} cars")
    
    def test_dashboard_stats_with_location(self, api_client):
        """Test dashboard stats with location filter"""
        response = api_client.get(f"{BASE_URL}/api/stats/dashboard?location=Budapest")
        assert response.status_code == 200
        data = response.json()
        assert "today_cars" in data
        print(f"✓ Dashboard stats Budapest - {data['today_cars']} cars")
    
    def test_advanced_stats(self, api_client):
        """Test advanced analytics endpoint"""
        response = api_client.get(f"{BASE_URL}/api/stats/advanced")
        assert response.status_code == 200
        data = response.json()
        
        # Check all required advanced analytics fields
        required_fields = [
            "avg_revenue_per_car", "returning_customers", "total_customers",
            "top_customers", "month_comparison", "employee_revenue", "location_revenue"
        ]
        for field in required_fields:
            assert field in data, f"Missing advanced field: {field}"
        
        # Check month_comparison structure
        assert "current_month" in data["month_comparison"]
        assert "previous_month" in data["month_comparison"]
        assert "cars_change_percent" in data["month_comparison"]
        assert "revenue_change_percent" in data["month_comparison"]
        
        print(f"✓ Advanced stats - Avg revenue/car: {data['avg_revenue_per_car']}, Returning: {data['returning_customers']}")
    
    def test_daily_stats(self, api_client):
        """Test daily stats endpoint"""
        response = api_client.get(f"{BASE_URL}/api/stats/daily")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Daily stats - {len(data)} days of data")
    
    def test_worker_stats(self, api_client):
        """Test worker stats endpoint"""
        response = api_client.get(f"{BASE_URL}/api/stats/workers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Worker stats - {len(data)} workers with stats")
    
    def test_location_stats(self, api_client):
        """Test location stats endpoint"""
        response = api_client.get(f"{BASE_URL}/api/stats/locations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Location stats - {len(data)} locations")

class TestDayManagement:
    """Test Day Open/Close operations"""
    
    def test_today_record_endpoint(self, api_client):
        """Test get today's day record"""
        response = api_client.get(f"{BASE_URL}/api/day-records/today?location=Debrecen")
        # Could be 200 with data or 200 with null
        assert response.status_code == 200
        print(f"✓ Today record endpoint works - Debrecen")
    
    def test_day_records_list(self, api_client):
        """Test list day records"""
        response = api_client.get(f"{BASE_URL}/api/day-records")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Day records list - {len(data)} records")
    
    def test_open_day_debrecen(self, api_client):
        """Test opening a day for Debrecen"""
        # First check if already open
        check_response = api_client.get(f"{BASE_URL}/api/day-records/today?location=Debrecen")
        if check_response.json():
            print("✓ Day already open for Debrecen - skipping open test")
            return
        
        response = api_client.post(f"{BASE_URL}/api/day-records/open", json={
            "location": "Debrecen",
            "opening_balance": 50000
        })
        
        # Could be 200 success or 400 if already open
        if response.status_code == 200:
            data = response.json()
            assert "record_id" in data
            assert data["location"] == "Debrecen"
            assert data["opening_balance"] == 50000
            assert data["status"] == "open"
            print(f"✓ Day opened - Debrecen, balance: {data['opening_balance']}")
        elif response.status_code == 400:
            print(f"✓ Day already open - Debrecen (expected)")
    
    def test_close_day_debrecen(self, api_client):
        """Test closing a day for Debrecen"""
        # First ensure day is open
        check_response = api_client.get(f"{BASE_URL}/api/day-records/today?location=Debrecen")
        record = check_response.json()
        
        if not record or record.get("status") == "closed":
            print("✓ No open day for Debrecen - skipping close test")
            return
        
        response = api_client.post(f"{BASE_URL}/api/day-records/close", json={
            "location": "Debrecen",
            "notes": "Test close"
        })
        
        if response.status_code == 200:
            data = response.json()
            assert "message" in data
            print(f"✓ Day closed - Debrecen: {data}")
        elif response.status_code == 400:
            print(f"✓ No open day to close - Debrecen")

class TestServicesCRUD:
    """Test Services CRUD operations"""
    
    def test_get_services(self, api_client):
        """Test get all services"""
        response = api_client.get(f"{BASE_URL}/api/services")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check categories exist
        categories = set(s["category"] for s in data)
        print(f"✓ Services list - {len(data)} services, categories: {categories}")
    
    def test_create_service(self, api_client):
        """Test create new service"""
        response = api_client.post(f"{BASE_URL}/api/services", json={
            "name": "TEST_Service",
            "category": "extra",
            "price": 9999,
            "duration": 30,
            "description": "Test service",
            "car_size": "M",
            "package": "Pro"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Service"
        assert data["category"] == "extra"
        assert data["price"] == 9999
        assert "service_id" in data
        print(f"✓ Service created - ID: {data['service_id']}")
        return data["service_id"]
    
    def test_update_service(self, api_client):
        """Test update service"""
        # First create a service
        create_res = api_client.post(f"{BASE_URL}/api/services", json={
            "name": "TEST_Update_Service",
            "category": "kulso",
            "price": 5000,
            "duration": 20
        })
        service_id = create_res.json()["service_id"]
        
        # Update it
        response = api_client.put(f"{BASE_URL}/api/services/{service_id}", json={
            "name": "TEST_Updated_Service",
            "category": "belso",
            "price": 6000,
            "duration": 25
        })
        assert response.status_code == 200
        print(f"✓ Service updated - ID: {service_id}")
        
        # Clean up
        api_client.delete(f"{BASE_URL}/api/services/{service_id}")
    
    def test_delete_service(self, api_client):
        """Test delete service"""
        # First create a service
        create_res = api_client.post(f"{BASE_URL}/api/services", json={
            "name": "TEST_Delete_Service",
            "category": "extra",
            "price": 3000,
            "duration": 15
        })
        service_id = create_res.json()["service_id"]
        
        # Delete it
        response = api_client.delete(f"{BASE_URL}/api/services/{service_id}")
        assert response.status_code == 200
        print(f"✓ Service deleted - ID: {service_id}")

class TestInventoryCRUD:
    """Test Inventory CRUD operations"""
    
    def test_get_inventory(self, api_client):
        """Test get all inventory"""
        response = api_client.get(f"{BASE_URL}/api/inventory")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Inventory list - {len(data)} items")
    
    def test_get_inventory_by_location(self, api_client):
        """Test get inventory by location"""
        response = api_client.get(f"{BASE_URL}/api/inventory?location=Budapest")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if data:
            assert all(item["location"] == "Budapest" for item in data)
        print(f"✓ Inventory by location - Budapest: {len(data)} items")
    
    def test_create_inventory(self, api_client):
        """Test create inventory item"""
        response = api_client.post(f"{BASE_URL}/api/inventory", json={
            "product_name": "TEST_Product",
            "current_quantity": 100,
            "min_level": 20,
            "unit": "db",
            "location": "Budapest"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["product_name"] == "TEST_Product"
        assert data["current_quantity"] == 100
        assert "inventory_id" in data
        print(f"✓ Inventory created - ID: {data['inventory_id']}")
        return data["inventory_id"]
    
    def test_update_inventory(self, api_client):
        """Test update inventory item"""
        # First create
        create_res = api_client.post(f"{BASE_URL}/api/inventory", json={
            "product_name": "TEST_Update_Product",
            "current_quantity": 50,
            "min_level": 10,
            "unit": "liter",
            "location": "Debrecen"
        })
        inventory_id = create_res.json()["inventory_id"]
        
        # Update
        response = api_client.put(f"{BASE_URL}/api/inventory/{inventory_id}", json={
            "current_quantity": 75,
            "min_level": 15
        })
        assert response.status_code == 200
        print(f"✓ Inventory updated - ID: {inventory_id}")
        
        # Clean up
        api_client.delete(f"{BASE_URL}/api/inventory/{inventory_id}")
    
    def test_delete_inventory(self, api_client):
        """Test delete inventory item"""
        # First create
        create_res = api_client.post(f"{BASE_URL}/api/inventory", json={
            "product_name": "TEST_Delete_Product",
            "current_quantity": 25,
            "min_level": 5,
            "unit": "kg",
            "location": "Budapest"
        })
        inventory_id = create_res.json()["inventory_id"]
        
        # Delete
        response = api_client.delete(f"{BASE_URL}/api/inventory/{inventory_id}")
        assert response.status_code == 200
        print(f"✓ Inventory deleted - ID: {inventory_id}")

class TestWorkersCRUD:
    """Test Workers CRUD operations"""
    
    def test_get_workers(self, api_client):
        """Test get all workers"""
        response = api_client.get(f"{BASE_URL}/api/workers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Workers list - {len(data)} workers")
    
    def test_get_workers_by_location(self, api_client):
        """Test get workers by location"""
        response = api_client.get(f"{BASE_URL}/api/workers?location=Budapest")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Workers by location - Budapest: {len(data)} workers")
    
    def test_create_worker(self, api_client):
        """Test create worker"""
        response = api_client.post(f"{BASE_URL}/api/workers", json={
            "name": "TEST_Worker",
            "phone": "+36 30 111 2222",
            "email": "test.worker@xclean.hu",
            "position": "Autómosó",
            "location": "Budapest"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Worker"
        assert "worker_id" in data
        print(f"✓ Worker created - ID: {data['worker_id']}")
        return data["worker_id"]
    
    def test_update_worker(self, api_client):
        """Test update worker"""
        # First create
        create_res = api_client.post(f"{BASE_URL}/api/workers", json={
            "name": "TEST_Update_Worker",
            "location": "Budapest"
        })
        worker_id = create_res.json()["worker_id"]
        
        # Update
        response = api_client.put(f"{BASE_URL}/api/workers/{worker_id}", json={
            "name": "TEST_Updated_Worker",
            "phone": "+36 30 999 8888"
        })
        assert response.status_code == 200
        print(f"✓ Worker updated - ID: {worker_id}")
        
        # Clean up
        api_client.delete(f"{BASE_URL}/api/workers/{worker_id}")
    
    def test_delete_worker(self, api_client):
        """Test delete (deactivate) worker"""
        # First create
        create_res = api_client.post(f"{BASE_URL}/api/workers", json={
            "name": "TEST_Delete_Worker",
            "location": "Debrecen"
        })
        worker_id = create_res.json()["worker_id"]
        
        # Delete
        response = api_client.delete(f"{BASE_URL}/api/workers/{worker_id}")
        assert response.status_code == 200
        print(f"✓ Worker deleted - ID: {worker_id}")

class TestShiftsCRUD:
    """Test Shifts CRUD operations"""
    
    def test_get_shifts(self, api_client):
        """Test get all shifts"""
        response = api_client.get(f"{BASE_URL}/api/shifts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Shifts list - {len(data)} shifts")
    
    def test_create_and_delete_shift(self, api_client):
        """Test create and delete shift"""
        # Get a worker
        workers_res = api_client.get(f"{BASE_URL}/api/workers")
        workers = workers_res.json()
        
        if not workers:
            print("✓ No workers to create shift - skipping")
            return
        
        worker_id = workers[0]["worker_id"]
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT08:00:00")
        tomorrow_end = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT16:00:00")
        
        # Create shift
        response = api_client.post(f"{BASE_URL}/api/shifts", json={
            "worker_id": worker_id,
            "location": "Budapest",
            "start_time": tomorrow,
            "end_time": tomorrow_end
        })
        assert response.status_code == 200
        data = response.json()
        assert "shift_id" in data
        shift_id = data["shift_id"]
        print(f"✓ Shift created - ID: {shift_id}")
        
        # Delete shift
        del_response = api_client.delete(f"{BASE_URL}/api/shifts/{shift_id}")
        assert del_response.status_code == 200
        print(f"✓ Shift deleted - ID: {shift_id}")

class TestTodayJobs:
    """Test Today's Jobs endpoint"""
    
    def test_today_jobs(self, api_client):
        """Test get today's jobs"""
        response = api_client.get(f"{BASE_URL}/api/jobs/today")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Today's jobs - {len(data)} jobs")
    
    def test_today_jobs_by_location(self, api_client):
        """Test get today's jobs by location"""
        response = api_client.get(f"{BASE_URL}/api/jobs/today?location=Budapest")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Today's jobs Budapest - {len(data)} jobs")

# Cleanup test data after all tests
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(api_client):
    """Cleanup TEST_ prefixed data after tests"""
    yield
    
    # Cleanup services
    services_res = api_client.get(f"{BASE_URL}/api/services")
    if services_res.status_code == 200:
        for service in services_res.json():
            if service["name"].startswith("TEST_"):
                api_client.delete(f"{BASE_URL}/api/services/{service['service_id']}")
    
    # Cleanup inventory
    inventory_res = api_client.get(f"{BASE_URL}/api/inventory")
    if inventory_res.status_code == 200:
        for item in inventory_res.json():
            if item["product_name"].startswith("TEST_"):
                api_client.delete(f"{BASE_URL}/api/inventory/{item['inventory_id']}")
    
    # Cleanup workers - note: workers are deactivated, not deleted
    print("\n✓ Test cleanup completed")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
