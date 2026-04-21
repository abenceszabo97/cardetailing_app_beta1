import { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "sonner";
import { Search } from "lucide-react";

// Pages
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Customers } from "./pages/Customers";
import { CustomerDetail } from "./pages/CustomerDetail";
import { Workers } from "./pages/Workers";
import { Inventory } from "./pages/Inventory";
import { Statistics } from "./pages/Statistics";
import { Services } from "./pages/Services";
import { DayManagement } from "./pages/DayManagement";
import { Settings } from "./pages/Settings";
import BookingPage from "./pages/BookingPage";
import Calendar from "./pages/Calendar";
import { Sidebar } from "./components/Sidebar";
import { NotificationBell } from "./components/NotificationBell";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Location Context  
const LocationContext = createContext(null);
export const useLocation2 = () => useContext(LocationContext);

// Auth Provider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-lg">Betöltés...</div>
      </div>
    );
  }

  if (!user && !location.state?.user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Main Layout
const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Admin sees all by default and can switch; workers are locked to their location
  const isAdmin = user?.role === "admin";
  const [selectedLocation, setSelectedLocation] = useState(() => {
    if (!user) return "Debrecen";
    return isAdmin ? "all" : (user.location || "Debrecen");
  });

  // Lock non-admin to their location
  const effectiveLocation = isAdmin ? selectedLocation : (user?.location || "Debrecen");
  const locationForApi = effectiveLocation === "all" ? null : effectiveLocation;

  const debouncedSearch = useMemo(() => {
    let timeoutId;
    return (value) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const query = value.trim().toLowerCase();
        if (query.length < 2) {
          setSearchResults([]);
          return;
        }
        try {
          const response = await axios.get(`${API}/customers`, { withCredentials: true });
          const customers = Array.isArray(response.data) ? response.data : [];
          const matches = customers
            .filter((c) =>
              (c.name || "").toLowerCase().includes(query) ||
              (c.plate_number || "").toLowerCase().includes(query)
            )
            .slice(0, 8);
          setSearchResults(matches);
          setSearchOpen(true);
        } catch (error) {
          setSearchResults([]);
        }
      }, 250);
    };
  }, []);

  useEffect(() => {
    debouncedSearch(customerSearch);
  }, [customerSearch, debouncedSearch]);

  const goToCustomer = (customerId) => {
    navigate(`/customers/${customerId}`);
    setCustomerSearch("");
    setSearchOpen(false);
    setSidebarOpen(false);
  };

  return (
    <LocationContext.Provider value={{ 
      selectedLocation: effectiveLocation, 
      setSelectedLocation: isAdmin ? setSelectedLocation : () => {},
      locationForApi,
      isAdmin,
      locations: ["Debrecen", "Budapest"]
    }}>
      <div className="min-h-screen bg-slate-950 flex">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          selectedLocation={effectiveLocation}
          setSelectedLocation={isAdmin ? setSelectedLocation : () => {}}
        />
        <div className="flex-1 lg:ml-64">
          <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-4 py-3">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg"
              data-testid="mobile-menu-btn"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-3 min-w-0">
              {isAdmin && (
                <select
                  value={effectiveLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
                  data-testid="location-selector"
                >
                  <option value="all">Összes telephely</option>
                  <option value="Debrecen">Debrecen</option>
                  <option value="Budapest">Budapest</option>
                </select>
              )}
              {!isAdmin && user?.location && (
                <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                  {user.location}
                </span>
              )}
            </div>
            <div className="hidden md:block w-full max-w-xl justify-self-center relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onFocus={() => customerSearch.trim().length >= 2 && setSearchOpen(true)}
                placeholder="Rendszam vagy ugyfelnev keresese..."
                className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
                data-testid="top-customer-search"
              />
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-11 left-0 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50">
                  {searchResults.map((customer) => (
                    <button
                      key={customer.customer_id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goToCustomer(customer.customer_id)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 border-b border-slate-800 last:border-b-0"
                    >
                      <div className="text-white text-sm font-medium">{customer.name}</div>
                      <div className="text-slate-400 text-xs">{customer.plate_number} • {(customer.total_spent || 0).toLocaleString()} Ft</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="justify-self-end">
              <NotificationBell />
            </div>
            </div>
            <div className="md:hidden mt-3 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onFocus={() => customerSearch.trim().length >= 2 && setSearchOpen(true)}
                placeholder="Rendszam vagy ugyfelnev..."
                className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-green-500"
                data-testid="top-customer-search-mobile"
              />
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-11 left-0 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50">
                  {searchResults.map((customer) => (
                    <button
                      key={customer.customer_id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goToCustomer(customer.customer_id)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 border-b border-slate-800 last:border-b-0"
                    >
                      <div className="text-white text-sm font-medium">{customer.name}</div>
                      <div className="text-slate-400 text-xs">{customer.plate_number}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </header>
          <main className="p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </LocationContext.Provider>
  );
};

// App Router
function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/booking" element={<BookingPage />} />
      <Route path="/calendar" element={
        <ProtectedRoute>
          <MainLayout><Calendar /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <MainLayout><Dashboard /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/customers" element={
        <ProtectedRoute>
          <MainLayout><Customers /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/customers/:customerId" element={
        <ProtectedRoute>
          <MainLayout><CustomerDetail /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/workers" element={
        <ProtectedRoute>
          <MainLayout><Workers /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/inventory" element={
        <ProtectedRoute>
          <MainLayout><Inventory /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/statistics" element={
        <ProtectedRoute>
          <MainLayout><Statistics /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/services" element={
        <ProtectedRoute>
          <MainLayout><Services /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/day-management" element={
        <ProtectedRoute>
          <MainLayout><DayManagement /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <MainLayout><Settings /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster 
          position="top-right" 
          richColors 
          theme="dark"
          toastOptions={{
            style: {
              background: 'hsl(222 47% 7%)',
              border: '1px solid hsl(217 33% 17%)',
            }
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
