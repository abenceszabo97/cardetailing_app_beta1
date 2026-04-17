import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API, useLocation2 } from "../App";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Package,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  Sun,
  MapPin,
  X,
  Car,
  CalendarDays,
  FileText,
  Search,
  User,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export const Sidebar = ({ isOpen, onClose, selectedLocation, setSelectedLocation }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { locationForApi } = useLocation2();

  // Low-stock badge count
  const [lowStockCount, setLowStockCount] = useState(0);
  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const res = await axios.get(`${API}/inventory/low-stock`, { withCredentials: true });
        const items = Array.isArray(res.data) ? res.data : [];
        const filtered = locationForApi
          ? items.filter(i => !i.location || i.location === locationForApi)
          : items;
        setLowStockCount(filtered.length);
      } catch { setLowStockCount(0); }
    };
    fetchLowStock();
    const interval = setInterval(fetchLowStock, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [locationForApi]);

  // Global search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  // Ctrl+K / Cmd+K global shortcut — focus sidebar search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        // On mobile open the sidebar first
        if (window.innerWidth < 1024) onClose && onClose();
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setShowResults(false);
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const navItems = [
    { path: "/dashboard", label: "Főoldal", icon: LayoutDashboard },
    { path: "/calendar", label: "Naptár", icon: CalendarDays },
    { path: "/customers", label: "Ügyfelek", icon: Users },
    { path: "/workers", label: "Dolgozók", icon: Calendar },
    { path: "/inventory", label: "Készlet", icon: Package },
    { path: "/statistics", label: "Statisztika", icon: BarChart3 },
    { path: "/services", label: "Szolgáltatások", icon: Sparkles },
    { path: "/invoices", label: "Számlák", icon: FileText },
    { path: "/day-management", label: "Napnyitás/Zárás", icon: Sun },
    { path: "/settings", label: "Beállítások", icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await axios.get(`${API}/customers?search=${encodeURIComponent(searchQuery)}`, {
          withCredentials: true,
        });
        // Also search by plate_number client-side from the returned list
        const q = searchQuery.toLowerCase();
        const filtered = (Array.isArray(res.data) ? res.data : []).filter(
          c =>
            c.name?.toLowerCase().includes(q) ||
            c.plate_number?.toLowerCase().includes(q) ||
            c.phone?.includes(q)
        );
        setSearchResults(filtered.slice(0, 6));
        setShowResults(true);
      } catch {
        setSearchResults([]);
      }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close results on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelectResult = (customer) => {
    setSearchQuery("");
    setShowResults(false);
    onClose();
    navigate(`/customers/${customer.customer_id}`);
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800
          transform transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-slate-900" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white font-['Manrope']">X-CLEAN</h1>
                <p className="text-xs text-slate-500">Menedzsment</p>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-white"
              data-testid="close-sidebar-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Search */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-800" ref={searchRef}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Rendszám, ügyfélnév, telefon…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              className="w-full bg-slate-950/60 border border-slate-700 rounded-lg pl-9 pr-14 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition-colors"
            />
            {searchLoading ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
            ) : !searchQuery && (
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 px-1 py-0.5 text-[10px] text-slate-500 bg-slate-800 border border-slate-700 rounded">
                ⌘K
              </kbd>
            )}
            {/* Results dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                {searchResults.map(customer => (
                  <button
                    key={customer.customer_id}
                    onClick={() => handleSelectResult(customer)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{customer.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{customer.plate_number}</p>
                    </div>
                    {customer.location && (
                      <span className="ml-auto text-xs text-slate-600 flex-shrink-0">{customer.location}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {showResults && searchResults.length === 0 && !searchLoading && searchQuery.length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 px-3 py-3 text-sm text-slate-500 text-center">
                Nincs találat
              </div>
            )}
          </div>
        </div>

        {/* Location Filter */}
        <div className="p-4 border-b border-slate-800">
          <label className="text-xs text-slate-500 mb-2 block">Telephely</label>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger
              className="w-full bg-slate-950/50 border-slate-700 text-white"
              data-testid="location-select"
            >
              <MapPin className="w-4 h-4 mr-2 text-green-400" />
              <SelectValue placeholder="Válassz telephelyet" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-white hover:bg-slate-800">
                Összes telephely
              </SelectItem>
              <SelectItem value="Debrecen" className="text-white hover:bg-slate-800">
                Debrecen
              </SelectItem>
              <SelectItem value="Budapest" className="text-white hover:bg-slate-800">
                Budapest
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Navigation - scrollable */}
        <nav className="flex-1 overflow-y-auto p-4 min-h-0">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                    ${isActive(item.path)
                      ? "text-green-400 bg-green-400/10"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                    }
                  `}
                  data-testid={`nav-${item.path.slice(1)}`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium flex-1">{item.label}</span>
                  {item.path === "/inventory" && lowStockCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                      {lowStockCount}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section - always visible at bottom */}
        <div className="p-4 border-t border-slate-800 mt-auto flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.name?.charAt(0) || "U"}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">
                {user?.role === "admin" ? "Admin" : "Dolgozó"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4" />
            <span>Kijelentkezés</span>
          </button>
        </div>
      </aside>
    </>
  );
};
