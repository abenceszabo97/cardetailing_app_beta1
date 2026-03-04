#!/usr/bin/env python3
"""
X-CLEAN Car Wash Management System - Backend API Testing
Tests all API endpoints with proper authentication
"""

import requests
import sys
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

class XCleanAPITester:
    def __init__(self, base_url="https://car-service-hub-62.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = "test_session_1772613268516"  # From MongoDB setup
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_data = {}  # Store created test data for cleanup

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        
        # Default headers with auth
        default_headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {response.text[:200]}")
                
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            return False, {}

    def test_health_check(self):
        """Test API health check"""
        return self.run_test("API Health Check", "GET", "/", 200)

    def test_auth_me(self):
        """Test auth/me endpoint"""
        success, data = self.run_test("Auth Me", "GET", "/auth/me", 200)
        if success and data:
            print(f"   User: {data.get('name')} ({data.get('role')})")
        return success, data

    def test_services_crud(self):
        """Test services CRUD operations"""
        print("\n📋 Testing Services CRUD...")
        
        # GET services list
        success, services = self.run_test("Get Services", "GET", "/services", 200)
        if not success:
            return False
        
        print(f"   Found {len(services)} services")
        return True

    def test_workers_crud(self):
        """Test workers CRUD operations"""
        print("\n👷 Testing Workers CRUD...")
        
        # GET workers list
        success, workers = self.run_test("Get Workers", "GET", "/workers", 200)
        if not success:
            return False
        
        print(f"   Found {len(workers)} workers")
        return True

    def test_customers_crud(self):
        """Test customers CRUD operations"""
        print("\n👥 Testing Customers CRUD...")
        
        # GET customers list
        success, customers = self.run_test("Get Customers", "GET", "/customers", 200)
        if not success:
            return False
        
        print(f"   Found {len(customers)} customers")
        
        # POST create customer
        customer_data = {
            "name": "Test Ügyfél",
            "phone": "+36 30 123 4567",
            "car_type": "BMW X5",
            "plate_number": "TEST-123"
        }
        
        success, created_customer = self.run_test("Create Customer", "POST", "/customers", 200, customer_data)
        if success and created_customer:
            self.test_data['customer_id'] = created_customer.get('customer_id')
            print(f"   Created customer: {created_customer.get('customer_id')}")
        
        return success

    def test_jobs_crud(self):
        """Test jobs CRUD operations"""
        print("\n🚗 Testing Jobs CRUD...")
        
        # GET jobs list
        success, jobs = self.run_test("Get Jobs", "GET", "/jobs", 200)
        if not success:
            return False
        
        print(f"   Found {len(jobs)} jobs")
        
        # GET today's jobs
        success, today_jobs = self.run_test("Get Today Jobs", "GET", "/jobs/today", 200)
        if success:
            print(f"   Found {len(today_jobs)} today's jobs")
        
        return success

    def test_inventory_crud(self):
        """Test inventory CRUD operations"""
        print("\n📦 Testing Inventory CRUD...")
        
        # GET inventory list
        success, inventory = self.run_test("Get Inventory", "GET", "/inventory", 200)
        if not success:
            return False
        
        print(f"   Found {len(inventory)} inventory items")
        return True

    def test_statistics_endpoints(self):
        """Test statistics endpoints"""
        print("\n📊 Testing Statistics Endpoints...")
        
        # Dashboard stats
        success, dashboard_stats = self.run_test("Dashboard Stats", "GET", "/stats/dashboard", 200)
        if success and dashboard_stats:
            print(f"   Today cars: {dashboard_stats.get('today_cars', 0)}")
            print(f"   Today revenue: {dashboard_stats.get('today_revenue', 0)} Ft")
        
        # Daily stats
        success, daily_stats = self.run_test("Daily Stats", "GET", "/stats/daily", 200)
        if success:
            print(f"   Daily stats entries: {len(daily_stats)}")
        
        return success

    def test_day_records(self):
        """Test day records endpoints"""
        print("\n📅 Testing Day Records...")
        
        # GET day records
        success, records = self.run_test("Get Day Records", "GET", "/day-records", 200)
        if not success:
            return False
        
        print(f"   Found {len(records)} day records")
        return True

    def test_seed_data(self):
        """Test seed data endpoint"""
        print("\n🌱 Testing Seed Data...")
        
        # This might return 200 (success) or 400 (already seeded)
        success, result = self.run_test("Seed Data", "POST", "/seed", 200)
        if not success:
            # Try again expecting 400 if already seeded
            success, result = self.run_test("Seed Data (Already Exists)", "POST", "/seed", 400)
        
        return success

    def test_auth_session_exchange(self):
        """Test auth session exchange (without actual session_id)"""
        print("\n🔐 Testing Auth Session Exchange...")
        
        # This should fail without valid session_id, expecting 400
        session_data = {"session_id": "invalid_session_id"}
        success, result = self.run_test("Auth Session Exchange", "POST", "/auth/session", 400, session_data)
        
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting X-CLEAN API Tests...")
        print(f"Backend URL: {self.base_url}")
        print(f"Session Token: {self.session_token[:20]}...")
        
        # Test sequence
        tests = [
            self.test_health_check,
            self.test_auth_me,
            self.test_auth_session_exchange,
            self.test_services_crud,
            self.test_workers_crud,
            self.test_customers_crud,
            self.test_jobs_crud,
            self.test_inventory_crud,
            self.test_statistics_endpoints,
            self.test_day_records,
            self.test_seed_data,
        ]
        
        for test_func in tests:
            try:
                test_func()
            except Exception as e:
                print(f"❌ Test {test_func.__name__} crashed: {str(e)}")
                self.failed_tests.append({
                    "test": test_func.__name__,
                    "error": f"Test crashed: {str(e)}"
                })
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"  - {failure.get('test', 'Unknown')}: {failure.get('error', failure.get('actual', 'Unknown error'))}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = XCleanAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Test suite crashed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())