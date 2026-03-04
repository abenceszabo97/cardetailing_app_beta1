import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Bell, AlertTriangle, Package } from "lucide-react";
import { Badge } from "../components/ui/badge";

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API}/notifications/low-stock`, { withCredentials: true });
      setNotifications(res.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const count = notifications.length;

  return (
    <div className="relative" data-testid="notification-bell">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        data-testid="notification-bell-btn"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {count}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden" data-testid="notification-dropdown">
            <div className="p-3 border-b border-slate-800">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Készlet figyelmeztetések ({count})
              </h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {count === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Nincs alacsony készlet
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.inventory_id}
                    className={`p-3 border-b border-slate-800/50 hover:bg-white/5 ${
                      n.severity === "critical" ? "bg-red-500/5" : ""
                    }`}
                    data-testid={`notification-item-${n.inventory_id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{n.product_name}</p>
                        <p className="text-slate-500 text-xs">{n.location}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          n.severity === "critical"
                            ? "border-red-500 text-red-400"
                            : "border-amber-500 text-amber-400"
                        }`}
                      >
                        {n.current_quantity} / {n.min_level}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
