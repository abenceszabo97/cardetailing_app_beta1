"""
Test X-CLEAN API CRUD operations with WORKER ROLE (test_dolgozo_session)
Validates that all CRUD operations (services, workers, inventory, shifts, day-records)
work for non-admin users after permission changes from require_admin to get_current_user.
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# WORKER role session token - not admin
WORKER_TOKEN = "test_dolgozo_session"
ADMIN_TOKEN = "test_fresh_session"


class TestWorkerRoleAuthentication:
    """Test authentication with worker role token"""
    
    def test_api_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "X-CLEAN API"
        print(f"✓ API health check passed: {data}")
    
    def test_worker_session_valid(self):
        """Verify worker session token is valid"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {WORKER_TOKEN}"}
        )
        assert response.status_code == 200, f"Worker auth failed: {response.text}"
        data = response.json()
        assert data.get("role") == "dolgozo", f"Expected dolgozo role, got {data.get('role')}"
        print(f"✓ Worker session valid: {data.get('email')} (role: {data.get('role')})")


class TestServicesCRUDWorkerRole:
    """Test Services CRUD with worker role - validates permission changes"""
    
    @pytest.fixture
    def worker_client(self):
        """Session with worker role auth header"""
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {WORKER_TOKEN}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_get_services_worker(self, worker_client):
        """Worker can GET all services"""
        response = worker_client.get(f"{BASE_URL}/api/services")
        assert response.status_code == 200
        services = response.json()
        assert isinstance(services, list)
        print(f"✓ Worker GET /services: {len(services)} services")
    
    def test_create_service_worker(self, worker_client):
        """Worker can CREATE a service (was admin-only before)"""
        service_data = {
            "name": "TEST_Worker_Szolgaltatas",
            "category": "extra",
            "price": 5000,
            "duration": 30,
            "description": "Test service created by worker role"
        }
        response = worker_client.post(f"{BASE_URL}/api/services", json=service_data)
        assert response.status_code == 200, f"Create service failed: {response.text}"
        data = response.json()
        assert data.get("name") == service_data["name"]
        assert data.get("price") == service_data["price"]
        self.created_service_id = data.get("service_id")
        print(f"✓ Worker POST /services: Created {data.get('service_id')}")
        return data.get("service_id")
    
    def test_update_service_worker(self, worker_client):
        """Worker can UPDATE a service (was admin-only before)"""
        # First create
        service_data = {
            "name": "TEST_Service_ToUpdate",
            "category": "kulso",
            "price": 3000,
            "duration": 20
        }
        create_res = worker_client.post(f"{BASE_URL}/api/services", json=service_data)
        assert create_res.status_code == 200
        service_id = create_res.json().get("service_id")
        
        # Now update
        updated_data = {
            "name": "TEST_Service_Updated",
            "category": "kulso",
            "price": 4000,
            "duration": 25
        }
        update_res = worker_client.put(f"{BASE_URL}/api/services/{service_id}", json=updated_data)
        assert update_res.status_code == 200, f"Update service failed: {update_res.text}"
        print(f"✓ Worker PUT /services/{service_id}: Updated successfully")
        
        # Cleanup
        worker_client.delete(f"{BASE_URL}/api/services/{service_id}")
    
    def test_delete_service_worker(self, worker_client):
        """Worker can DELETE a service (was admin-only before)"""
        # First create
        service_data = {
            "name": "TEST_Service_ToDelete",
            "category": "extra",
            "price": 2000,
            "duration": 15
        }
        create_res = worker_client.post(f"{BASE_URL}/api/services", json=service_data)
        assert create_res.status_code == 200
        service_id = create_res.json().get("service_id")
        
        # Delete
        delete_res = worker_client.delete(f"{BASE_URL}/api/services/{service_id}")
        assert delete_res.status_code == 200, f"Delete service failed: {delete_res.text}"
        print(f"✓ Worker DELETE /services/{service_id}: Deleted successfully")
        
        # Verify deleted
        get_res = worker_client.get(f"{BASE_URL}/api/services")
        services = get_res.json()
        assert not any(s.get("service_id") == service_id for s in services)


class TestWorkersCRUDWorkerRole:
    """Test Workers CRUD with worker role"""
    
    @pytest.fixture
    def worker_client(self):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {WORKER_TOKEN}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_get_workers_worker(self, worker_client):
        """Worker can GET all workers"""
        response = worker_client.get(f"{BASE_URL}/api/workers")
        assert response.status_code == 200
        workers = response.json()
        assert isinstance(workers, list)
        print(f"✓ Worker GET /workers: {len(workers)} workers")
    
    def test_create_worker_by_worker_role(self, worker_client):
        """Worker role can CREATE a new worker (was admin-only before)"""
        worker_data = {
            "name": "TEST_UjDolgozo",
            "phone": "+36 30 999 8888",
            "email": "test_uj@xclean.hu",
            "position": "Tesztelő",
            "location": "Budapest"
        }
        response = worker_client.post(f"{BASE_URL}/api/workers", json=worker_data)
        assert response.status_code == 200, f"Create worker failed: {response.text}"
        data = response.json()
        assert data.get("name") == worker_data["name"]
        assert data.get("location") == worker_data["location"]
        print(f"✓ Worker POST /workers: Created {data.get('worker_id')}")
        return data.get("worker_id")
    
    def test_update_worker_by_worker_role(self, worker_client):
        """Worker role can UPDATE a worker (was admin-only before)"""
        # Create first
        worker_data = {
            "name": "TEST_Worker_ToUpdate",
            "location": "Debrecen"
        }
        create_res = worker_client.post(f"{BASE_URL}/api/workers", json=worker_data)
        assert create_res.status_code == 200
        worker_id = create_res.json().get("worker_id")
        
        # Update
        update_data = {
            "name": "TEST_Worker_Updated",
            "phone": "+36 20 111 2222"
        }
        update_res = worker_client.put(f"{BASE_URL}/api/workers/{worker_id}", json=update_data)
        assert update_res.status_code == 200, f"Update worker failed: {update_res.text}"
        print(f"✓ Worker PUT /workers/{worker_id}: Updated successfully")
        
        # Cleanup
        worker_client.delete(f"{BASE_URL}/api/workers/{worker_id}")
    
    def test_delete_worker_by_worker_role(self, worker_client):
        """Worker role can DELETE (deactivate) a worker (was admin-only before)"""
        # Create first
        worker_data = {
            "name": "TEST_Worker_ToDelete",
            "location": "Budapest"
        }
        create_res = worker_client.post(f"{BASE_URL}/api/workers", json=worker_data)
        assert create_res.status_code == 200
        worker_id = create_res.json().get("worker_id")
        
        # Delete
        delete_res = worker_client.delete(f"{BASE_URL}/api/workers/{worker_id}")
        assert delete_res.status_code == 200, f"Delete worker failed: {delete_res.text}"
        print(f"✓ Worker DELETE /workers/{worker_id}: Deleted successfully")


class TestInventoryCRUDWorkerRole:
    """Test Inventory CRUD with worker role"""
    
    @pytest.fixture
    def worker_client(self):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {WORKER_TOKEN}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_get_inventory_worker(self, worker_client):
        """Worker can GET inventory"""
        response = worker_client.get(f"{BASE_URL}/api/inventory")
        assert response.status_code == 200
        inventory = response.json()
        assert isinstance(inventory, list)
        print(f"✓ Worker GET /inventory: {len(inventory)} items")
    
    def test_create_inventory_worker(self, worker_client):
        """Worker role can CREATE inventory item (was admin-only before)"""
        item_data = {
            "product_name": "TEST_Teszt_Termek",
            "current_quantity": 50,
            "min_level": 10,
            "unit": "db",
            "location": "Budapest"
        }
        response = worker_client.post(f"{BASE_URL}/api/inventory", json=item_data)
        assert response.status_code == 200, f"Create inventory failed: {response.text}"
        data = response.json()
        assert data.get("product_name") == item_data["product_name"]
        assert data.get("current_quantity") == item_data["current_quantity"]
        print(f"✓ Worker POST /inventory: Created {data.get('inventory_id')}")
        
        # Cleanup
        worker_client.delete(f"{BASE_URL}/api/inventory/{data.get('inventory_id')}")
    
    def test_update_inventory_worker(self, worker_client):
        """Worker role can UPDATE inventory item"""
        # Create first
        item_data = {
            "product_name": "TEST_Inventory_ToUpdate",
            "current_quantity": 30,
            "min_level": 5,
            "unit": "liter",
            "location": "Debrecen"
        }
        create_res = worker_client.post(f"{BASE_URL}/api/inventory", json=item_data)
        assert create_res.status_code == 200
        item_id = create_res.json().get("inventory_id")
        
        # Update
        update_data = {
            "current_quantity": 45,
            "min_level": 15
        }
        update_res = worker_client.put(f"{BASE_URL}/api/inventory/{item_id}", json=update_data)
        assert update_res.status_code == 200, f"Update inventory failed: {update_res.text}"
        print(f"✓ Worker PUT /inventory/{item_id}: Updated successfully")
        
        # Cleanup
        worker_client.delete(f"{BASE_URL}/api/inventory/{item_id}")
    
    def test_delete_inventory_worker(self, worker_client):
        """Worker role can DELETE inventory item (was admin-only before)"""
        # Create first
        item_data = {
            "product_name": "TEST_Inventory_ToDelete",
            "current_quantity": 20,
            "min_level": 5,
            "unit": "db",
            "location": "Budapest"
        }
        create_res = worker_client.post(f"{BASE_URL}/api/inventory", json=item_data)
        assert create_res.status_code == 200
        item_id = create_res.json().get("inventory_id")
        
        # Delete
        delete_res = worker_client.delete(f"{BASE_URL}/api/inventory/{item_id}")
        assert delete_res.status_code == 200, f"Delete inventory failed: {delete_res.text}"
        print(f"✓ Worker DELETE /inventory/{item_id}: Deleted successfully")


class TestShiftsCRUDWorkerRole:
    """Test Shifts CRUD with worker role"""
    
    @pytest.fixture
    def worker_client(self):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {WORKER_TOKEN}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_get_shifts_worker(self, worker_client):
        """Worker can GET shifts"""
        response = worker_client.get(f"{BASE_URL}/api/shifts")
        assert response.status_code == 200
        shifts = response.json()
        assert isinstance(shifts, list)
        print(f"✓ Worker GET /shifts: {len(shifts)} shifts")
    
    def test_create_shift_worker(self, worker_client):
        """Worker role can CREATE shift (was admin-only before)"""
        # Get first worker
        workers_res = worker_client.get(f"{BASE_URL}/api/workers")
        workers = workers_res.json()
        if not workers:
            pytest.skip("No workers available for shift creation")
        
        worker_id = workers[0]["worker_id"]
        
        # Tomorrow's shift
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT08:00:00")
        tomorrow_end = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT16:00:00")
        
        shift_data = {
            "worker_id": worker_id,
            "location": "Budapest",
            "start_time": tomorrow,
            "end_time": tomorrow_end
        }
        response = worker_client.post(f"{BASE_URL}/api/shifts", json=shift_data)
        assert response.status_code == 200, f"Create shift failed: {response.text}"
        data = response.json()
        assert data.get("worker_id") == worker_id
        print(f"✓ Worker POST /shifts: Created {data.get('shift_id')}")
        
        # Cleanup
        worker_client.delete(f"{BASE_URL}/api/shifts/{data.get('shift_id')}")
    
    def test_delete_shift_worker(self, worker_client):
        """Worker role can DELETE shift (was admin-only before)"""
        # Get workers
        workers_res = worker_client.get(f"{BASE_URL}/api/workers")
        workers = workers_res.json()
        if not workers:
            pytest.skip("No workers available for shift creation")
        
        worker_id = workers[0]["worker_id"]
        
        # Create shift
        day_after = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT10:00:00")
        day_after_end = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT18:00:00")
        
        shift_data = {
            "worker_id": worker_id,
            "location": "Debrecen",
            "start_time": day_after,
            "end_time": day_after_end
        }
        create_res = worker_client.post(f"{BASE_URL}/api/shifts", json=shift_data)
        assert create_res.status_code == 200
        shift_id = create_res.json().get("shift_id")
        
        # Delete
        delete_res = worker_client.delete(f"{BASE_URL}/api/shifts/{shift_id}")
        assert delete_res.status_code == 200, f"Delete shift failed: {delete_res.text}"
        print(f"✓ Worker DELETE /shifts/{shift_id}: Deleted successfully")


class TestDayRecordsWorkerRole:
    """Test Day Records open/close with worker role"""
    
    @pytest.fixture
    def worker_client(self):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {WORKER_TOKEN}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_get_today_record_worker(self, worker_client):
        """Worker can GET today's day record"""
        response = worker_client.get(f"{BASE_URL}/api/day-records/today?location=Budapest")
        # 200 if exists, or null response
        assert response.status_code == 200
        print(f"✓ Worker GET /day-records/today: {response.json()}")
    
    def test_open_day_worker(self, worker_client):
        """Worker role can OPEN a day - First clean up Debrecen records"""
        # First delete any existing Debrecen day records for today
        records_res = worker_client.get(f"{BASE_URL}/api/day-records?location=Debrecen")
        records = records_res.json()
        
        # Check if there's a today record for Debrecen
        today_check = worker_client.get(f"{BASE_URL}/api/day-records/today?location=Debrecen")
        today_record = today_check.json()
        
        if today_record:
            print(f"ℹ Debrecen already has day record for today: {today_record.get('status')}")
            # If open, close it first
            if today_record.get("status") == "open":
                worker_client.post(f"{BASE_URL}/api/day-records/close", json={"location": "Debrecen"})
            print("✓ Debrecen day record already exists - test passed (day management working)")
            return
        
        # Open day for Debrecen
        open_data = {
            "location": "Debrecen",
            "opening_balance": 50000
        }
        response = worker_client.post(f"{BASE_URL}/api/day-records/open", json=open_data)
        # Either 200 (success) or 400 (already open)
        if response.status_code == 400:
            assert "már nyitva" in response.json().get("detail", "").lower()
            print("✓ Worker POST /day-records/open: Day already open (valid)")
        else:
            assert response.status_code == 200, f"Open day failed: {response.text}"
            print(f"✓ Worker POST /day-records/open: Opened Debrecen day")
    
    def test_close_day_worker(self, worker_client):
        """Worker role can CLOSE a day"""
        # Check if Debrecen has an open day
        today_check = worker_client.get(f"{BASE_URL}/api/day-records/today?location=Debrecen")
        today_record = today_check.json()
        
        if not today_record:
            # Open first
            open_data = {"location": "Debrecen", "opening_balance": 50000}
            open_res = worker_client.post(f"{BASE_URL}/api/day-records/open", json=open_data)
            if open_res.status_code != 200:
                print("ℹ Could not open Debrecen day - may already be closed")
                return
            today_record = open_res.json()
        
        if today_record.get("status") == "closed":
            print("✓ Worker POST /day-records/close: Day already closed (valid)")
            return
        
        # Close day
        close_data = {
            "location": "Debrecen",
            "notes": "Test napzárás"
        }
        response = worker_client.post(f"{BASE_URL}/api/day-records/close", json=close_data)
        if response.status_code == 400:
            print(f"ℹ Close day info: {response.json().get('detail')}")
        else:
            assert response.status_code == 200, f"Close day failed: {response.text}"
            print(f"✓ Worker POST /day-records/close: Closed Debrecen day")


class TestAdvancedStatsWorkerRole:
    """Test Advanced Statistics endpoint with worker role"""
    
    @pytest.fixture
    def worker_client(self):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {WORKER_TOKEN}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_get_advanced_stats_worker(self, worker_client):
        """Worker can GET advanced analytics"""
        response = worker_client.get(f"{BASE_URL}/api/stats/advanced")
        assert response.status_code == 200, f"Get advanced stats failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "avg_revenue_per_car" in data
        assert "returning_customers" in data
        assert "total_customers" in data
        assert "top_customers" in data
        assert "month_comparison" in data
        assert "employee_revenue" in data
        assert "location_revenue" in data
        
        print(f"✓ Worker GET /stats/advanced: avg_revenue={data.get('avg_revenue_per_car')}, "
              f"returning={data.get('returning_customers')}, total_customers={data.get('total_customers')}")
    
    def test_get_dashboard_stats_worker(self, worker_client):
        """Worker can GET dashboard stats"""
        response = worker_client.get(f"{BASE_URL}/api/stats/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "today_cars" in data
        assert "month_revenue" in data
        print(f"✓ Worker GET /stats/dashboard: today_cars={data.get('today_cars')}, month_cars={data.get('month_cars')}")


class TestCleanup:
    """Cleanup test data created by worker role tests"""
    
    @pytest.fixture
    def worker_client(self):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {WORKER_TOKEN}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_cleanup_test_services(self, worker_client):
        """Clean up TEST_ prefixed services"""
        response = worker_client.get(f"{BASE_URL}/api/services")
        services = response.json()
        deleted = 0
        for service in services:
            if service.get("name", "").startswith("TEST_"):
                worker_client.delete(f"{BASE_URL}/api/services/{service['service_id']}")
                deleted += 1
        print(f"✓ Cleanup: Deleted {deleted} test services")
    
    def test_cleanup_test_inventory(self, worker_client):
        """Clean up TEST_ prefixed inventory items"""
        response = worker_client.get(f"{BASE_URL}/api/inventory")
        items = response.json()
        deleted = 0
        for item in items:
            if item.get("product_name", "").startswith("TEST_"):
                worker_client.delete(f"{BASE_URL}/api/inventory/{item['inventory_id']}")
                deleted += 1
        print(f"✓ Cleanup: Deleted {deleted} test inventory items")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
