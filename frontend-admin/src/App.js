import { useState, useEffect, useCallback, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "sonner";
import { Search, MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";

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
import { Invoices } from "./pages/Invoices";
import BookingPage from "./pages/BookingPage";
import Calendar from "./pages/Calendar";
import { Reviews } from "./pages/Reviews";
import { Sidebar } from "./components/Sidebar";
import { NotificationBell } from "./components/NotificationBell";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Apply persisted theme + compact mode immediately on load
(() => {
  const theme = localStorage.getItem("xclean_theme") || "dark";
  const compact = localStorage.getItem("xclean_compact") === "true";
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.setAttribute("data-compact", compact ? "true" : "false");
})();

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

  useEffect(() => {
    const q = customerSearch.trim().toLowerCase();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(`${API}/customers?search=${encodeURIComponent(q)}`, { withCredentials: true });
        const customers = Array.isArray(response.data) ? response.data : [];
        setSearchResults(customers.slice(0, 8));
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const openCustomer = (customerId) => {
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
        />
        <div className="flex-1 lg:ml-64">
          <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-4 py-3">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg"
                  data-testid="mobile-menu-btn"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                {isAdmin && (
                  <Select value={effectiveLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger
                      className="h-10 min-w-[190px] bg-slate-950/50 border-slate-700 text-white rounded-xl"
                      data-testid="location-selector"
                    >
                      <MapPin className="w-4 h-4 mr-2 text-green-400" />
                      <SelectValue placeholder="Válassz telephelyet" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="all" className="text-white hover:bg-slate-800">Összes telephely</SelectItem>
                      <SelectItem value="Debrecen" className="text-white hover:bg-slate-800">Debrecen</SelectItem>
                      <SelectItem value="Budapest" className="text-white hover:bg-slate-800">Budapest</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {!isAdmin && user?.location && (
                  <div className="h-10 min-w-[190px] text-sm text-white bg-slate-950/50 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-green-400" />
                    {user.location}
                  </div>
                )}
              </div>

              <div className="hidden md:block w-full max-w-xl justify-self-center relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearch}
                  onFocus={() => customerSearch.trim().length >= 2 && setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Rendszám vagy ügyfélnév keresése..."
                  className="w-full h-10 bg-slate-950/50 text-white border border-slate-700 rounded-xl pl-10 pr-3 text-sm shadow-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  data-testid="top-customer-search"
                />
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute top-12 left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                    {searchResults.map((customer) => (
                      <button
                        key={customer.customer_id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => openCustomer(customer.customer_id)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-800 border-b border-slate-800 last:border-b-0"
                      >
                        <div className="text-white text-sm font-medium">{customer.name}</div>
                        <div className="text-slate-400 text-xs">{customer.plate_number} • {customer.phone || "-"}</div>
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
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearch}
                onFocus={() => customerSearch.trim().length >= 2 && setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Rendszám vagy ügyfélnév..."
                className="w-full h-10 bg-slate-950/50 text-white border border-slate-700 rounded-xl pl-10 pr-3 text-sm shadow-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                data-testid="top-customer-search-mobile"
              />
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-12 left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                  {searchResults.map((customer) => (
                    <button
                      key={customer.customer_id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => openCustomer(customer.customer_id)}
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
      <Route path="/invoices" element={
        <ProtectedRoute>
          <MainLayout><Invoices /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <MainLayout><Settings /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/reviews" element={
        <ProtectedRoute>
          <MainLayout><Reviews /></MainLayout>
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
