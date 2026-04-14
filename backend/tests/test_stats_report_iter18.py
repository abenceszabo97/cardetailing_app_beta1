"""
Test Statistics Report and Low Stock Notifications - Iteration 18
Tests:
- /api/stats/report endpoint with daily/weekly/monthly periods
- /api/notifications/low-stock endpoint with severity field
- Inventory location options (Budapest support)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStatsReport:
    """Test /api/stats/report endpoint for PDF report generation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    
    def test_report_daily_period(self):
        """Test report endpoint with period=daily"""
        res = self.session.get(f"{BASE_URL}/api/stats/report?period=daily&date=2025-01-15")
        assert res.status_code == 200, f"Daily report failed: {res.text}"
        
        data = res.json()
        # Verify response structure
        assert "period" in data
        assert data["period"] == "daily"
        assert "date_range" in data
        assert "start" in data["date_range"]
        assert "end" in data["date_range"]
        assert data["date_range"]["start"] == "2025-01-15"
        assert data["date_range"]["end"] == "2025-01-15"
        assert "summary" in data
        assert "total_cars" in data["summary"]
        assert "total_revenue" in data["summary"]
        assert "cash_revenue" in data["summary"]
        assert "card_revenue" in data["summary"]
        assert "worker_breakdown" in data
        assert "service_breakdown" in data
        assert "daily_breakdown" in data
        assert isinstance(data["worker_breakdown"], list)
        assert isinstance(data["service_breakdown"], list)
        assert isinstance(data["daily_breakdown"], list)
        print(f"Daily report structure verified: period={data['period']}, date_range={data['date_range']}")
    
    def test_report_weekly_period(self):
        """Test report endpoint with period=weekly"""
        res = self.session.get(f"{BASE_URL}/api/stats/report?period=weekly&date=2025-01-15")
        assert res.status_code == 200, f"Weekly report failed: {res.text}"
        
        data = res.json()
        assert data["period"] == "weekly"
        # Weekly should span Monday to Sunday
        assert "date_range" in data
        assert data["date_range"]["start"] == "2025-01-13"  # Monday
        assert data["date_range"]["end"] == "2025-01-19"    # Sunday
        assert "worker_breakdown" in data
        assert "service_breakdown" in data
        assert "daily_breakdown" in data
        print(f"Weekly report structure verified: period={data['period']}, date_range={data['date_range']}")
    
    def test_report_monthly_period(self):
        """Test report endpoint with period=monthly"""
        res = self.session.get(f"{BASE_URL}/api/stats/report?period=monthly&date=2025-01-15")
        assert res.status_code == 200, f"Monthly report failed: {res.text}"
        
        data = res.json()
        assert data["period"] == "monthly"
        assert "date_range" in data
        assert data["date_range"]["start"] == "2025-01-01"
        assert data["date_range"]["end"] == "2025-01-31"
        assert "worker_breakdown" in data
        assert "service_breakdown" in data
        assert "daily_breakdown" in data
        print(f"Monthly report structure verified: period={data['period']}, date_range={data['date_range']}")
    
    def test_report_with_location_filter(self):
        """Test report endpoint with location filter"""
        res = self.session.get(f"{BASE_URL}/api/stats/report?period=daily&date=2025-01-15&location=Debrecen")
        assert res.status_code == 200, f"Report with location failed: {res.text}"
        
        data = res.json()
        assert data["location"] == "Debrecen"
        print(f"Report with location filter verified: location={data['location']}")


class TestLowStockNotifications:
    """Test /api/notifications/low-stock endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    
    def test_low_stock_returns_severity_field(self):
        """Test that low stock notifications include severity field"""
        res = self.session.get(f"{BASE_URL}/api/notifications/low-stock")
        assert res.status_code == 200, f"Low stock endpoint failed: {res.text}"
        
        data = res.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are low stock items, verify severity field
        if len(data) > 0:
            for item in data:
                assert "inventory_id" in item
                assert "product_name" in item
                assert "current_quantity" in item
                assert "min_level" in item
                assert "severity" in item, f"Missing severity field in item: {item}"
                assert item["severity"] in ["critical", "warning"], f"Invalid severity: {item['severity']}"
                print(f"Low stock item: {item['product_name']} - severity={item['severity']}, qty={item['current_quantity']}/{item['min_level']}")
        else:
            print("No low stock items found (this is OK)")
    
    def test_severity_critical_when_zero(self):
        """Test that severity is 'critical' when quantity is 0 or less"""
        res = self.session.get(f"{BASE_URL}/api/notifications/low-stock")
        assert res.status_code == 200
        
        data = res.json()
        for item in data:
            if item["current_quantity"] <= 0:
                assert item["severity"] == "critical", f"Expected critical for qty=0, got {item['severity']}"
                print(f"Verified critical severity for {item['product_name']} (qty={item['current_quantity']})")


class TestInventoryLocations:
    """Test inventory supports Budapest location"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    
    def test_inventory_list(self):
        """Test inventory endpoint returns items"""
        res = self.session.get(f"{BASE_URL}/api/inventory")
        assert res.status_code == 200, f"Inventory list failed: {res.text}"
        
        data = res.json()
        assert isinstance(data, list)
        print(f"Inventory has {len(data)} items")
    
    def test_inventory_filter_by_location(self):
        """Test inventory can be filtered by location"""
        # Test Debrecen filter
        res = self.session.get(f"{BASE_URL}/api/inventory?location=Debrecen")
        assert res.status_code == 200, f"Inventory Debrecen filter failed: {res.text}"
        
        data = res.json()
        for item in data:
            assert item.get("location") == "Debrecen", f"Expected Debrecen, got {item.get('location')}"
        print(f"Debrecen inventory: {len(data)} items")
        
        # Test Budapest filter
        res = self.session.get(f"{BASE_URL}/api/inventory?location=Budapest")
        assert res.status_code == 200, f"Inventory Budapest filter failed: {res.text}"
        
        data = res.json()
        for item in data:
            assert item.get("location") == "Budapest", f"Expected Budapest, got {item.get('location')}"
        print(f"Budapest inventory: {len(data)} items")
    
    def test_create_inventory_with_budapest_location(self):
        """Test creating inventory item with Budapest location"""
        new_item = {
            "product_name": "TEST_Budapest_Item",
            "current_quantity": 10,
            "min_level": 5,
            "unit": "db",
            "location": "Budapest"
        }
        
        res = self.session.post(f"{BASE_URL}/api/inventory", json=new_item)
        assert res.status_code in [200, 201], f"Create inventory failed: {res.text}"
        
        data = res.json()
        assert data.get("location") == "Budapest", f"Expected Budapest, got {data.get('location')}"
        print(f"Created Budapest inventory item: {data.get('inventory_id')}")
        
        # Cleanup - delete the test item
        item_id = data.get("inventory_id")
        if item_id:
            del_res = self.session.delete(f"{BASE_URL}/api/inventory/{item_id}")
            assert del_res.status_code in [200, 204], f"Delete failed: {del_res.text}"
            print(f"Cleaned up test item: {item_id}")


class TestDashboardLowStock:
    """Test Dashboard low stock alert integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    
    def test_dashboard_stats_endpoint(self):
        """Test dashboard stats endpoint works"""
        res = self.session.get(f"{BASE_URL}/api/stats/dashboard")
        assert res.status_code == 200, f"Dashboard stats failed: {res.text}"
        
        data = res.json()
        assert "today_cars" in data
        assert "today_revenue" in data
        assert "today_cash" in data
        assert "today_card" in data
        print(f"Dashboard stats: today_cars={data['today_cars']}, today_revenue={data['today_revenue']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
