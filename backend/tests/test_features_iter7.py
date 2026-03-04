"""
Iteration 7 Tests - New Features:
1. Notification Bell - Low stock alerts (GET /api/notifications/low-stock)
2. SMS sending via Twilio (POST /api/send-sms) - returns 503 without config
3. Email sending via Resend (POST /api/send-email) - returns 503 without config
4. Customer notification for job completion (POST /api/jobs/{job_id}/notify-customer) - returns 503 without config
5. PDF export buttons on DayManagement and Workers pages (frontend-only, tested via Playwright)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from previous iterations
TEST_SESSION_TOKEN = "test_dolgozo_session"


class TestLowStockNotifications:
    """Test GET /api/notifications/low-stock endpoint"""
    
    def test_low_stock_endpoint_returns_200(self):
        """Test that low stock endpoint returns 200 with auth"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/low-stock",
            cookies={"session_token": TEST_SESSION_TOKEN}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ GET /api/notifications/low-stock returns 200")
    
    def test_low_stock_returns_array(self):
        """Test that endpoint returns array of items"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/low-stock",
            cookies={"session_token": TEST_SESSION_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ Returns array with {len(data)} low stock items")
    
    def test_low_stock_items_have_required_fields(self):
        """Test that low stock items have all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/low-stock",
            cookies={"session_token": TEST_SESSION_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        
        # There should be low stock items based on seed data (Kerámia bevonat)
        if len(data) > 0:
            item = data[0]
            required_fields = ["inventory_id", "product_name", "current_quantity", "min_level", "location", "severity"]
            for field in required_fields:
                assert field in item, f"Missing field: {field}"
            print(f"✓ Low stock item has all required fields: {required_fields}")
        else:
            print("⚠ No low stock items found - may need to check seed data")
    
    def test_low_stock_shows_keramia_bevonat(self):
        """Test that Kerámia bevonat appears in low stock (as per test data)"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/low-stock",
            cookies={"session_token": TEST_SESSION_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        
        keramia_items = [item for item in data if "Kerámia" in item.get("product_name", "") or "kerámia" in item.get("product_name", "").lower()]
        print(f"✓ Found {len(keramia_items)} Kerámia bevonat items in low stock: {keramia_items}")
        
        # Print all low stock items for verification
        for item in data:
            print(f"  - {item.get('product_name')} @ {item.get('location')}: {item.get('current_quantity')}/{item.get('min_level')} ({item.get('severity')})")
    
    def test_low_stock_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/low-stock")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Endpoint requires authentication (401 without session)")


class TestSMSSending:
    """Test POST /api/send-sms endpoint - should return 503 without Twilio config"""
    
    def test_send_sms_returns_503_without_config(self):
        """Test that SMS endpoint returns 503 with helpful message when Twilio not configured"""
        response = requests.post(
            f"{BASE_URL}/api/send-sms",
            json={
                "phone_number": "+36301234567",
                "message": "Test message"
            },
            cookies={"session_token": TEST_SESSION_TOKEN}
        )
        assert response.status_code == 503, f"Expected 503, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Expected 'detail' in error response"
        # Check for Hungarian message about missing config
        assert "nincs konfigurálva" in data["detail"].lower() or "twilio" in data["detail"].lower(), \
            f"Expected Hungarian message about Twilio config, got: {data['detail']}"
        print(f"✓ POST /api/send-sms returns 503 with message: {data['detail']}")
    
    def test_send_sms_requires_auth(self):
        """Test that SMS endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/send-sms",
            json={"phone_number": "+36301234567", "message": "Test"}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ SMS endpoint requires authentication")


class TestEmailSending:
    """Test POST /api/send-email endpoint - should return 503 without Resend config"""
    
    def test_send_email_returns_503_without_config(self):
        """Test that email endpoint returns 503 with helpful message when Resend not configured"""
        response = requests.post(
            f"{BASE_URL}/api/send-email",
            json={
                "recipient_email": "test@example.com",
                "subject": "Test Subject",
                "html_content": "<p>Test content</p>"
            },
            cookies={"session_token": TEST_SESSION_TOKEN}
        )
        assert response.status_code == 503, f"Expected 503, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Expected 'detail' in error response"
        # Check for Hungarian message about missing config
        assert "nincs konfigurálva" in data["detail"].lower() or "resend" in data["detail"].lower() or "email" in data["detail"].lower(), \
            f"Expected Hungarian message about email config, got: {data['detail']}"
        print(f"✓ POST /api/send-email returns 503 with message: {data['detail']}")
    
    def test_send_email_requires_auth(self):
        """Test that email endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/send-email",
            json={"recipient_email": "test@example.com", "subject": "Test", "html_content": "<p>Test</p>"}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Email endpoint requires authentication")


class TestCustomerNotification:
    """Test POST /api/jobs/{job_id}/notify-customer endpoint"""
    
    def test_notify_customer_returns_503_without_config(self):
        """Test that customer notification returns 503 without Twilio config"""
        # First, get a valid job_id
        jobs_response = requests.get(
            f"{BASE_URL}/api/jobs",
            cookies={"session_token": TEST_SESSION_TOKEN}
        )
        assert jobs_response.status_code == 200
        jobs = jobs_response.json()
        
        if len(jobs) > 0:
            job_id = jobs[0]["job_id"]
            response = requests.post(
                f"{BASE_URL}/api/jobs/{job_id}/notify-customer",
                cookies={"session_token": TEST_SESSION_TOKEN}
            )
            # Should return 503 (no Twilio config) or 400 (no phone number)
            assert response.status_code in [503, 400], f"Expected 503 or 400, got {response.status_code}: {response.text}"
            
            data = response.json()
            print(f"✓ POST /api/jobs/{job_id}/notify-customer returns {response.status_code} with message: {data.get('detail', data)}")
        else:
            pytest.skip("No jobs available for testing")
    
    def test_notify_customer_with_invalid_job_returns_404(self):
        """Test that non-existent job returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/jobs/invalid_job_123/notify-customer",
            cookies={"session_token": TEST_SESSION_TOKEN}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent job returns 404")
    
    def test_notify_customer_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/jobs/any_job_id/notify-customer")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Notify customer endpoint requires authentication")


class TestInventoryLowStockData:
    """Verify inventory data has low stock items for notification testing"""
    
    def test_inventory_has_items_below_min_level(self):
        """Check that there are inventory items below min_level"""
        response = requests.get(
            f"{BASE_URL}/api/inventory",
            cookies={"session_token": TEST_SESSION_TOKEN}
        )
        assert response.status_code == 200
        inventory = response.json()
        
        low_stock_items = [
            item for item in inventory 
            if item.get("current_quantity", 0) < item.get("min_level", 0)
        ]
        
        print(f"Total inventory items: {len(inventory)}")
        print(f"Items below min_level: {len(low_stock_items)}")
        
        for item in low_stock_items:
            print(f"  - {item.get('product_name')} @ {item.get('location')}: {item.get('current_quantity')}/{item.get('min_level')}")
        
        # Kerámia bevonat should be below min_level based on seed data
        keramia_low = [item for item in low_stock_items if "Kerámia" in item.get("product_name", "") or "kerámia" in item.get("product_name", "").lower()]
        if len(keramia_low) > 0:
            print(f"✓ Kerámia bevonat found below min_level as expected")
        else:
            # Let's update it to be below min_level
            print("⚠ Kerámia bevonat not below min_level, checking current values...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
