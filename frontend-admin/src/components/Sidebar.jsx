import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../App";
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
  Moon,
  MapPin,
  X,
  Car,
  CalendarDays,
  FileText
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
  const { user, logout } = useAuth();

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
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
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
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive(item.path) 
                      ? 'text-green-400 bg-green-400/10' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                  data-testid={`nav-${item.path.slice(1)}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
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
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">
                {user?.role === 'admin' ? 'Admin' : 'Dolgozó'}
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
