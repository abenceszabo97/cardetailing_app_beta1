import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Car, MapPin, Phone, Mail, X, Check, AlertTriangle } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO, addWeeks, subWeeks } from "date-fns";
import { hu } from "date-fns/locale";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const LOCATIONS = ["all", "Budapest", "Debrecen"];
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

const Calendar = () => {
  const [view, setView] = useState("week"); // day, week, month
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [location, setLocation] = useState("all");
  const [selectedWorker, setSelectedWorker] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [currentDate, location, view]);

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

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}`, { status }, { withCredentials: true });
      toast.success("Foglalás frissítve");
      fetchData();
      setSelectedBooking(null);
    } catch (error) {
      toast.error("Hiba a frissítéskor");
    }
  };

  const assignWorker = async (bookingId, workerId) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}`, { worker_id: workerId }, { withCredentials: true });
      toast.success("Dolgozó hozzárendelve");
      fetchData();
    } catch (error) {
      toast.error("Hiba a hozzárendeléskor");
    }
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

  const renderTitle = () => {
    if (view === "month") return format(currentDate, "yyyy MMMM", { locale: hu });
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, "MMM d", { locale: hu })} - ${format(end, "MMM d, yyyy", { locale: hu })}`;
    }
    return format(currentDate, "yyyy. MMMM d. (EEEE)", { locale: hu });
  };

  // Day View
  const renderDayView = () => {
    const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8:00 - 18:00
    
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="grid grid-cols-[80px_1fr] divide-x divide-slate-800">
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
              <div key={hour} className="grid grid-cols-[80px_1fr] divide-x divide-slate-800 border-t border-slate-800 min-h-[60px]">
                <div className="p-2 text-xs text-slate-500 text-right pr-3">{hour}:00</div>
                <div className="p-1 space-y-1">
                  {slotBookings.map(booking => (
                    <div
                      key={booking.booking_id}
                      className={`p-2 rounded-lg border cursor-pointer text-xs ${STATUS_COLORS[booking.status]}`}
                      onClick={() => setSelectedBooking(booking)}
                      data-testid={`booking-${booking.booking_id}`}
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

  // Week View
  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
    const hours = Array.from({ length: 11 }, (_, i) => i + 8);

    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] divide-x divide-slate-800">
          <div className="bg-slate-950/50" />
          {days.map(day => (
            <div key={day.toISOString()} className={`p-2 text-center bg-slate-950/50 ${isSameDay(day, new Date()) ? 'bg-green-500/10' : ''}`}>
              <div className="text-xs text-slate-500">{format(day, "EEE", { locale: hu })}</div>
              <div className={`text-lg font-bold ${isSameDay(day, new Date()) ? 'text-green-400' : 'text-white'}`}>
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] divide-x divide-slate-800 border-t border-slate-800 min-h-[50px]">
              <div className="p-1 text-xs text-slate-500 text-right pr-2">{hour}:00</div>
              {days.map(day => {
                const slotBookings = getBookingsForSlot(day, hour);
                return (
                  <div key={day.toISOString()} className="p-1 space-y-1">
                    {slotBookings.map(booking => (
                      <div
                        key={booking.booking_id}
                        className={`p-1 rounded text-xs cursor-pointer truncate ${STATUS_COLORS[booking.status]}`}
                        onClick={() => setSelectedBooking(booking)}
                        title={`${booking.customer_name} - ${booking.plate_number}`}
                      >
                        {booking.time_slot} {booking.customer_name?.split(' ')[0]}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
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
                  className={`min-h-[80px] p-1 ${!isCurrentMonth ? 'bg-slate-950/30' : ''} ${isToday ? 'bg-green-500/5' : ''}`}
                >
                  <div className={`text-xs font-medium mb-1 ${isToday ? 'text-green-400' : isCurrentMonth ? 'text-white' : 'text-slate-600'}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayBookings.slice(0, 3).map(booking => (
                      <div
                        key={booking.booking_id}
                        className={`text-xs p-0.5 rounded truncate cursor-pointer ${STATUS_COLORS[booking.status]}`}
                        onClick={() => setSelectedBooking(booking)}
                      >
                        {booking.time_slot} {booking.customer_name?.split(' ')[0]}
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <div className="text-xs text-slate-500">+{dayBookings.length - 3} további</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4" data-testid="calendar-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CalendarIcon className="w-7 h-7 text-green-400" />
          Foglalási naptár
        </h1>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Location filter */}
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-36 bg-slate-900 border-slate-700 text-white" data-testid="calendar-location-filter">
              <MapPin className="w-4 h-4 mr-2 text-green-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              {LOCATIONS.map(loc => (
                <SelectItem key={loc} value={loc} className="text-white">
                  {loc === "all" ? "Minden telephely" : loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Worker filter */}
          <Select value={selectedWorker} onValueChange={setSelectedWorker}>
            <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-white" data-testid="calendar-worker-filter">
              <User className="w-4 h-4 mr-2 text-green-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-white">Minden dolgozó</SelectItem>
              {workers.map(w => (
                <SelectItem key={w.worker_id} value={w.worker_id} className="text-white">{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View selector */}
          <div className="flex bg-slate-900 rounded-lg border border-slate-700 p-1">
            {[{ id: "day", label: "Nap" }, { id: "week", label: "Hét" }, { id: "month", label: "Hónap" }].map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`px-3 py-1 rounded text-sm ${view === v.id ? 'bg-green-500 text-white' : 'text-slate-400 hover:text-white'}`}
                data-testid={`calendar-view-${v.id}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate("prev")} className="border-slate-700 text-white" data-testid="calendar-prev">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-semibold text-white capitalize">{renderTitle()}</h2>
        <Button variant="outline" size="sm" onClick={() => navigate("next")} className="border-slate-700 text-white" data-testid="calendar-next">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <Badge key={status} className={STATUS_COLORS[status]}>{label}</Badge>
        ))}
      </div>

      {/* Calendar */}
      {loading ? (
        <div className="text-center py-20 text-slate-500">Betöltés...</div>
      ) : (
        <>
          {view === "day" && renderDayView()}
          {view === "week" && renderWeekView()}
          {view === "month" && renderMonthView()}
        </>
      )}

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-green-400" />
              Foglalás részletei
            </DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-slate-500">Ügyfél</label>
                  <p className="font-medium">{selectedBooking.customer_name}</p>
                </div>
                <div>
                  <label className="text-slate-500">Rendszám</label>
                  <p className="font-mono font-medium">{selectedBooking.plate_number}</p>
                </div>
                <div>
                  <label className="text-slate-500">Autó</label>
                  <p>{selectedBooking.car_type}</p>
                </div>
                <div>
                  <label className="text-slate-500">Szolgáltatás</label>
                  <p>{selectedBooking.service_name}</p>
                </div>
                <div>
                  <label className="text-slate-500">Időpont</label>
                  <p>{selectedBooking.date} {selectedBooking.time_slot}</p>
                </div>
                <div>
                  <label className="text-slate-500">Telephely</label>
                  <p>{selectedBooking.location}</p>
                </div>
                <div>
                  <label className="text-slate-500">Telefon</label>
                  <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedBooking.phone}</p>
                </div>
                <div>
                  <label className="text-slate-500">Email</label>
                  <p className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" /> {selectedBooking.email}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-slate-500">Ár</label>
                  <p className="text-green-400 font-bold text-lg">{selectedBooking.price?.toLocaleString()} Ft</p>
                </div>
              </div>

              {/* Worker assignment */}
              <div>
                <label className="text-slate-500 text-sm block mb-1">Dolgozó</label>
                <Select 
                  value={selectedBooking.worker_id || "none"} 
                  onValueChange={(v) => assignWorker(selectedBooking.booking_id, v === "none" ? null : v)}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-700">
                    <SelectValue placeholder="Nincs hozzárendelve" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="none" className="text-slate-400">Nincs hozzárendelve</SelectItem>
                    {workers.map(w => (
                      <SelectItem key={w.worker_id} value={w.worker_id} className="text-white">{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <label className="text-slate-500 text-sm block mb-2">Státusz módosítása</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_LABELS).map(([status, label]) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={selectedBooking.status === status ? "default" : "outline"}
                      className={selectedBooking.status === status ? "bg-green-600" : "border-slate-700"}
                      onClick={() => updateBookingStatus(selectedBooking.booking_id, status)}
                      data-testid={`booking-status-${status}`}
                    >
                      {status === "kesz" && <Check className="w-3 h-3 mr-1" />}
                      {status === "nem_jott_el" && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {status === "lemondta" && <X className="w-3 h-3 mr-1" />}
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedBooking.notes && (
                <div>
                  <label className="text-slate-500 text-sm">Megjegyzés</label>
                  <p className="text-sm mt-1 bg-slate-950/50 p-2 rounded">{selectedBooking.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
