import { useState, useEffect, useCallback, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "sonner";

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
  const { user } = useAuth();
  
  // Admin sees all by default and can switch; workers are locked to their location
  const isAdmin = user?.role === "admin";
  const [selectedLocation, setSelectedLocation] = useState(() => {
    if (!user) return "Debrecen";
    return isAdmin ? "all" : (user.location || "Debrecen");
  });

  // Lock non-admin to their location
  const effectiveLocation = isAdmin ? selectedLocation : (user?.location || "Debrecen");
  const locationForApi = effectiveLocation === "all" ? null : effectiveLocation;

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
          <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg"
              data-testid="mobile-menu-btn"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div />
            <NotificationBell />
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
