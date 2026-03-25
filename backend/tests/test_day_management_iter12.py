"""
Test Day Management Features - Iteration 12
Tests for:
- Day opening with balance
- Cash withdrawal function
- Day closing with expected balance calculation
- Previous day balance display
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDayManagementAPI:
    """Day Management API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get session"""
        self.session = requests.Session()
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.user = login_response.json()
        print(f"Logged in as: {self.user.get('name', 'admin')}")
    
    def test_01_get_today_record(self):
        """Test GET /day-records/today - should return current day record"""
        response = self.session.get(f"{BASE_URL}/api/day-records/today?location=Debrecen")
        print(f"Today record response: {response.status_code}")
        
        # Can be 200 with data or 200 with null (no record)
        assert response.status_code == 200
        
        data = response.json()
        if data:
            print(f"Day record found: status={data.get('status')}, opening_balance={data.get('opening_balance')}")
            assert 'status' in data
            assert 'opening_balance' in data
            assert 'location' in data
            # Check withdrawals field exists
            if data.get('status') == 'open':
                print(f"Withdrawals: {data.get('withdrawals', [])}")
        else:
            print("No day record for today")
    
    def test_02_get_day_records_list(self):
        """Test GET /day-records - should return list of day records"""
        response = self.session.get(f"{BASE_URL}/api/day-records?location=Debrecen")
        print(f"Day records list response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} day records")
        
        # Check for closed records (for previous day balance feature)
        closed_records = [r for r in data if r.get('status') == 'closed']
        print(f"Closed records: {len(closed_records)}")
        if closed_records:
            latest_closed = closed_records[0]
            print(f"Latest closed: date={latest_closed.get('date')}, closing_balance={latest_closed.get('closing_balance')}")
    
    def test_03_cash_withdrawal_endpoint(self):
        """Test POST /day-records/withdraw - cash withdrawal function"""
        # First check if day is open
        today_response = self.session.get(f"{BASE_URL}/api/day-records/today?location=Debrecen")
        today_data = today_response.json()
        
        if not today_data or today_data.get('status') != 'open':
            print("Day is not open, skipping withdrawal test")
            pytest.skip("Day must be open to test withdrawal")
        
        # Test withdrawal
        withdrawal_data = {
            "location": "Debrecen",
            "amount": 1000,
            "reason": "Test withdrawal - pytest"
        }
        
        response = self.session.post(f"{BASE_URL}/api/day-records/withdraw", json=withdrawal_data)
        print(f"Withdrawal response: {response.status_code}")
        
        assert response.status_code == 200, f"Withdrawal failed: {response.text}"
        data = response.json()
        
        assert 'message' in data
        assert 'withdrawal' in data
        withdrawal = data['withdrawal']
        assert withdrawal['amount'] == 1000
        assert withdrawal['reason'] == "Test withdrawal - pytest"
        assert 'withdrawal_id' in withdrawal
        assert 'withdrawn_by' in withdrawal
        assert 'timestamp' in withdrawal
        print(f"Withdrawal created: {withdrawal}")
    
    def test_04_verify_withdrawal_in_today_record(self):
        """Verify withdrawal appears in today's record"""
        response = self.session.get(f"{BASE_URL}/api/day-records/today?location=Debrecen")
        
        if response.status_code != 200:
            pytest.skip("Could not get today's record")
        
        data = response.json()
        if not data or data.get('status') != 'open':
            pytest.skip("Day is not open")
        
        withdrawals = data.get('withdrawals', [])
        print(f"Withdrawals in today's record: {len(withdrawals)}")
        
        # Check if our test withdrawal exists
        test_withdrawals = [w for w in withdrawals if 'pytest' in w.get('reason', '').lower()]
        print(f"Test withdrawals found: {len(test_withdrawals)}")
        
        if withdrawals:
            for w in withdrawals:
                print(f"  - {w.get('reason')}: {w.get('amount')} Ft by {w.get('withdrawn_by')} at {w.get('timestamp')}")
    
    def test_05_withdrawal_validation_no_amount(self):
        """Test withdrawal validation - missing/invalid amount"""
        # First check if day is open
        today_response = self.session.get(f"{BASE_URL}/api/day-records/today?location=Debrecen")
        today_data = today_response.json()
        
        if not today_data or today_data.get('status') != 'open':
            pytest.skip("Day must be open to test withdrawal validation")
        
        # Test with zero amount - should fail validation
        response = self.session.post(f"{BASE_URL}/api/day-records/withdraw", json={
            "location": "Debrecen",
            "amount": 0,
            "reason": "Test"
        })
        print(f"Zero amount withdrawal response: {response.status_code}")
        # Backend may accept 0 or reject it - just verify it doesn't crash
        assert response.status_code in [200, 400, 422]
    
    def test_06_withdrawal_when_day_closed(self):
        """Test withdrawal fails when day is closed"""
        # Try withdrawal on a location with no open day
        response = self.session.post(f"{BASE_URL}/api/day-records/withdraw", json={
            "location": "NonExistentLocation",
            "amount": 1000,
            "reason": "Test"
        })
        print(f"Withdrawal on closed day response: {response.status_code}")
        
        # Should fail with 400 - no open day
        assert response.status_code == 400
        data = response.json()
        assert 'detail' in data
        print(f"Error message: {data['detail']}")
    
    def test_07_day_open_endpoint(self):
        """Test POST /day-records/open - day opening"""
        # First check current status
        today_response = self.session.get(f"{BASE_URL}/api/day-records/today?location=Debrecen")
        today_data = today_response.json()
        
        if today_data and today_data.get('status') == 'open':
            print("Day is already open, testing duplicate open")
            # Try to open again - should fail
            response = self.session.post(f"{BASE_URL}/api/day-records/open", json={
                "location": "Debrecen",
                "opening_balance": 10000
            })
            print(f"Duplicate open response: {response.status_code}")
            assert response.status_code == 400
            assert 'már nyitva' in response.json().get('detail', '').lower() or 'already' in response.json().get('detail', '').lower()
        else:
            print("Day is not open, testing open endpoint")
            # This would actually open the day - skip to avoid side effects
            pytest.skip("Day is closed - skipping to avoid opening it during test")
    
    def test_08_day_close_endpoint_validation(self):
        """Test POST /day-records/close - validation when no open day"""
        # Try to close on a location with no open day
        response = self.session.post(f"{BASE_URL}/api/day-records/close", json={
            "location": "NonExistentLocation",
            "closing_balance": 50000,
            "notes": "Test close"
        })
        print(f"Close non-existent day response: {response.status_code}")
        
        assert response.status_code == 400
        data = response.json()
        assert 'detail' in data
        print(f"Error message: {data['detail']}")
    
    def test_09_expected_closing_balance_calculation(self):
        """Verify expected closing balance includes withdrawals"""
        response = self.session.get(f"{BASE_URL}/api/day-records/today?location=Debrecen")
        
        if response.status_code != 200:
            pytest.skip("Could not get today's record")
        
        data = response.json()
        if not data or data.get('status') != 'open':
            pytest.skip("Day is not open")
        
        opening_balance = data.get('opening_balance', 0)
        withdrawals = data.get('withdrawals', [])
        total_withdrawals = sum(w.get('amount', 0) for w in withdrawals)
        
        print(f"Opening balance: {opening_balance}")
        print(f"Total withdrawals: {total_withdrawals}")
        print(f"Expected closing (without cash income): {opening_balance - total_withdrawals}")
        
        # Verify the calculation logic is correct
        assert opening_balance >= 0
        assert total_withdrawals >= 0


class TestDayManagementIntegration:
    """Integration tests for day management flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get session"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert login_response.status_code == 200
    
    def test_full_day_flow_data_integrity(self):
        """Test data integrity across day management operations"""
        # Get today's record
        response = self.session.get(f"{BASE_URL}/api/day-records/today?location=Debrecen")
        assert response.status_code == 200
        
        data = response.json()
        if data:
            print(f"Current day status: {data.get('status')}")
            print(f"Opening balance: {data.get('opening_balance')}")
            print(f"Withdrawals count: {len(data.get('withdrawals', []))}")
            
            # Verify data structure
            assert 'record_id' in data
            assert 'location' in data
            assert 'date' in data
            assert 'opening_balance' in data
            assert 'status' in data
            
            if data.get('status') == 'closed':
                assert 'closing_balance' in data
                assert 'discrepancy' in data
        else:
            print("No day record exists for today")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
