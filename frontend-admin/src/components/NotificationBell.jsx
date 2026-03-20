import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Bell, AlertTriangle, Package, Calendar, Car, MapPin, CheckCheck } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

export const NotificationBell = () => {
  const [stockNotifications, setStockNotifications] = useState([]);
  const [bookingNotifications, setBookingNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("bookings");

  const fetchNotifications = async () => {
    try {
      const [stockRes, bookingRes] = await Promise.all([
        axios.get(`${API}/notifications/low-stock`, { withCredentials: true }),
        axios.get(`${API}/notifications/bookings`, { withCredentials: true })
      ]);
      setStockNotifications(stockRes.data);
      setBookingNotifications(bookingRes.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API}/notifications/${notificationId}/read`, {}, { withCredentials: true });
      setBookingNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API}/notifications/read-all`, {}, { withCredentials: true });
      setBookingNotifications([]);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const totalCount = stockNotifications.length + bookingNotifications.length;
  const bookingCount = bookingNotifications.length;
  const stockCount = stockNotifications.length;

  return (
    <div className="relative" data-testid="notification-bell">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        data-testid="notification-bell-btn"
      >
        <Bell className="w-5 h-5" />
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden" data-testid="notification-dropdown">
            {/* Tabs */}
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setActiveTab("bookings")}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activeTab === "bookings" ? "text-green-400 border-b-2 border-green-400 bg-green-500/5" : "text-slate-400 hover:text-white"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Foglalások
                {bookingCount > 0 && (
                  <Badge className="bg-green-500 text-white text-xs px-1.5">{bookingCount}</Badge>
                )}
              </button>
              <button
                onClick={() => setActiveTab("stock")}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activeTab === "stock" ? "text-amber-400 border-b-2 border-amber-400 bg-amber-500/5" : "text-slate-400 hover:text-white"
                }`}
              >
                <Package className="w-4 h-4" />
                Készlet
                {stockCount > 0 && (
                  <Badge className="bg-amber-500 text-white text-xs px-1.5">{stockCount}</Badge>
                )}
              </button>
            </div>

            {/* Booking notifications */}
            {activeTab === "bookings" && (
              <div className="max-h-80 overflow-y-auto">
                {bookingCount === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Nincs új foglalás
                  </div>
                ) : (
                  <>
                    <div className="p-2 border-b border-slate-800 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-slate-400 hover:text-white"
                        onClick={markAllAsRead}
                      >
                        <CheckCheck className="w-3 h-3 mr-1" />
                        Mind olvasott
                      </Button>
                    </div>
                    {bookingNotifications.map((n) => (
                      <div
                        key={n.notification_id}
                        className="p-3 border-b border-slate-800/50 hover:bg-white/5 cursor-pointer group"
                        onClick={() => markAsRead(n.notification_id)}
                        data-testid={`booking-notification-${n.notification_id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                            <Car className="w-4 h-4 text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{n.title}</p>
                            <p className="text-slate-400 text-xs mt-0.5">{n.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                <MapPin className="w-3 h-3 mr-1" />
                                {n.location}
                              </Badge>
                              <span className="text-slate-500 text-xs">
                                {new Date(n.created_at).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <CheckCheck className="w-4 h-4 text-green-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Stock notifications */}
            {activeTab === "stock" && (
              <div className="max-h-80 overflow-y-auto">
                {stockCount === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Nincs alacsony készlet
                  </div>
                ) : (
                  stockNotifications.map((n) => (
                    <div
                      key={n.inventory_id}
                      className={`p-3 border-b border-slate-800/50 hover:bg-white/5 ${
                        n.severity === "critical" ? "bg-red-500/5" : ""
                      }`}
                      data-testid={`notification-item-${n.inventory_id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            n.severity === "critical" ? "bg-red-500/20" : "bg-amber-500/20"
                          }`}>
                            <AlertTriangle className={`w-4 h-4 ${n.severity === "critical" ? "text-red-400" : "text-amber-400"}`} />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{n.product_name}</p>
                            <p className="text-slate-500 text-xs">{n.location}</p>
                          </div>
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
            )}
          </div>
        </>
      )}
    </div>
  );
};
