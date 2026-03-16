import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { API, LocationContext } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addWeeks, subWeeks, addMonths, subMonths } from "date-fns";
import { hu } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Car, Phone, Mail, MapPin, XCircle, Ban, CheckCircle2, FileText } from "lucide-react";

const statusColors = {
  foglalt: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  folyamatban: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  kesz: "bg-green-500/20 text-green-400 border-green-500/30",
  lemondta: "bg-red-500/20 text-red-400 border-red-500/30",
  nem_jott_el: "bg-slate-500/20 text-slate-400 border-slate-500/30"
};
const statusLabels = { foglalt: "Foglalt", folyamatban: "Folyamatban", kesz: "Kész", lemondta: "Lemondta", nem_jott_el: "Nem jött el" };

const BookingCalendar = () => {
  const { selectedLocation } = useContext(LocationContext);
  const [bookings, setBookings] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [view, setView] = useState("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchBookings = async () => {
    try {
      const loc = selectedLocation !== "all" ? `&location=${selectedLocation}` : "";
      let dateParams = "";
      if (view === "day") {
        dateParams = `date=${format(currentDate, "yyyy-MM-dd")}`;
      } else if (view === "week") {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
        const we = endOfWeek(currentDate, { weekStartsOn: 1 });
        dateParams = `date_from=${format(ws, "yyyy-MM-dd")}&date_to=${format(we, "yyyy-MM-dd")}`;
      } else {
        const ms = startOfMonth(currentDate);
        const me = endOfMonth(currentDate);
        dateParams = `date_from=${format(ms, "yyyy-MM-dd")}&date_to=${format(me, "yyyy-MM-dd")}`;
      }
      const [bkgRes, wrkRes] = await Promise.all([
        axios.get(`${API}/bookings?${dateParams}${loc}`, { withCredentials: true }),
        axios.get(`${API}/workers${selectedLocation !== "all" ? `?location=${selectedLocation}` : ""}`, { withCredentials: true })
      ]);
      setBookings(bkgRes.data);
      setWorkers(wrkRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchBookings(); }, [currentDate, view, selectedLocation]);

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}`, { status: newStatus }, { withCredentials: true });
      toast.success(`Státusz frissítve: ${statusLabels[newStatus]}`);
      fetchBookings();
      setDetailOpen(false);
    } catch (err) {
      toast.error("Hiba a frissítésnél");
    }
  };

  const navigate = (dir) => {
    if (view === "day") setCurrentDate(prev => addDays(prev, dir));
    else if (view === "week") setCurrentDate(prev => dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    else setCurrentDate(prev => dir > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const BookingCard = ({ booking }) => (
    <div
      className={`p-2 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${statusColors[booking.status] || statusColors.foglalt}`}
      onClick={() => { setSelectedBooking(booking); setDetailOpen(true); }}
      data-testid={`booking-card-${booking.booking_id}`}
    >
      <div className="flex justify-between items-start">
        <span className="text-white font-semibold text-sm">{booking.time_slot}</span>
        <Badge variant="outline" className={`text-xs ${statusColors[booking.status]}`}>
          {statusLabels[booking.status]}
        </Badge>
      </div>
      <p className="text-white text-sm mt-1 truncate">{booking.customer_name}</p>
      <p className="text-slate-400 text-xs">{booking.plate_number} - {booking.service_name}</p>
      <p className="text-green-400 text-xs font-semibold">{booking.price?.toLocaleString()} Ft</p>
    </div>
  );

  // DAY VIEW
  const DayView = () => {
    const timeSlots = [];
    for (let h = 8; h < 18; h++) {
      for (let m of [0, 30]) timeSlots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
    const dayStr = format(currentDate, "yyyy-MM-dd");
    return (
      <div className="space-y-1" data-testid="calendar-day-view">
        {timeSlots.map(slot => {
          const slotBookings = bookings.filter(b => b.date === dayStr && b.time_slot === slot);
          return (
            <div key={slot} className="flex gap-3 items-start min-h-[50px]">
              <span className="text-slate-500 text-sm w-14 pt-2 shrink-0 text-right">{slot}</span>
              <div className="flex-1 flex gap-2 flex-wrap border-l border-slate-800 pl-3 py-1">
                {slotBookings.map(b => <BookingCard key={b.booking_id} booking={b} />)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // WEEK VIEW
  const WeekView = () => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: ws, end: addDays(ws, 6) });
    return (
      <div className="grid grid-cols-7 gap-2" data-testid="calendar-week-view">
        {days.map(day => {
          const dayStr = format(day, "yyyy-MM-dd");
          const dayBookings = bookings.filter(b => b.date === dayStr);
          const isToday = isSameDay(day, new Date());
          return (
            <div key={dayStr} className={`rounded-lg border p-2 min-h-[200px] ${isToday ? 'border-green-500/50 bg-green-500/5' : 'border-slate-800'}`}>
              <p className={`text-xs font-semibold mb-2 ${isToday ? 'text-green-400' : 'text-slate-400'}`}>
                {format(day, "EEE dd", { locale: hu })}
              </p>
              <div className="space-y-1">
                {dayBookings.map(b => <BookingCard key={b.booking_id} booking={b} />)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // MONTH VIEW
  const MonthView = () => {
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(currentDate);
    const ws = startOfWeek(ms, { weekStartsOn: 1 });
    const we = endOfWeek(me, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: ws, end: we });
    return (
      <div data-testid="calendar-month-view">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["H", "K", "Sze", "Cs", "P", "Szo", "V"].map(d => (
            <div key={d} className="text-center text-slate-500 text-xs font-semibold py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayBookings = bookings.filter(b => b.date === dayStr);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            return (
              <div key={dayStr} className={`rounded-lg border p-1 min-h-[80px] ${isToday ? 'border-green-500/50' : 'border-slate-800/50'} ${!isCurrentMonth ? 'opacity-40' : ''}`}>
                <p className={`text-xs ${isToday ? 'text-green-400 font-bold' : 'text-slate-500'}`}>{format(day, "d")}</p>
                {dayBookings.slice(0, 3).map(b => (
                  <div key={b.booking_id} className={`mt-0.5 px-1 py-0.5 rounded text-xs truncate cursor-pointer ${statusColors[b.status]}`}
                    onClick={() => { setSelectedBooking(b); setDetailOpen(true); }}>
                    {b.time_slot} {b.customer_name?.split(" ")[0]}
                  </div>
                ))}
                {dayBookings.length > 3 && <p className="text-xs text-slate-500 mt-0.5">+{dayBookings.length - 3} még</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const dateLabel = view === "day" ? format(currentDate, "yyyy. MMMM dd. (EEEE)", { locale: hu })
    : view === "week" ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM dd.", { locale: hu })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "MMM dd.", { locale: hu })}`
    : format(currentDate, "yyyy. MMMM", { locale: hu });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white font-['Manrope']">Foglalások</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setCurrentDate(new Date())} data-testid="calendar-today-btn">
            Ma
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-400" onClick={() => navigate(-1)}><ChevronLeft className="w-5 h-5" /></Button>
          <span className="text-white font-semibold text-sm min-w-[180px] text-center">{dateLabel}</span>
          <Button variant="ghost" size="icon" className="text-slate-400" onClick={() => navigate(1)}><ChevronRight className="w-5 h-5" /></Button>
        </div>
      </div>

      {/* View tabs */}
      <Tabs value={view} onValueChange={setView}>
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="day" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Napi</TabsTrigger>
          <TabsTrigger value="week" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Heti</TabsTrigger>
          <TabsTrigger value="month" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Havi</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Calendar */}
      <Card className="glass-card">
        <CardContent className="p-4">
          {view === "day" && <DayView />}
          {view === "week" && <WeekView />}
          {view === "month" && <MonthView />}
          {bookings.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nincs foglalás ebben az időszakban</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Foglalás részletei</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Badge variant="outline" className={`${statusColors[selectedBooking.status]}`}>
                  {statusLabels[selectedBooking.status]}
                </Badge>
                <span className="text-green-400 text-xl font-bold">{selectedBooking.price?.toLocaleString()} Ft</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-500" /><span>{selectedBooking.customer_name}</span></div>
                <div className="flex items-center gap-2"><Car className="w-4 h-4 text-slate-500" /><span>{selectedBooking.car_type} - <strong className="font-mono">{selectedBooking.plate_number}</strong></span></div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-500" /><span>{selectedBooking.phone}</span></div>
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-500" /><span>{selectedBooking.email}</span></div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-500" /><span>{selectedBooking.date} {selectedBooking.time_slot}</span></div>
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-500" /><span>{selectedBooking.location}</span></div>
                <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500" /><span>{selectedBooking.service_name}</span></div>
                {selectedBooking.worker_name && <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-500" /><span>Dolgozó: {selectedBooking.worker_name}</span></div>}
                {selectedBooking.notes && <div className="p-2 bg-slate-950/50 rounded text-slate-400 text-xs">{selectedBooking.notes}</div>}
              </div>
              {selectedBooking.status === "foglalt" && (
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => handleStatusChange(selectedBooking.booking_id, "folyamatban")} data-testid="status-in-progress-btn">
                    Folyamatban
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange(selectedBooking.booking_id, "kesz")} data-testid="status-done-btn">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Kész
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={() => handleStatusChange(selectedBooking.booking_id, "lemondta")} data-testid="status-cancelled-btn">
                    <XCircle className="w-4 h-4 mr-1" /> Lemondta
                  </Button>
                  <Button size="sm" variant="outline" className="border-slate-600 text-slate-400 hover:bg-slate-800" onClick={() => handleStatusChange(selectedBooking.booking_id, "nem_jott_el")} data-testid="status-noshow-btn">
                    <Ban className="w-4 h-4 mr-1" /> Nem jött el
                  </Button>
                </div>
              )}
              {selectedBooking.status === "folyamatban" && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700 w-full" onClick={() => handleStatusChange(selectedBooking.booking_id, "kesz")}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Kész
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingCalendar;
