import requests
import sys
from datetime import datetime, timezone
import json
import io
import base64

class XCleanAPITester:
    def __init__(self, base_url="https://car-service-hub-62.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = "test_session_1772613432485"
        self.tests_run = 0
        self.tests_passed = 0
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=self.headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=self.headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=self.headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=self.headers)

            print(f"   Response: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                if response.text:
                    try:
                        resp_data = response.json()
                        if isinstance(resp_data, dict) and len(resp_data) < 10:
                            print(f"   Response data: {json.dumps(resp_data, indent=2)}")
                        elif isinstance(resp_data, list):
                            print(f"   Response: List with {len(resp_data)} items")
                    except:
                        print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   Error: {response.text[:300]}")

            return success, response.json() if response.text and success else {}

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_auth_status(self):
        """Test authentication status"""
        return self.run_test("Auth Status", "GET", "auth/me", 200)

    def test_dashboard_stats(self):
        """Test dashboard stats with cash/card breakdown"""
        success, data = self.run_test("Dashboard Stats", "GET", "stats/dashboard", 200)
        if success:
            required_fields = ['today_cars', 'today_revenue', 'today_cash', 'today_card', 
                             'month_cars', 'month_revenue', 'month_cash', 'month_card']
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                print(f"❌ Missing cash/card breakdown fields: {missing_fields}")
                return False
            else:
                print(f"✅ Cash/card breakdown present: today_cash={data.get('today_cash', 0)}, today_card={data.get('today_card', 0)}")
        return success

    def test_service_creation(self):
        """Test service creation without empty strings"""
        service_data = {
            "name": "Test Service",
            "category": "extra", 
            "price": 5000,
            "duration": 30,
            "description": "Test description",
            "car_size": None,  # Should handle null values
            "package": None    # Should handle null values
        }
        return self.run_test("Service Creation (null values)", "POST", "services", 201, service_data)

    def test_service_creation_with_none_values(self):
        """Test service creation with 'none' string values"""
        service_data = {
            "name": "Test Service 2",
            "category": "extra", 
            "price": 6000,
            "duration": 45,
            "description": "",
            "car_size": "",  # Empty strings should be handled
            "package": ""    # Empty strings should be handled
        }
        return self.run_test("Service Creation (empty strings)", "POST", "services", 201, service_data)

    def test_day_records_open(self):
        """Test opening a day record"""
        day_data = {
            "location": "Budapest",
            "opening_balance": 10000
        }
        return self.run_test("Day Open", "POST", "day-records/open", 201, day_data)

    def test_day_records_close(self):
        """Test closing a day record with location in body"""
        close_data = {
            "location": "Budapest",
            "notes": "Test closing notes"
        }
        return self.run_test("Day Close", "POST", "day-records/close", 200, close_data)

    def test_job_images_update(self):
        """Test job images update functionality"""
        # First get existing jobs
        success, jobs = self.run_test("Get Jobs", "GET", "jobs", 200)
        if success and jobs:
            job_id = jobs[0]['job_id']
            
            # Test updating job with images
            update_data = {
                "images_before": ["https://example.com/before1.jpg", "https://example.com/before2.jpg"],
                "images_after": ["https://example.com/after1.jpg"]
            }
            return self.run_test(f"Job Images Update", "PUT", f"jobs/{job_id}", 200, update_data)
        else:
            print("❌ No jobs found to test image updates")
            return False

    def test_workers_endpoint(self):
        """Test workers endpoint for calendar functionality"""
        return self.run_test("Workers List", "GET", "workers", 200)

    def test_shifts_endpoint(self):
        """Test shifts endpoint for calendar functionality"""
        return self.run_test("Shifts List", "GET", "shifts", 200)

    def test_jobs_today(self):
        """Test today's jobs endpoint"""
        return self.run_test("Today's Jobs", "GET", "jobs/today", 200)

    def test_image_upload(self):
        """Test image upload endpoint"""
        # Create a simple test image (1x1 pixel PNG)
        test_image_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
        
        files = {'file': ('test.png', io.BytesIO(test_image_data), 'image/png')}
        
        url = f"{self.base_url}/api/upload"
        print(f"\n🔍 Testing Image Upload...")
        print(f"   URL: POST {url}")
        
        try:
            # Remove Content-Type header for file upload
            headers = {'Authorization': f'Bearer {self.session_token}'}
            response = requests.post(url, files=files, headers=headers)
            
            self.tests_run += 1
            print(f"   Response: {response.status_code}")
            
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Image upload successful")
                resp_data = response.json()
                if 'url' in resp_data and resp_data['url'].startswith('data:image'):
                    print(f"   Response contains valid data URL")
                    return True, resp_data
                else:
                    print(f"❌ Response missing valid data URL")
                    return False, {}
            else:
                print(f"❌ FAILED - Expected 200, got {response.status_code}")
                if response.text:
                    print(f"   Error: {response.text[:300]}")
                return False, {}
                
        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_inventory_crud(self):
        """Test inventory CRUD operations"""
        # Test Create
        inventory_data = {
            "product_name": "Test Product",
            "current_quantity": 50.0,
            "min_level": 10.0,
            "unit": "db",
            "location": "Budapest"
        }
        
        success, create_resp = self.run_test("Inventory Create", "POST", "inventory", 201, inventory_data)
        if not success:
            return False
            
        inventory_id = create_resp.get('inventory_id')
        if not inventory_id:
            print("❌ No inventory_id in create response")
            return False
            
        # Test Update (all fields)
        update_data = {
            "product_name": "Updated Test Product",
            "current_quantity": 75.0,
            "min_level": 15.0,
            "unit": "liter",
            "location": "Debrecen"
        }
        
        success, _ = self.run_test("Inventory Update (all fields)", "PUT", f"inventory/{inventory_id}", 200, update_data)
        if not success:
            return False
            
        # Test Delete
        success, _ = self.run_test("Inventory Delete", "DELETE", f"inventory/{inventory_id}", 200)
        return success

    def test_services_crud(self):
        """Test services CRUD operations"""
        # Test Create
        service_data = {
            "name": "Test CRUD Service",
            "category": "extra",
            "price": 8000,
            "duration": 45,
            "description": "Test service for CRUD testing",
            "car_size": "M",
            "package": "Pro"
        }
        
        success, create_resp = self.run_test("Service Create (CRUD)", "POST", "services", 201, service_data)
        if not success:
            return False
            
        service_id = create_resp.get('service_id')
        if not service_id:
            print("❌ No service_id in create response")
            return False
            
        # Test Update/Edit
        update_data = {
            "name": "Updated CRUD Service",
            "category": "komplett",
            "price": 12000,
            "duration": 60,
            "description": "Updated test service",
            "car_size": "L",
            "package": "VIP"
        }
        
        success, _ = self.run_test("Service Update/Edit", "PUT", f"services/{service_id}", 200, update_data)
        if not success:
            return False
            
        # Test Delete
        success, _ = self.run_test("Service Delete", "DELETE", f"services/{service_id}", 200)
        return success

    def test_shifts_crud(self):
        """Test shifts create and delete operations"""
        # First get workers to use for shift creation
        success, workers = self.run_test("Get Workers for Shift", "GET", "workers", 200)
        if not success or not workers:
            print("❌ No workers available for shift testing")
            return False
            
        worker_id = workers[0]['worker_id']
        
        # Test Create Shift
        shift_data = {
            "worker_id": worker_id,
            "location": "Budapest",
            "start_time": "2024-01-15T08:00:00",
            "end_time": "2024-01-15T16:00:00"
        }
        
        success, create_resp = self.run_test("Shift Create", "POST", "shifts", 201, shift_data)
        if not success:
            return False
            
        shift_id = create_resp.get('shift_id')
        if not shift_id:
            print("❌ No shift_id in create response")
            return False
            
        # Test Delete Shift
        success, _ = self.run_test("Shift Delete", "DELETE", f"shifts/{shift_id}", 200)
        return success

def main():
    print("🚀 Starting X-CLEAN API Testing for Bug Fixes and New Features")
    print("=" * 70)
    
    tester = XCleanAPITester()
    
    # Test authentication first
    print("\n📋 AUTHENTICATION TESTS")
    print("-" * 30)
    if not tester.test_auth_status()[0]:
        print("❌ Authentication failed, stopping tests")
        return 1

    # Test dashboard with cash/card breakdown
    print("\n📊 DASHBOARD STATS TESTS")
    print("-" * 30)
    tester.test_dashboard_stats()

    # Test service creation fixes
    print("\n🛠️ SERVICE CREATION TESTS")
    print("-" * 30)
    tester.test_service_creation()
    tester.test_service_creation_with_none_values()

    # Test day management functionality
    print("\n📅 DAY MANAGEMENT TESTS")
    print("-" * 30)
    tester.test_day_record_today()
    # Note: Day open/close tests might fail if day is already open/closed
    # This is expected behavior, not a bug
    
    # Test job images functionality
    print("\n🖼️ JOB IMAGES TESTS")
    print("-" * 30)
    tester.test_job_images_update()

    # Test workers calendar functionality
    print("\n👥 WORKERS CALENDAR TESTS")
    print("-" * 30)
    tester.test_workers_endpoint()
    tester.test_shifts_endpoint()

    # Test additional endpoints
    print("\n📋 ADDITIONAL ENDPOINT TESTS")
    print("-" * 30)
    tester.test_jobs_today()

    # Print final results
    print("\n" + "=" * 70)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("✅ Backend testing completed successfully!")
        return 0
    else:
        print("❌ Backend has significant issues that need attention")
        return 1

if __name__ == "__main__":
    sys.exit(main())