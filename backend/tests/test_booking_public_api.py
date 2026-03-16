"""
Test suite for X-CLEAN Public Booking API endpoints
Tests: /api/bookings/public-locations, /api/bookings/public-services, 
       /api/bookings/available-slots, POST /api/bookings
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicBookingAPI:
    """Tests for public booking endpoints (no auth required)"""
    
    def test_get_public_locations_returns_200(self):
        """GET /api/bookings/public-locations returns 200"""
        response = requests.get(f"{BASE_URL}/api/bookings/public-locations")
        assert response.status_code == 200
        print(f"SUCCESS: GET /api/bookings/public-locations returned 200")
    
    def test_get_public_locations_returns_array(self):
        """GET /api/bookings/public-locations returns array of locations"""
        response = requests.get(f"{BASE_URL}/api/bookings/public-locations")
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"SUCCESS: Locations returned: {data}")
    
    def test_get_public_locations_contains_budapest_debrecen(self):
        """GET /api/bookings/public-locations contains Budapest and Debrecen"""
        response = requests.get(f"{BASE_URL}/api/bookings/public-locations")
        data = response.json()
        assert "Budapest" in data
        assert "Debrecen" in data
        print(f"SUCCESS: Both Budapest and Debrecen locations available")
    
    def test_get_public_services_returns_200(self):
        """GET /api/bookings/public-services returns 200"""
        response = requests.get(f"{BASE_URL}/api/bookings/public-services")
        assert response.status_code == 200
        print(f"SUCCESS: GET /api/bookings/public-services returned 200")
    
    def test_get_public_services_returns_array(self):
        """GET /api/bookings/public-services returns array of services"""
        response = requests.get(f"{BASE_URL}/api/bookings/public-services")
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"SUCCESS: {len(data)} services returned")
    
    def test_get_public_services_has_required_fields(self):
        """GET /api/bookings/public-services - services have required fields"""
        response = requests.get(f"{BASE_URL}/api/bookings/public-services")
        data = response.json()
        service = data[0]
        required_fields = ["service_id", "name", "price", "duration"]
        for field in required_fields:
            assert field in service, f"Missing field: {field}"
        print(f"SUCCESS: Services have all required fields: {required_fields}")
    
    def test_get_available_slots_returns_200(self):
        """GET /api/bookings/available-slots returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/bookings/available-slots",
            params={"location": "Budapest", "date": "2026-01-25"}
        )
        assert response.status_code == 200
        print(f"SUCCESS: GET /api/bookings/available-slots returned 200")
    
    def test_get_available_slots_returns_array(self):
        """GET /api/bookings/available-slots returns array of slots"""
        response = requests.get(
            f"{BASE_URL}/api/bookings/available-slots",
            params={"location": "Budapest", "date": "2026-01-25"}
        )
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: {len(data)} time slots returned")
    
    def test_get_available_slots_has_time_and_workers(self):
        """GET /api/bookings/available-slots - slots have time_slot and available_workers"""
        response = requests.get(
            f"{BASE_URL}/api/bookings/available-slots",
            params={"location": "Budapest", "date": "2026-01-25"}
        )
        data = response.json()
        if len(data) > 0:
            slot = data[0]
            assert "time_slot" in slot
            assert "available_workers" in slot
            assert isinstance(slot["available_workers"], list)
            print(f"SUCCESS: Slots have time_slot and available_workers fields")
        else:
            print("INFO: No slots available for this date")
    
    def test_get_available_slots_workers_have_id_and_name(self):
        """GET /api/bookings/available-slots - workers have worker_id and name"""
        response = requests.get(
            f"{BASE_URL}/api/bookings/available-slots",
            params={"location": "Budapest", "date": "2026-01-25"}
        )
        data = response.json()
        if len(data) > 0 and len(data[0]["available_workers"]) > 0:
            worker = data[0]["available_workers"][0]
            assert "worker_id" in worker
            assert "name" in worker
            print(f"SUCCESS: Workers have worker_id and name: {worker}")
        else:
            print("INFO: No workers available for this slot")


class TestBookingCreation:
    """Tests for booking creation endpoint"""
    
    @pytest.fixture
    def service_id(self):
        """Get a valid service_id for testing"""
        response = requests.get(f"{BASE_URL}/api/bookings/public-services")
        services = response.json()
        return services[0]["service_id"]
    
    def test_create_booking_returns_201_or_200(self, service_id):
        """POST /api/bookings creates booking successfully"""
        unique_plate = f"TEST-{uuid.uuid4().hex[:4].upper()}"
        booking_data = {
            "customer_name": "Test Booking User",
            "car_type": "Test Car",
            "plate_number": unique_plate,
            "email": "testbooking@example.com",
            "phone": "+36301234567",
            "service_id": service_id,
            "location": "Budapest",
            "date": "2026-01-25",
            "time_slot": "14:00"
        }
        response = requests.post(
            f"{BASE_URL}/api/bookings",
            json=booking_data
        )
        assert response.status_code in [200, 201]
        print(f"SUCCESS: POST /api/bookings returned {response.status_code}")
    
    def test_create_booking_returns_booking_data(self, service_id):
        """POST /api/bookings returns created booking data"""
        unique_plate = f"TEST-{uuid.uuid4().hex[:4].upper()}"
        booking_data = {
            "customer_name": "Test Return Data",
            "car_type": "BMW X3",
            "plate_number": unique_plate,
            "email": "testreturn@example.com",
            "phone": "+36309876543",
            "service_id": service_id,
            "location": "Debrecen",
            "date": "2026-01-26",
            "time_slot": "11:00"
        }
        response = requests.post(
            f"{BASE_URL}/api/bookings",
            json=booking_data
        )
        data = response.json()
        
        # Verify returned data
        assert "booking_id" in data
        assert data["customer_name"] == "Test Return Data"
        assert data["plate_number"] == unique_plate
        assert data["location"] == "Debrecen"
        assert data["date"] == "2026-01-26"
        assert data["time_slot"] == "11:00"
        assert data["status"] == "foglalt"
        print(f"SUCCESS: Booking created with ID: {data['booking_id']}")
    
    def test_create_booking_with_optional_fields(self, service_id):
        """POST /api/bookings with optional fields (notes, address, invoice)"""
        unique_plate = f"TEST-{uuid.uuid4().hex[:4].upper()}"
        booking_data = {
            "customer_name": "Test Optional Fields",
            "car_type": "Mercedes C",
            "plate_number": unique_plate,
            "email": "testoptional@example.com",
            "phone": "+36301112222",
            "service_id": service_id,
            "location": "Budapest",
            "date": "2026-01-27",
            "time_slot": "15:30",
            "address": "Test Address 123",
            "notes": "Test notes for booking",
            "invoice_name": "Test Company Kft.",
            "invoice_tax_number": "12345678-1-42",
            "invoice_address": "Invoice Address 456"
        }
        response = requests.post(
            f"{BASE_URL}/api/bookings",
            json=booking_data
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["notes"] == "Test notes for booking"
        print(f"SUCCESS: Booking with optional fields created")
    
    def test_create_booking_invalid_service_returns_404(self):
        """POST /api/bookings with invalid service_id returns 404"""
        booking_data = {
            "customer_name": "Test Invalid Service",
            "car_type": "Test Car",
            "plate_number": "INV-001",
            "email": "testinvalid@example.com",
            "phone": "+36301234567",
            "service_id": "invalid_service_id",
            "location": "Budapest",
            "date": "2026-01-25",
            "time_slot": "10:00"
        }
        response = requests.post(
            f"{BASE_URL}/api/bookings",
            json=booking_data
        )
        assert response.status_code == 404
        print(f"SUCCESS: Invalid service_id returns 404")
    
    def test_create_booking_missing_required_field_returns_422(self):
        """POST /api/bookings with missing required field returns 422"""
        booking_data = {
            "customer_name": "Test Missing Field",
            # Missing: car_type, plate_number, email, phone, service_id, location, date, time_slot
        }
        response = requests.post(
            f"{BASE_URL}/api/bookings",
            json=booking_data
        )
        assert response.status_code == 422
        print(f"SUCCESS: Missing required fields returns 422")


class TestBookingAPIAuthentication:
    """Tests for authenticated booking endpoints"""
    
    def test_get_bookings_requires_auth(self):
        """GET /api/bookings requires authentication"""
        response = requests.get(f"{BASE_URL}/api/bookings")
        assert response.status_code == 401
        print(f"SUCCESS: GET /api/bookings requires authentication (401)")
    
    def test_get_booking_by_id_requires_auth(self):
        """GET /api/bookings/{id} requires authentication"""
        response = requests.get(f"{BASE_URL}/api/bookings/test_id")
        assert response.status_code == 401
        print(f"SUCCESS: GET /api/bookings/{id} requires authentication (401)")
    
    def test_update_booking_requires_auth(self):
        """PUT /api/bookings/{id} requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/bookings/test_id",
            json={"status": "kesz"}
        )
        assert response.status_code == 401
        print(f"SUCCESS: PUT /api/bookings/{id} requires authentication (401)")
    
    def test_delete_booking_requires_auth(self):
        """DELETE /api/bookings/{id} requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/bookings/test_id")
        assert response.status_code == 401
        print(f"SUCCESS: DELETE /api/bookings/{id} requires authentication (401)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
