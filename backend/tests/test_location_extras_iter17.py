"""
Iteration 17: Test Location and Extras CRUD Features
- GET /api/services/locations returns Debrecen and Budapest
- GET /api/services/extras?location=X returns filtered extras
- POST/PUT/DELETE /api/services/extras CRUD operations
- GET /api/services/pricing-data?location=X returns filtered extras
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLocationsEndpoint:
    """Test GET /api/services/locations endpoint"""
    
    def test_get_locations_returns_debrecen_and_budapest(self):
        """Verify locations endpoint returns both Debrecen and Budapest"""
        response = requests.get(f"{BASE_URL}/api/services/locations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        locations = response.json()
        assert isinstance(locations, list), "Response should be a list"
        assert len(locations) >= 2, f"Expected at least 2 locations, got {len(locations)}"
        
        location_ids = [loc.get('id') for loc in locations]
        assert 'Debrecen' in location_ids, "Debrecen should be in locations"
        assert 'Budapest' in location_ids, "Budapest should be in locations"
        print(f"✓ Locations endpoint returns: {location_ids}")


class TestExtrasFiltering:
    """Test extras filtering by location"""
    
    def test_get_extras_without_location_returns_all(self):
        """GET /api/services/extras without location param returns all extras"""
        response = requests.get(f"{BASE_URL}/api/services/extras")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        extras = response.json()
        assert isinstance(extras, list), "Response should be a list"
        print(f"✓ Extras without location filter: {len(extras)} items")
    
    def test_get_extras_with_debrecen_location(self):
        """GET /api/services/extras?location=Debrecen returns Debrecen + universal extras"""
        response = requests.get(f"{BASE_URL}/api/services/extras?location=Debrecen")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        extras = response.json()
        assert isinstance(extras, list), "Response should be a list"
        
        # Check that all returned extras are either Debrecen or universal (null location)
        for extra in extras:
            loc = extra.get('location')
            assert loc in [None, 'Debrecen'], f"Extra '{extra.get('name')}' has location '{loc}', expected Debrecen or null"
        
        print(f"✓ Debrecen extras: {len(extras)} items")
    
    def test_get_extras_with_budapest_location(self):
        """GET /api/services/extras?location=Budapest returns Budapest + universal extras"""
        response = requests.get(f"{BASE_URL}/api/services/extras?location=Budapest")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        extras = response.json()
        assert isinstance(extras, list), "Response should be a list"
        
        # Check that all returned extras are either Budapest or universal (null location)
        for extra in extras:
            loc = extra.get('location')
            assert loc in [None, 'Budapest'], f"Extra '{extra.get('name')}' has location '{loc}', expected Budapest or null"
        
        print(f"✓ Budapest extras: {len(extras)} items")


class TestPricingDataLocationFilter:
    """Test pricing-data endpoint with location filter"""
    
    def test_pricing_data_without_location(self):
        """GET /api/services/pricing-data returns all data"""
        response = requests.get(f"{BASE_URL}/api/services/pricing-data")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'package_features' in data, "Response should have package_features"
        assert 'price_matrix' in data, "Response should have price_matrix"
        assert 'extras' in data, "Response should have extras"
        print(f"✓ Pricing data without location: {len(data.get('extras', []))} extras")
    
    def test_pricing_data_with_debrecen_location(self):
        """GET /api/services/pricing-data?location=Debrecen returns filtered extras"""
        response = requests.get(f"{BASE_URL}/api/services/pricing-data?location=Debrecen")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        extras = data.get('extras', [])
        
        # Check that all returned extras are either Debrecen or universal
        for extra in extras:
            loc = extra.get('location')
            assert loc in [None, 'Debrecen'], f"Extra '{extra.get('name')}' has location '{loc}', expected Debrecen or null"
        
        print(f"✓ Pricing data Debrecen: {len(extras)} extras")
    
    def test_pricing_data_with_budapest_location(self):
        """GET /api/services/pricing-data?location=Budapest returns filtered extras"""
        response = requests.get(f"{BASE_URL}/api/services/pricing-data?location=Budapest")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        extras = data.get('extras', [])
        
        # Check that all returned extras are either Budapest or universal
        for extra in extras:
            loc = extra.get('location')
            assert loc in [None, 'Budapest'], f"Extra '{extra.get('name')}' has location '{loc}', expected Budapest or null"
        
        print(f"✓ Pricing data Budapest: {len(extras)} extras")


class TestExtrasCRUD:
    """Test Extras CRUD operations (requires admin auth)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "admin123"}
        )
        if login_response.status_code != 200:
            pytest.skip("Admin login failed - skipping authenticated tests")
        self.auth_cookies = login_response.cookies
        yield
        # Cleanup: try to delete test extras
        try:
            extras_response = self.session.get(
                f"{BASE_URL}/api/services/extras/admin",
                cookies=self.auth_cookies
            )
            if extras_response.status_code == 200:
                for extra in extras_response.json():
                    if extra.get('name', '').startswith('TEST_'):
                        self.session.delete(
                            f"{BASE_URL}/api/services/extras/{extra['service_id']}",
                            cookies=self.auth_cookies
                        )
        except:
            pass
    
    def test_create_extra_debrecen(self):
        """POST /api/services/extras creates a new extra for Debrecen"""
        payload = {
            "name": "TEST_Debrecen_Extra",
            "category": "extra_kulso",
            "price": 5000,
            "description": "Test extra for Debrecen",
            "location": "Debrecen"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/services/extras",
            json=payload,
            cookies=self.auth_cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get('name') == payload['name'], "Name should match"
        assert data.get('location') == 'Debrecen', "Location should be Debrecen"
        assert 'service_id' in data, "Response should have service_id"
        
        self.created_extra_id = data['service_id']
        print(f"✓ Created Debrecen extra: {data['service_id']}")
    
    def test_create_extra_budapest(self):
        """POST /api/services/extras creates a new extra for Budapest"""
        payload = {
            "name": "TEST_Budapest_Extra",
            "category": "extra_belso",
            "price": 7000,
            "description": "Test extra for Budapest",
            "location": "Budapest"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/services/extras",
            json=payload,
            cookies=self.auth_cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get('name') == payload['name'], "Name should match"
        assert data.get('location') == 'Budapest', "Location should be Budapest"
        print(f"✓ Created Budapest extra: {data['service_id']}")
    
    def test_create_extra_universal(self):
        """POST /api/services/extras creates a universal extra (no location)"""
        payload = {
            "name": "TEST_Universal_Extra",
            "category": "extra_special",
            "price": 10000,
            "description": "Test universal extra",
            "location": None
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/services/extras",
            json=payload,
            cookies=self.auth_cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get('name') == payload['name'], "Name should match"
        assert data.get('location') is None, "Location should be null for universal"
        print(f"✓ Created universal extra: {data['service_id']}")
    
    def test_update_extra(self):
        """PUT /api/services/extras/{id} updates an extra"""
        # First create an extra
        create_payload = {
            "name": "TEST_Update_Extra",
            "category": "extra_kulso",
            "price": 3000,
            "location": "Debrecen"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/services/extras",
            json=create_payload,
            cookies=self.auth_cookies
        )
        assert create_response.status_code == 200
        extra_id = create_response.json()['service_id']
        
        # Update the extra
        update_payload = {
            "name": "TEST_Update_Extra_Modified",
            "price": 4500,
            "location": "Budapest"
        }
        
        update_response = self.session.put(
            f"{BASE_URL}/api/services/extras/{extra_id}",
            json=update_payload,
            cookies=self.auth_cookies
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        print(f"✓ Updated extra: {extra_id}")
    
    def test_delete_extra(self):
        """DELETE /api/services/extras/{id} deletes an extra"""
        # First create an extra
        create_payload = {
            "name": "TEST_Delete_Extra",
            "category": "extra_kulso",
            "price": 2000,
            "location": "Debrecen"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/services/extras",
            json=create_payload,
            cookies=self.auth_cookies
        )
        assert create_response.status_code == 200
        extra_id = create_response.json()['service_id']
        
        # Delete the extra
        delete_response = self.session.delete(
            f"{BASE_URL}/api/services/extras/{extra_id}",
            cookies=self.auth_cookies
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        # Verify deletion - should return 404
        get_response = self.session.get(
            f"{BASE_URL}/api/services/extras/admin",
            cookies=self.auth_cookies
        )
        extras = get_response.json()
        extra_ids = [e['service_id'] for e in extras]
        assert extra_id not in extra_ids, "Deleted extra should not be in list"
        print(f"✓ Deleted extra: {extra_id}")
    
    def test_create_extra_requires_admin(self):
        """POST /api/services/extras requires admin role"""
        # Try without auth
        payload = {
            "name": "TEST_NoAuth_Extra",
            "category": "extra_kulso",
            "price": 1000
        }
        
        response = requests.post(
            f"{BASE_URL}/api/services/extras",
            json=payload
        )
        # Should fail with 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Create extra requires authentication")


class TestExtrasAdminEndpoint:
    """Test admin extras endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "admin123"}
        )
        if login_response.status_code != 200:
            pytest.skip("Admin login failed")
        self.auth_cookies = login_response.cookies
    
    def test_get_extras_admin_all(self):
        """GET /api/services/extras/admin returns all extras for admin"""
        response = self.session.get(
            f"{BASE_URL}/api/services/extras/admin",
            cookies=self.auth_cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        extras = response.json()
        assert isinstance(extras, list), "Response should be a list"
        print(f"✓ Admin extras endpoint: {len(extras)} items")
    
    def test_get_extras_admin_filtered_by_location(self):
        """GET /api/services/extras/admin?location=Debrecen returns filtered extras"""
        response = self.session.get(
            f"{BASE_URL}/api/services/extras/admin?location=Debrecen",
            cookies=self.auth_cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        extras = response.json()
        for extra in extras:
            assert extra.get('location') == 'Debrecen', f"Extra should have Debrecen location"
        
        print(f"✓ Admin extras filtered by Debrecen: {len(extras)} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
