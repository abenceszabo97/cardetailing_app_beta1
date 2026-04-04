import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Car, MapPin, 
  Phone, Mail, X, Check, AlertTriangle, Edit, Trash2, Ban, Save, UserX, Upload, Image,
  Users, Columns3, Grid3X3
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, addWeeks, subWeeks } from "date-fns";
import { hu } from "date-fns/locale";
import { 
  requestNotificationPermission,
  notifyNewBooking 
} from "../services/notificationService";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const LOCATIONS = ["all", "Debrecen"];
const STATUS_COLORS = {
  foglalt: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  folyamatban: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  kesz: "bg-green-500/20 text-green-400 border-green-500/30",
  lemondta: "bg-red-500/20 text-red-400 border-red-500/30",
  nem_jott_el: "bg-slate-500/20 text-slate-400 border-slate-500/30"
};
const STATUS_LABELS = {
  foglalt: "Foglalt",
  folyamatban: "Folyamatban",
  kesz: "Kész",
  lemondta: "Lemondta",
  nem_jott_el: "Nem jött el"
};

// Worker colors for column headers
const WORKER_COLORS = [
  "from-blue-500/20 to-cyan-500/20",
  "from-purple-500/20 to-pink-500/20",
  "from-green-500/20 to-emerald-500/20",
  "from-orange-500/20 to-yellow-500/20",
  "from-red-500/20 to-rose-500/20",
  "from-indigo-500/20 to-violet-500/20"
];

const Calendar = () => {
  const [view, setView] = useState("week"); // week, month, day
  const [viewMode, setViewMode] = useState("standard"); // standard, workers (per-worker columns)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [services, setServices] = useState([]);
  const [location, setLocation] = useState("all");
  const [selectedWorker, setSelectedWorker] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlacklistDialog, setShowBlacklistDialog] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [blacklistImages, setBlacklistImages] = useState([]);
  const [uploadingBlacklistImage, setUploadingBlacklistImage] = useState(false);
  const blacklistFileRef = useRef(null);
  const previousBookingIds = useRef(new Set());

  useEffect(() => {
    fetchData();
    // Request notification permission
    requestNotificationPermission();
  }, [currentDate, location, view]);

  // Polling for new bookings every 30 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const dateFrom = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
        const dateTo = format(addDays(new Date(), 30), "yyyy-MM-dd");
        const res = await axios.get(`${API}/bookings?date_from=${dateFrom}&date_to=${dateTo}`, { withCredentials: true });
        
        const newBookings = res.data || [];
        const currentIds = new Set(newBookings.map(b => b.booking_id));
        
        // Check for new bookings
        newBookings.forEach(booking => {
          if (!previousBookingIds.current.has(booking.booking_id) && previousBookingIds.current.size > 0) {
            // New booking detected!
            notifyNewBooking(booking);
            toast.success(`Új foglalás: ${booking.customer_name} - ${booking.plate_number}`);
          }
        });
        
        previousBookingIds.current = currentIds;
      } catch (e) {
        // Silent fail for polling
      }
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    axios.get(`${API}/services`, { withCredentials: true }).then(r => setServices(r.data)).catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateFrom = view === "month" 
        ? format(startOfMonth(currentDate), "yyyy-MM-dd")
        : view === "week"
          ? format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd")
          : format(currentDate, "yyyy-MM-dd");
      
      const dateTo = view === "month"
        ? format(endOfMonth(currentDate), "yyyy-MM-dd")
        : view === "week"
          ? format(endOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd")
          : format(currentDate, "yyyy-MM-dd");

      const [bookingsRes, workersRes] = await Promise.all([
        axios.get(`${API}/bookings`, { 
          params: { date_from: dateFrom, date_to: dateTo, location: location !== "all" ? location : undefined },
          withCredentials: true 
        }),
        axios.get(`${API}/workers`, { 
          params: { location: location !== "all" ? location : undefined },
          withCredentials: true 
        })
      ]);
      
      setBookings(bookingsRes.data);
      setWorkers(workersRes.data);
      
      // Initialize previousBookingIds for polling
      if (previousBookingIds.current.size === 0) {
        previousBookingIds.current = new Set(bookingsRes.data.map(b => b.booking_id));
      }
    } catch (error) {
      toast.error("Hiba az adatok betöltésekor");
    }
    setLoading(false);
  };

  const navigate = (direction) => {
    if (view === "month") {
      setCurrentDate(direction === "next" ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(direction === "next" ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === "next" ? addDays(currentDate, 1) : addDays(currentDate, -1));
    }
  };

  const openBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setEditForm({ ...booking });
    setEditMode(false);
  };

  const updateBooking = async (updates) => {
    try {
      await axios.put(`${API}/bookings/${selectedBooking.booking_id}`, updates, { withCredentials: true });
      toast.success("Foglalás frissítve");
      fetchData();
      if (updates.status) {
        setSelectedBooking({ ...selectedBooking, ...updates });
      }
    } catch (error) {
      toast.error("Hiba a frissítéskor");
    }
  };

  const saveEdit = async () => {
    try {
      await axios.put(`${API}/bookings/${selectedBooking.booking_id}`, editForm, { withCredentials: true });
      toast.success("Foglalás mentve");
      fetchData();
      setSelectedBooking({ ...selectedBooking, ...editForm });
      setEditMode(false);
    } catch (error) {
      toast.error("Hiba a mentéskor");
    }
  };

  const deleteBooking = async () => {
    try {
      await axios.delete(`${API}/bookings/${selectedBooking.booking_id}`, { withCredentials: true });
      toast.success("Foglalás törölve");
      fetchData();
      setSelectedBooking(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error("Hiba a törléskor");
    }
  };

  const addToBlacklist = async () => {
    if (!blacklistReason.trim()) {
      toast.error("Kérjük adja meg az indoklást");
      return;
    }
    try {
      await axios.post(`${API}/blacklist`, {
        plate_number: selectedBooking.plate_number,
        reason: blacklistReason,
        evidence_images: blacklistImages
      }, { withCredentials: true });
      toast.success("Ügyfél hozzáadva a tiltólistához");
      setShowBlacklistDialog(false);
      setBlacklistReason("");
      setBlacklistImages([]);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a tiltólistához adáskor");
    }
  };

  const handleBlacklistImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    
    setUploadingBlacklistImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await axios.post(`${API}/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setBlacklistImages(prev => [...prev, uploadRes.data.url]);
      toast.success("Kép feltöltve!");
    } catch (error) {
      toast.error("Hiba a kép feltöltésekor");
    } finally {
      setUploadingBlacklistImage(false);
    }
  };

  const removeBlacklistImage = (index) => {
    setBlacklistImages(prev => prev.filter((_, i) => i !== index));
  };

  const getBookingsForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.filter(b => b.date === dateStr && (selectedWorker === "all" || b.worker_id === selectedWorker));
  };

  const getBookingsForSlot = (date, hour) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const hourStr = `${hour.toString().padStart(2, "0")}:`;
    return bookings.filter(b => 
      b.date === dateStr && 
      b.time_slot?.startsWith(hourStr) &&
      (selectedWorker === "all" || b.worker_id === selectedWorker)
    );
  };

  const getBookingsForWorkerSlot = (date, hour, workerId) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const hourStr = `${hour.toString().padStart(2, "0")}:`;
    return bookings.filter(b => 
      b.date === dateStr && 
      b.time_slot?.startsWith(hourStr) &&
      (workerId === "unassigned" ? !b.worker_id : b.worker_id === workerId)
    );
  };

  const renderTitle = () => {
    if (view === "month") return format(currentDate, "yyyy MMMM", { locale: hu });
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, "MMM d", { locale: hu })} - ${format(end, "MMM d, yyyy", { locale: hu })}`;
    }
    return format(currentDate, "yyyy. MMMM d. (EEEE)", { locale: hu });
  };

  // Standard Day View
  const renderDayView = () => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 8);
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="grid grid-cols-[60px_1fr] sm:grid-cols-[80px_1fr] divide-x divide-slate-800">
          <div className="bg-slate-950/50" />
          <div className="p-3 bg-slate-950/50 text-center">
            <div className="text-white font-medium">{format(currentDate, "EEEE", { locale: hu })}</div>
            <div className="text-2xl font-bold text-green-400">{format(currentDate, "d")}</div>
          </div>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {hours.map(hour => {
            const slotBookings = getBookingsForSlot(currentDate, hour);
            return (
              <div key={hour} className="grid grid-cols-[60px_1fr] sm:grid-cols-[80px_1fr] divide-x divide-slate-800 border-t border-slate-800 min-h-[60px]">
                <div className="p-2 text-xs text-slate-500 text-right pr-3">{hour}:00</div>
                <div className="p-1 space-y-1">
                  {slotBookings.map(booking => (
                    <div
                      key={booking.booking_id}
                      className={`p-2 rounded-lg border cursor-pointer text-xs ${STATUS_COLORS[booking.status]}`}
                      onClick={() => openBookingDetails(booking)}
                    >
                      <div className="font-medium">{booking.customer_name}</div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>{booking.time_slot}</span>
                        <span>{booking.plate_number}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Per-Worker Day View (columns per worker)
  const renderWorkersDayView = () => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 8);
    const displayWorkers = workers.length > 0 ? workers : [];
    const hasUnassigned = bookings.some(b => !b.worker_id && b.date === format(currentDate, "yyyy-MM-dd"));
    
    // Calculate column count for responsive grid
    const workerCount = displayWorkers.length + (hasUnassigned ? 1 : 0);
    
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {/* Header row with workers */}
        <div className="flex divide-x divide-slate-800 overflow-x-auto">
          <div className="w-14 sm:w-16 flex-shrink-0 bg-slate-950/50 p-2 text-center">
            <div className="text-xs text-slate-500">{format(currentDate, "EEE", { locale: hu })}</div>
            <div className="text-lg font-bold text-green-400">{format(currentDate, "d")}</div>
          </div>
          {displayWorkers.map((worker, idx) => (
            <div 
              key={worker.worker_id} 
              className={`min-w-[120px] sm:min-w-[150px] flex-1 p-2 text-center bg-gradient-to-r ${WORKER_COLORS[idx % WORKER_COLORS.length]}`}
            >
              <div className="flex items-center justify-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                <span className="text-white font-medium text-sm truncate">{worker.name}</span>
              </div>
            </div>
          ))}
          {hasUnassigned && (
            <div className="min-w-[120px] sm:min-w-[150px] flex-1 p-2 text-center bg-gradient-to-r from-orange-500/20 to-yellow-500/20">
              <div className="flex items-center justify-center gap-1">
                <User className="w-3 h-3 text-orange-400" />
                <span className="text-orange-300 font-medium text-sm">Nincs hozzárendelve</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Time slots */}
        <div className="max-h-[500px] overflow-auto">
          {hours.map(hour => (
            <div key={hour} className="flex divide-x divide-slate-800 border-t border-slate-800">
              <div className="w-14 sm:w-16 flex-shrink-0 p-1 text-xs text-slate-500 text-right pr-2">
                {hour}:00
              </div>
              {displayWorkers.map((worker) => {
                const workerBookings = getBookingsForWorkerSlot(currentDate, hour, worker.worker_id);
                return (
                  <div key={worker.worker_id} className="min-w-[120px] sm:min-w-[150px] flex-1 p-1 min-h-[50px]">
                    {workerBookings.map(booking => (
                      <div
                        key={booking.booking_id}
                        className={`p-1.5 rounded text-xs cursor-pointer mb-1 ${STATUS_COLORS[booking.status]}`}
                        onClick={() => openBookingDetails(booking)}
                      >
                        <div className="font-medium truncate">{booking.time_slot} {booking.customer_name?.split(' ')[0]}</div>
                        <div className="text-slate-400 truncate text-[10px]">{booking.plate_number}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
              {hasUnassigned && (
                <div className="min-w-[120px] sm:min-w-[150px] flex-1 p-1 min-h-[50px]">
                  {getBookingsForWorkerSlot(currentDate, hour, "unassigned").map(booking => (
                    <div
                      key={booking.booking_id}
                      className={`p-1.5 rounded text-xs cursor-pointer mb-1 border-orange-500/30 bg-orange-500/10 text-orange-300`}
                      onClick={() => openBookingDetails(booking)}
                    >
                      <div className="font-medium truncate">{booking.time_slot} {booking.customer_name?.split(' ')[0]}</div>
                      <div className="text-orange-400/70 truncate text-[10px]">{booking.plate_number}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Standard Week View
  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
    const hours = Array.from({ length: 12 }, (_, i) => i + 8);
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {/* Desktop view */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-[70px_repeat(7,1fr)] divide-x divide-slate-800">
            <div className="bg-slate-950/50" />
            {days.map(day => (
              <div key={day.toISOString()} className={`p-2 text-center bg-slate-950/50 ${isSameDay(day, new Date()) ? 'bg-green-500/10' : ''}`}>
                <div className="text-xs text-slate-500">{format(day, "EEE", { locale: hu })}</div>
                <div className={`text-lg font-bold ${isSameDay(day, new Date()) ? 'text-green-400' : 'text-white'}`}>{format(day, "d")}</div>
              </div>
            ))}
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-[70px_repeat(7,1fr)] divide-x divide-slate-800 border-t border-slate-800 min-h-[56px]">
                <div className="p-1 text-xs text-slate-500 text-right pr-2 pt-2">{hour}:00</div>
                {days.map(day => {
                  const slotBookings = getBookingsForSlot(day, hour);
                  return (
                    <div key={day.toISOString()} className="p-0.5 overflow-hidden">
                      {slotBookings.slice(0, 2).map(booking => (
                        <div
                          key={booking.booking_id}
                          className={`px-1.5 py-0.5 mb-0.5 rounded text-[10px] cursor-pointer border-l-2 ${STATUS_COLORS[booking.status]} hover:brightness-110`}
                          onClick={() => openBookingDetails(booking)}
                          title={`${booking.time_slot} - ${booking.customer_name} - ${booking.plate_number}`}
                        >
                          <div className="font-semibold truncate">{booking.plate_number}</div>
                        </div>
                      ))}
                      {slotBookings.length > 2 && (
                        <div className="text-[9px] text-slate-500 text-center">+{slotBookings.length - 2}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        
        {/* Mobile view - day cards */}
        <div className="sm:hidden space-y-2 p-2">
          {days.map(day => {
            const dayBookings = getBookingsForDate(day);
            return (
              <div key={day.toISOString()} className={`rounded-lg border ${isSameDay(day, new Date()) ? 'border-green-500/50 bg-green-500/5' : 'border-slate-700'}`}>
                <div className={`p-2 border-b ${isSameDay(day, new Date()) ? 'border-green-500/30' : 'border-slate-700'} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${isSameDay(day, new Date()) ? 'text-green-400' : 'text-white'}`}>
                      {format(day, "EEEE", { locale: hu })}
                    </span>
                    <span className="text-slate-400 text-sm">{format(day, "d", { locale: hu })}</span>
                  </div>
                  <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                    {dayBookings.length} foglalás
                  </Badge>
                </div>
                {dayBookings.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {dayBookings.slice(0, 5).map(booking => (
                      <div
                        key={booking.booking_id}
                        className={`p-2 rounded-lg text-xs cursor-pointer ${STATUS_COLORS[booking.status]}`}
                        onClick={() => openBookingDetails(booking)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{booking.time_slot}</span>
                          <span className="text-slate-400">{booking.plate_number}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span>{booking.customer_name}</span>
                          {booking.worker_name && (
                            <span className="text-blue-300 text-[10px]">{booking.worker_name}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {dayBookings.length > 5 && (
                      <div className="text-center text-slate-500 text-xs py-1">
                        +{dayBookings.length - 5} további foglalás
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 text-center text-slate-500 text-sm">
                    Nincs foglalás
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Month View
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const weeks = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(day));
        day = addDays(day, 1);
      }
      weeks.push(week);
    }
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {/* Desktop view */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-7 divide-x divide-slate-800 bg-slate-950/50">
            {["H", "K", "Sz", "Cs", "P", "Szo", "V"].map(d => (
              <div key={d} className="p-2 text-center text-xs text-slate-500 font-medium">{d}</div>
            ))}
          </div>
          {weeks.map((week, i) => (
            <div key={i} className="grid grid-cols-7 divide-x divide-slate-800 border-t border-slate-800">
              {week.map(day => {
                const dayBookings = getBookingsForDate(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                return (
                  <div 
                    key={day.toISOString()} 
                    className={`min-h-[90px] p-1.5 cursor-pointer hover:bg-slate-800/30 transition-colors ${!isCurrentMonth ? 'bg-slate-950/30' : ''} ${isToday ? 'bg-green-500/5 ring-1 ring-inset ring-green-500/30' : ''}`}
                    onClick={() => { setCurrentDate(day); setView("day"); }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold ${isToday ? 'text-green-400' : isCurrentMonth ? 'text-white' : 'text-slate-600'}`}>{format(day, "d")}</span>
                      {dayBookings.length > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${dayBookings.length > 3 ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-300'}`}>
                          {dayBookings.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayBookings.slice(0, 2).map(booking => (
                        <div 
                          key={booking.booking_id} 
                          className={`text-[10px] px-1 py-0.5 rounded border-l-2 truncate ${STATUS_COLORS[booking.status]}`} 
                          onClick={(e) => { e.stopPropagation(); openBookingDetails(booking); }}
                          title={`${booking.time_slot} - ${booking.customer_name} - ${booking.plate_number}`}
                        >
                          <span className="font-medium">{booking.time_slot}</span> {booking.plate_number}
                        </div>
                      ))}
                      {dayBookings.length > 2 && (
                        <div className="text-[9px] text-slate-500 pl-1">+{dayBookings.length - 2} további</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Mobile view - compact list */}
        <div className="sm:hidden">
          <div className="grid grid-cols-7 bg-slate-950/50">
            {["H", "K", "Sz", "Cs", "P", "Szo", "V"].map((d, idx) => (
              <div key={idx} className="p-1 text-center text-[10px] text-slate-500 font-medium">{d}</div>
            ))}
          </div>
          {weeks.map((week, i) => (
            <div key={i} className="grid grid-cols-7 border-t border-slate-800">
              {week.map(day => {
                const dayBookings = getBookingsForDate(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                return (
                  <div 
                    key={day.toISOString()} 
                    className={`min-h-[50px] p-1 border-r border-slate-800 last:border-r-0 ${!isCurrentMonth ? 'bg-slate-950/30' : ''} ${isToday ? 'bg-green-500/10' : ''}`}
                    onClick={() => {
                      if (dayBookings.length > 0) {
                        setCurrentDate(day);
                        setView("day");
                      }
                    }}
                  >
                    <div className={`text-[10px] font-medium ${isToday ? 'text-green-400' : isCurrentMonth ? 'text-white' : 'text-slate-600'}`}>
                      {format(day, "d")}
                    </div>
                    {dayBookings.length > 0 && (
                      <div className="mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 mx-auto" title={`${dayBookings.length} foglalás`} />
                        {dayBookings.length > 1 && (
                          <div className="text-[8px] text-center text-slate-400">+{dayBookings.length - 1}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4" data-testid="calendar-page">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 sm:w-7 sm:h-7 text-green-400" />
          Foglalási naptár
        </h1>
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
          {/* Location filter */}
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-full sm:w-36 bg-slate-900 border-slate-700 text-white text-sm">
              <MapPin className="w-4 h-4 mr-1 sm:mr-2 text-green-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              {LOCATIONS.map(loc => (
                <SelectItem key={loc} value={loc} className="text-white">{loc === "all" ? "Minden telephely" : loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Worker filter - only shown when not in workers view mode */}
          {viewMode !== "workers" && (
            <Select value={selectedWorker} onValueChange={setSelectedWorker}>
              <SelectTrigger className="w-full sm:w-40 bg-slate-900 border-slate-700 text-white text-sm">
                <User className="w-4 h-4 mr-1 sm:mr-2 text-green-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all" className="text-white">Minden dolgozó</SelectItem>
                {workers.map(w => (
                  <SelectItem key={w.worker_id} value={w.worker_id} className="text-white">{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Time period view selector */}
          <div className="flex bg-slate-900 rounded-lg border border-slate-700 p-1">
            {[{ id: "day", label: "Nap" }, { id: "week", label: "Hét" }, { id: "month", label: "Hónap" }].map(v => (
              <button 
                key={v.id} 
                onClick={() => { setView(v.id); if (v.id === "month") setViewMode("standard"); }}
                className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${view === v.id ? 'bg-green-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {v.label}
              </button>
            ))}
          </div>
          
          {/* View mode toggle - only for day view */}
          {view === "day" && (
            <div className="flex bg-slate-900 rounded-lg border border-slate-700 p-1">
              <button 
                onClick={() => setViewMode("standard")} 
                className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm flex items-center gap-1 ${viewMode === "standard" ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Standard nézet"
              >
                <Grid3X3 className="w-3 h-3" />
                <span className="hidden sm:inline">Standard</span>
              </button>
              <button 
                onClick={() => setViewMode("workers")} 
                className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm flex items-center gap-1 ${viewMode === "workers" ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Munkásonkénti nézet"
              >
                <Columns3 className="w-3 h-3" />
                <span className="hidden sm:inline">Munkások</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate("prev")} className="border-slate-700 text-white px-2 sm:px-3">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-sm sm:text-lg font-semibold text-white capitalize">{renderTitle()}</h2>
        <Button variant="outline" size="sm" onClick={() => navigate("next")} className="border-slate-700 text-white px-2 sm:px-3">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-1 sm:gap-2">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <Badge key={status} className={`${STATUS_COLORS[status]} text-[10px] sm:text-xs px-1.5 sm:px-2`}>{label}</Badge>
        ))}
      </div>

      {/* Calendar content */}
      {loading ? (
        <div className="text-center py-20 text-slate-500">Betöltés...</div>
      ) : (
        <>
          {view === "day" && viewMode === "standard" && renderDayView()}
          {view === "day" && viewMode === "workers" && renderWorkersDayView()}
          {view === "week" && renderWeekView()}
          {view === "month" && renderMonthView()}
        </>
      )}

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => { setSelectedBooking(null); setEditMode(false); }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Car className="w-5 h-5 text-green-400" />
                {editMode ? "Foglalás szerkesztése" : "Foglalás részletei"}
              </span>
              {!editMode && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="border-slate-700">
                    <Edit className="w-4 h-4 mr-1" /> Szerkesztés
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedBooking && !editMode && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><label className="text-slate-500">Ügyfél</label><p className="font-medium">{selectedBooking.customer_name}</p></div>
                <div><label className="text-slate-500">Rendszám</label><p className="font-mono font-medium">{selectedBooking.plate_number}</p></div>
                <div><label className="text-slate-500">Autó</label><p>{selectedBooking.car_type}</p></div>
                <div><label className="text-slate-500">Szolgáltatás</label><p>{selectedBooking.service_name}</p></div>
                <div><label className="text-slate-500">Időpont</label><p>{selectedBooking.date} {selectedBooking.time_slot}</p></div>
                <div><label className="text-slate-500">Telephely</label><p>{selectedBooking.location}</p></div>
                <div><label className="text-slate-500">Telefon</label><p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedBooking.phone}</p></div>
                <div><label className="text-slate-500">Email</label><p className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" /> {selectedBooking.email}</p></div>
                <div className="col-span-2"><label className="text-slate-500">Ár</label><p className="text-green-400 font-bold text-lg">{selectedBooking.price?.toLocaleString()} Ft</p></div>
              </div>

              <div>
                <label className="text-slate-500 text-sm block mb-1">Dolgozó</label>
                <Select value={selectedBooking.worker_id || "none"} onValueChange={(v) => updateBooking({ worker_id: v === "none" ? null : v })}>
                  <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Nincs hozzárendelve" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="none" className="text-slate-400">Nincs hozzárendelve</SelectItem>
                    {workers.map(w => (<SelectItem key={w.worker_id} value={w.worker_id} className="text-white">{w.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-slate-500 text-sm block mb-2">Státusz</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_LABELS).map(([status, label]) => (
                    <Button key={status} size="sm" variant={selectedBooking.status === status ? "default" : "outline"}
                      className={selectedBooking.status === status ? "bg-green-600" : "border-slate-700"}
                      onClick={() => updateBooking({ status })}>
                      {status === "kesz" && <Check className="w-3 h-3 mr-1" />}
                      {status === "nem_jott_el" && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {status === "lemondta" && <X className="w-3 h-3 mr-1" />}
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedBooking.notes && (
                <div><label className="text-slate-500 text-sm">Megjegyzés</label><p className="text-sm mt-1 bg-slate-950/50 p-2 rounded">{selectedBooking.notes}</p></div>
              )}

              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <Button size="sm" variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="bg-red-600 hover:bg-red-700">
                  <Trash2 className="w-4 h-4 mr-1" /> Törlés
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowBlacklistDialog(true)} className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
                  <Ban className="w-4 h-4 mr-1" /> Tiltólistára
                </Button>
              </div>
            </div>
          )}

          {selectedBooking && editMode && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 text-sm">Ügyfél neve</label>
                  <Input value={editForm.customer_name || ""} onChange={e => setEditForm({...editForm, customer_name: e.target.value})} className="bg-slate-950 border-slate-700 text-white mt-1" />
                </div>
                <div>
                  <label className="text-slate-500 text-sm">Rendszám</label>
                  <Input value={editForm.plate_number || ""} onChange={e => setEditForm({...editForm, plate_number: e.target.value.toUpperCase()})} className="bg-slate-950 border-slate-700 text-white mt-1 uppercase" />
                </div>
                <div>
                  <label className="text-slate-500 text-sm">Autó típusa</label>
                  <Input value={editForm.car_type || ""} onChange={e => setEditForm({...editForm, car_type: e.target.value})} className="bg-slate-950 border-slate-700 text-white mt-1" />
                </div>
                <div>
                  <label className="text-slate-500 text-sm">Szolgáltatás</label>
                  <Select value={editForm.service_id || ""} onValueChange={v => setEditForm({...editForm, service_id: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                      {services.map(s => (<SelectItem key={s.service_id} value={s.service_id} className="text-white">{s.name} - {s.price?.toLocaleString()} Ft</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-slate-500 text-sm">Dátum</label>
                  <Input type="date" value={editForm.date || ""} onChange={e => setEditForm({...editForm, date: e.target.value})} className="bg-slate-950 border-slate-700 text-white mt-1" />
                </div>
                <div>
                  <label className="text-slate-500 text-sm">Időpont</label>
                  <Input value={editForm.time_slot || ""} onChange={e => setEditForm({...editForm, time_slot: e.target.value})} placeholder="10:00" className="bg-slate-950 border-slate-700 text-white mt-1" />
                </div>
                <div>
                  <label className="text-slate-500 text-sm">Telefon</label>
                  <Input value={editForm.phone || ""} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="bg-slate-950 border-slate-700 text-white mt-1" />
                </div>
                <div>
                  <label className="text-slate-500 text-sm">Email</label>
                  <Input value={editForm.email || ""} onChange={e => setEditForm({...editForm, email: e.target.value})} className="bg-slate-950 border-slate-700 text-white mt-1" />
                </div>
              </div>
              <div>
                <label className="text-slate-500 text-sm">Megjegyzés</label>
                <textarea value={editForm.notes || ""} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-sm mt-1 h-20" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditMode(false)} className="border-slate-700">Mégse</Button>
                <Button onClick={saveEdit} className="bg-green-600 hover:bg-green-700"><Save className="w-4 h-4 mr-1" /> Mentés</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader><DialogTitle className="text-red-400">Foglalás törlése</DialogTitle></DialogHeader>
          <p className="text-slate-400">Biztosan törölni szeretnéd ezt a foglalást?</p>
          <p className="text-white font-medium">{selectedBooking?.customer_name} - {selectedBooking?.date} {selectedBooking?.time_slot}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="border-slate-700">Mégse</Button>
            <Button variant="destructive" onClick={deleteBooking} className="bg-red-600 hover:bg-red-700">Törlés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blacklist Dialog */}
      <Dialog open={showBlacklistDialog} onOpenChange={(open) => { 
        setShowBlacklistDialog(open); 
        if (!open) { setBlacklistReason(""); setBlacklistImages([]); }
      }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <UserX className="w-5 h-5" /> Tiltólistára helyezés
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">Az ügyfél ({selectedBooking?.customer_name} - {selectedBooking?.plate_number}) felkerül a tiltólistára és nem tud majd időpontot foglalni.</p>
          <div>
            <label className="text-slate-500 text-sm">Indoklás *</label>
            <textarea value={blacklistReason} onChange={e => setBlacklistReason(e.target.value)} placeholder="Pl: Többszöri meg nem jelenés, fizetés nélkül távozott, stb." className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-sm mt-1 h-20" />
          </div>
          
          {/* Evidence Images Upload */}
          <div>
            <label className="text-slate-500 text-sm flex items-center gap-2">
              <Image className="w-4 h-4" /> Bizonyíték képek (opcionális)
            </label>
            <input 
              type="file" 
              ref={blacklistFileRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleBlacklistImageUpload}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {blacklistImages.map((url, idx) => (
                <div key={idx} className="relative w-16 h-16 group">
                  <img src={url} alt={`Bizonyíték ${idx + 1}`} className="w-full h-full object-cover rounded-lg border border-slate-700" />
                  <button 
                    onClick={() => removeBlacklistImage(idx)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => blacklistFileRef.current?.click()}
                disabled={uploadingBlacklistImage}
                className="w-16 h-16 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors"
              >
                {uploadingBlacklistImage ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-500 border-t-orange-400" />
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span className="text-[10px] mt-1">Kép</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-slate-600 text-xs mt-1">Fotók a károkról, problémákról</p>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowBlacklistDialog(false); setBlacklistReason(""); setBlacklistImages([]); }} className="border-slate-700">Mégse</Button>
            <Button onClick={addToBlacklist} className="bg-orange-600 hover:bg-orange-700"><Ban className="w-4 h-4 mr-1" /> Tiltólistára</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
