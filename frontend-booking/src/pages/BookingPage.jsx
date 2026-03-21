import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { 
  Car, MapPin, Clock, User, Phone, Mail, FileText, CheckCircle2, 
  ChevronRight, ChevronLeft, Search, Star, Loader2, Sparkles,
  Calendar, Users, Timer, AlertTriangle, Plus, X
} from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, isToday, isBefore } from "date-fns";
import { hu } from "date-fns/locale";
import { AIChatbot } from "../components/AIComponents";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const BookingPage = () => {
  const [step, setStep] = useState(1);
  const [locations, setLocations] = useState([]);
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    customer_name: "", car_type: "", plate_number: "", email: "", phone: "",
    address: "", invoice_name: "", invoice_tax_number: "", invoice_address: "",
    service_id: "", worker_id: "", location: "", date: "", time_slot: "", notes: ""
  });
  const [showInvoice, setShowInvoice] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [customerFound, setCustomerFound] = useState(null);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [selectedWeekStart, setSelectedWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [serviceCategory, setServiceCategory] = useState("all");
  // Second car state
  const [addSecondCar, setAddSecondCar] = useState(false);
  const [secondCar, setSecondCar] = useState({
    car_type: "",
    plate_number: "",
    service_id: ""
  });

  useEffect(() => {
    console.log("API URL:", API);
    axios.get(`${API}/bookings/public-locations`)
      .then(r => setLocations(Array.isArray(r.data) ? r.data : []))
      .catch(err => { console.error("Locations error:", err); setLocations([]); });
    axios.get(`${API}/bookings/public-services`)
      .then(r => setServices(Array.isArray(r.data) ? r.data : []))
      .catch(err => { console.error("Services error:", err); setServices([]); });
  }, []);

  useEffect(() => {
    if (form.location && form.date) {
      setLoadingSlots(true);
      axios.get(`${API}/bookings/available-slots?location=${form.location}&date=${form.date}`)
        .then(r => { setSlots(r.data); setLoadingSlots(false); })
        .catch(() => setLoadingSlots(false));
    }
  }, [form.location, form.date]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const selectedService = services.find(s => s.service_id === form.service_id);
  
  const filteredServices = serviceCategory === "all" 
    ? services 
    : services.filter(s => s.category === serviceCategory);

  const categories = [...new Set(services.map(s => s.category))];

  const lookupPlate = useCallback(async (plate) => {
    if (!plate || plate.length < 5) {
      setCustomerFound(null);
      setIsBlacklisted(false);
      return;
    }
    setLookingUp(true);
    try {
      // Check blacklist first
      const blacklistRes = await axios.get(`${API}/blacklist/check/${encodeURIComponent(plate)}`);
      if (blacklistRes.data.blacklisted) {
        setIsBlacklisted(true);
        setBlacklistReason(blacklistRes.data.reason || "");
        setCustomerFound(null);
        setLookingUp(false);
        return;
      }
      setIsBlacklisted(false);
      
      // Then lookup customer
      const response = await axios.get(`${API}/bookings/lookup-plate/${encodeURIComponent(plate)}`);
      if (response.data.found) {
        setCustomerFound(response.data);
        setForm(prev => ({
          ...prev,
          customer_name: response.data.customer_name || prev.customer_name,
          phone: response.data.phone || prev.phone,
          email: response.data.email || prev.email,
          car_type: response.data.car_type || prev.car_type,
          address: response.data.address || prev.address
        }));
        toast.success("Visszatérő ügyfél! Adatok betöltve.", { duration: 3000 });
      } else {
        setCustomerFound(null);
      }
    } catch {
      setCustomerFound(null);
    }
    setLookingUp(false);
  }, []);

  const handlePlateChange = (value) => {
    const plate = value.toUpperCase();
    set("plate_number", plate);
    if (plate.length >= 5) {
      const timeoutId = setTimeout(() => lookupPlate(plate), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const canGoNext = () => {
    if (step === 1) return form.location && form.service_id;
    if (step === 2) return form.date && form.time_slot;
    if (step === 3) return form.customer_name && form.plate_number && form.email && form.phone && form.car_type && !isBlacklisted;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const bookingData = { ...form };
      // Add second car if enabled
      if (addSecondCar && secondCar.plate_number && secondCar.service_id) {
        bookingData.second_car = secondCar;
      }
      const response = await axios.post(`${API}/bookings`, bookingData);
      setSuccess(true);
      if (response.data.second_booking) {
        toast.success("Mindkét foglalás sikeresen rögzítve!");
      } else {
        toast.success("Foglalás sikeresen rögzítve!");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a foglalás során");
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setSuccess(false);
    setStep(1);
    setCustomerFound(null);
    setAddSecondCar(false);
    setSecondCar({ car_type: "", plate_number: "", service_id: "" });
    setForm({
      customer_name: "", car_type: "", plate_number: "", email: "", phone: "",
      address: "", invoice_name: "", invoice_tax_number: "", invoice_address: "",
      service_id: "", worker_id: "", location: "", date: "", time_slot: "", notes: ""
    });
  };

  // Get week days for calendar
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(selectedWeekStart, i));

  // Slot availability color
  const getSlotStyle = (slot) => {
    if (!slot.is_available) return "bg-slate-800/50 text-slate-600 cursor-not-allowed border-slate-700/50";
    const percent = slot.availability_percent;
    if (percent === 100) return "bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30";
    if (percent >= 50) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/30";
    return "bg-orange-500/20 text-orange-400 border-orange-500/50 hover:bg-orange-500/30";
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtNi42MjcgMC0xMiA1LjM3My0xMiAxMnM1LjM3MyAxMiAxMiAxMiAxMi01LjM3MyAxMi0xMi01LjM3My0xMi0xMi0xMnptMCAyMGMtNC40MTggMC04LTMuNTgyLTgtOHMzLjU4Mi04IDgtOCA4IDMuNTgyIDggOC0zLjU4MiA4LTggOHoiIGZpbGw9IiMxMGIyODEiIGZpbGwtb3BhY2l0eT0iLjAzIi8+PC9nPjwvc3ZnPg==')] opacity-50" />
        <Card className="w-full max-w-md bg-slate-900/90 border-slate-800 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Foglalás sikeres!</h2>
            <p className="text-slate-400 mb-2">Kedves {form.customer_name},</p>
            <p className="text-slate-400 mb-4">
              Foglalását rögzítettük: <strong className="text-white">{form.date}</strong> - <strong className="text-green-400">{form.time_slot}</strong>
            </p>
            <div className="bg-slate-950/50 rounded-xl p-4 mb-6 text-left border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <Car className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium">{selectedService?.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-slate-400">Telephely:</div>
                <div className="text-white">{form.location}</div>
                <div className="text-slate-400">Rendszám:</div>
                <div className="text-white font-mono">{form.plate_number}</div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Fizetendő:</span>
                <span className="text-green-400 text-xl font-bold">{selectedService?.price?.toLocaleString()} Ft</span>
              </div>
            </div>
            <p className="text-slate-500 text-sm mb-4">Visszaigazoló e-mailt küldtünk.</p>
            <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium" onClick={resetForm}>
              <Sparkles className="w-4 h-4 mr-2" /> Új foglalás
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtNi42MjcgMC0xMiA1LjM3My0xMiAxMnM1LjM3MyAxMiAxMiAxMiAxMi01LjM3MyAxMi0xMi01LjM3My0xMi0xMi0xMnptMCAyMGMtNC40MTggMC04LTMuNTgyLTgtOHMzLjU4Mi04IDgtOCA4IDMuNTgyIDggOC0zLjU4MiA4LTggOHoiIGZpbGw9IiMxMGIyODEiIGZpbGwtb3BhY2l0eT0iLjAzIi8+PC9nPjwvc3ZnPg==')] opacity-50" />
      
      <div className="w-full max-w-2xl relative">
        {/* Header with Company Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-28 md:w-32 sm:h-28 md:h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-lg shadow-green-500/20 p-2 sm:p-3">
            <img 
              src="https://customer-assets.emergentagent.com/job_80351f3f-7954-46a7-9193-7dcbfbf56786/artifacts/lnbybw8y_59e55ae7-d1bd-2941-05b0-2eeff82c6764.png" 
              alt="X-CLEAN Logo" 
              className="w-full h-full object-contain mix-blend-multiply"
              data-testid="company-logo"
            />
          </div>
          <p className="text-slate-400 text-sm sm:text-base">Online időpontfoglalás</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 sm:mb-8 overflow-x-auto px-2">
          {[
            { num: 1, label: "Szolgáltatás", icon: Sparkles },
            { num: 2, label: "Időpont", icon: Calendar },
            { num: 3, label: "Adatok", icon: User },
            { num: 4, label: "Összegzés", icon: CheckCircle2 }
          ].map((s, i) => (
            <div key={s.num} className="flex items-center flex-shrink-0">
              <div className={`flex flex-col items-center ${step >= s.num ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 ${
                  step >= s.num 
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20' 
                    : 'bg-slate-800'
                }`}>
                  <s.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${step >= s.num ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <span className={`text-[10px] sm:text-xs mt-1 ${step >= s.num ? 'text-green-400' : 'text-slate-600'}`}>{s.label}</span>
              </div>
              {i < 3 && <div className={`w-6 sm:w-12 h-0.5 mx-0.5 sm:mx-1 ${step > s.num ? 'bg-green-500' : 'bg-slate-800'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Location & Service */}
        {step === 1 && (
          <Card className="bg-slate-900/90 border-slate-800 backdrop-blur-xl overflow-hidden" data-testid="booking-step-1">
            <div className="h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-green-400" />
                </div>
                Telephely és szolgáltatás
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Telephely *</label>
                <div className="grid grid-cols-2 gap-3">
                  {locations.map(loc => (
                    <button
                      key={loc}
                      onClick={() => set("location", loc)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        form.location === loc 
                          ? 'border-green-500 bg-green-500/10' 
                          : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                      }`}
                      data-testid={`location-${loc}`}
                    >
                      <MapPin className={`w-5 h-5 mx-auto mb-2 ${form.location === loc ? 'text-green-400' : 'text-slate-500'}`} />
                      <span className={`font-medium ${form.location === loc ? 'text-white' : 'text-slate-300'}`}>{loc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Szolgáltatás *</label>
                {/* Category Filter */}
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                  <button
                    onClick={() => setServiceCategory("all")}
                    className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                      serviceCategory === "all" ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Összes
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setServiceCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-sm capitalize whitespace-nowrap transition-all ${
                        serviceCategory === cat ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin" data-testid="booking-services">
                  {filteredServices.map(svc => (
                    <div
                      key={svc.service_id}
                      onClick={() => set("service_id", svc.service_id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        form.service_id === svc.service_id 
                          ? 'border-green-500 bg-green-500/10' 
                          : 'border-slate-700/50 hover:border-slate-600 bg-slate-800/30'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-white font-medium">{svc.name}</span>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-slate-500 text-xs flex items-center gap-1">
                              <Timer className="w-3 h-3" /> {svc.duration} perc
                            </span>
                            {svc.car_size && (
                              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                {svc.car_size}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <span className="text-green-400 font-bold text-lg">{svc.price?.toLocaleString()} Ft</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Calendar Date & Time Selection */}
        {step === 2 && (
          <Card className="bg-slate-900/90 border-slate-800 backdrop-blur-xl overflow-hidden" data-testid="booking-step-2">
            <div className="h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-400" />
                </div>
                Válassz időpontot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Week Navigation */}
              <div className="flex items-center justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-slate-700 text-slate-300"
                  onClick={() => setSelectedWeekStart(addDays(selectedWeekStart, -7))}
                  disabled={isBefore(selectedWeekStart, new Date())}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-white font-medium">
                  {format(selectedWeekStart, "yyyy. MMMM", { locale: hu })}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-slate-700 text-slate-300"
                  onClick={() => setSelectedWeekStart(addDays(selectedWeekStart, 7))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Week Calendar */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {weekDays.map(day => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const isPast = isBefore(day, new Date()) && !isToday(day);
                  const isSelected = form.date === dateStr;
                  
                  return (
                    <button
                      key={dateStr}
                      onClick={() => !isPast && set("date", dateStr)}
                      disabled={isPast}
                      className={`p-1.5 sm:p-3 rounded-lg sm:rounded-xl text-center transition-all ${
                        isPast 
                          ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed' 
                          : isSelected 
                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                            : isToday(day)
                              ? 'bg-slate-800 text-green-400 border-2 border-green-500/50'
                              : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700'
                      }`}
                      data-testid={`date-${dateStr}`}
                    >
                      <div className="text-[10px] sm:text-xs opacity-70">{format(day, "EEE", { locale: hu })}</div>
                      <div className="text-sm sm:text-lg font-bold">{format(day, "d")}</div>
                    </button>
                  );
                })}
              </div>

              {/* Time Slots */}
              {form.date && (
                <div className="mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                    <label className="text-sm text-slate-400">Időpontok - {format(new Date(form.date), "MMMM d.", { locale: hu })}</label>
                    <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 sm:w-3 sm:h-3 rounded bg-green-500/30"></span> Szabad</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 sm:w-3 sm:h-3 rounded bg-yellow-500/30"></span> Korlátozott</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 sm:w-3 sm:h-3 rounded bg-slate-700/50"></span> Foglalt</span>
                    </div>
                  </div>
                  
                  {loadingSlots ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 mx-auto text-green-400 animate-spin" />
                      <p className="text-slate-500 text-sm mt-2">Időpontok betöltése...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2" data-testid="booking-slots">
                      {slots.map(slot => (
                        <button
                          key={slot.time_slot}
                          onClick={() => {
                            if (slot.is_available) {
                              set("time_slot", slot.time_slot);
                              if (slot.available_workers.length > 0) {
                                set("worker_id", slot.available_workers[0].worker_id);
                              }
                            }
                          }}
                          disabled={!slot.is_available}
                          className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all ${
                            form.time_slot === slot.time_slot && slot.is_available
                              ? 'border-green-400 bg-green-500 text-white shadow-lg shadow-green-500/30'
                              : getSlotStyle(slot)
                          }`}
                          data-testid={`slot-${slot.time_slot}`}
                        >
                          <div className="font-bold text-sm sm:text-base">{slot.time_slot}</div>
                          {slot.is_available ? (
                            <div className="text-[10px] sm:text-xs opacity-70 flex items-center justify-center gap-1 mt-0.5 sm:mt-1">
                              <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {slot.available_workers.length}
                            </div>
                          ) : (
                            <div className="text-[10px] sm:text-xs opacity-50 mt-0.5 sm:mt-1">Foglalt</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Worker Selection */}
              {form.time_slot && slots.find(s => s.time_slot === form.time_slot)?.is_available && (
                <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
                    <Users className="w-4 h-4" /> Dolgozó választása (opcionális)
                  </label>
                  <Select value={form.worker_id} onValueChange={v => set("worker_id", v)}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                      <SelectValue placeholder="Automatikus hozzárendelés" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {(slots.find(s => s.time_slot === form.time_slot)?.available_workers || []).map(w => (
                        <SelectItem key={w.worker_id} value={w.worker_id} className="text-white">{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Personal Data */}
        {step === 3 && (
          <Card className="bg-slate-900/90 border-slate-800 backdrop-blur-xl overflow-hidden" data-testid="booking-step-3">
            <div className="h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-green-400" />
                </div>
                Személyes adatok
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Plate Lookup */}
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl p-4 border border-green-500/20">
                <label className="text-sm text-green-400 mb-2 block flex items-center gap-2">
                  <Search className="w-4 h-4" /> Gyors foglalás rendszámmal
                </label>
                <div className="relative">
                  <Input 
                    placeholder="ABC-123" 
                    value={form.plate_number} 
                    onChange={e => handlePlateChange(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white uppercase font-mono text-lg tracking-wider pr-10" 
                    data-testid="booking-plate"
                  />
                  {lookingUp && (
                    <Loader2 className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-green-400 animate-spin" />
                  )}
                </div>
                {customerFound && (
                  <div className="mt-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">Visszatérő ügyfél!</span>
                    {customerFound.is_vip && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 ml-auto">
                        <Star className="w-3 h-3 mr-1" /> VIP
                      </Badge>
                    )}
                    <span className="text-slate-500 text-sm ml-auto">{customerFound.completed_bookings} mosás</span>
                  </div>
                )}
                {isBlacklisted && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">Ez a rendszám tiltólistán van</span>
                    </div>
                    {blacklistReason && (
                      <p className="text-red-400/70 text-sm mt-1 ml-7">{blacklistReason}</p>
                    )}
                    <p className="text-slate-500 text-sm mt-2 ml-7">Kérjük forduljon a mosó személyzetéhez.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input placeholder="Név *" value={form.customer_name} onChange={e => set("customer_name", e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white" data-testid="booking-name" />
                <Input placeholder="Autó típusa *" value={form.car_type} onChange={e => set("car_type", e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white" data-testid="booking-car-type" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input placeholder="E-mail *" type="email" value={form.email} onChange={e => set("email", e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white" data-testid="booking-email" />
                <Input placeholder="Telefonszám *" value={form.phone} onChange={e => set("phone", e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white" data-testid="booking-phone" />
              </div>
              <Input placeholder="Lakcím" value={form.address} onChange={e => set("address", e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white" data-testid="booking-address" />
              
              <button onClick={() => setShowInvoice(!showInvoice)} className="text-sm text-green-400 hover:text-green-300 flex items-center gap-2">
                <FileText className="w-4 h-4" /> {showInvoice ? "Számla adatok elrejtése" : "Számlát kérek (ÁFÁ-s)"}
              </button>
              {showInvoice && (
                <div className="space-y-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700">
                  <Input placeholder="Számlázási név" value={form.invoice_name} onChange={e => set("invoice_name", e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-white" />
                  <Input placeholder="Adószám" value={form.invoice_tax_number} onChange={e => set("invoice_tax_number", e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-white" />
                  <Input placeholder="Számlázási cím" value={form.invoice_address} onChange={e => set("invoice_address", e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-white" />
                </div>
              )}
              <textarea placeholder="Megjegyzés (opcionális)" value={form.notes} onChange={e => set("notes", e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl p-4 text-sm resize-none h-20" data-testid="booking-notes" />
              
              {/* Second Car Option */}
              <div className="border-t border-slate-700 pt-4 mt-4">
                <button 
                  onClick={() => setAddSecondCar(!addSecondCar)} 
                  className={`w-full p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    addSecondCar 
                      ? "bg-green-500/20 border-green-500/50 text-green-400" 
                      : "bg-slate-800/30 border-slate-700 text-slate-400 hover:border-green-500/30 hover:text-green-400"
                  }`}
                  data-testid="add-second-car-btn"
                >
                  {addSecondCar ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {addSecondCar ? "Második autó eltávolítása" : "Második autó hozzáadása"}
                </button>
                
                {addSecondCar && (
                  <div className="mt-4 p-4 bg-green-500/5 border border-green-500/20 rounded-xl space-y-3">
                    <h4 className="text-green-400 font-medium flex items-center gap-2">
                      <Car className="w-4 h-4" /> Második autó adatai
                    </h4>
                    <p className="text-slate-500 text-sm">Az első autó mosását követő időpontra foglaljuk.</p>
                    <Input 
                      placeholder="Rendszám *" 
                      value={secondCar.plate_number} 
                      onChange={e => setSecondCar({...secondCar, plate_number: e.target.value.toUpperCase()})}
                      className="bg-slate-800/50 border-slate-700 text-white uppercase font-mono" 
                      data-testid="second-car-plate"
                    />
                    <Input 
                      placeholder="Autó típusa" 
                      value={secondCar.car_type} 
                      onChange={e => setSecondCar({...secondCar, car_type: e.target.value})}
                      className="bg-slate-800/50 border-slate-700 text-white" 
                      data-testid="second-car-type"
                    />
                    <Select value={secondCar.service_id} onValueChange={v => setSecondCar({...secondCar, service_id: v})}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white" data-testid="second-car-service">
                        <SelectValue placeholder="Szolgáltatás kiválasztása *" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                        {services.map(s => (
                          <SelectItem key={s.service_id} value={s.service_id} className="text-white hover:bg-white/5">
                            {s.name} - {s.price?.toLocaleString()} Ft
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <Card className="bg-slate-900/90 border-slate-800 backdrop-blur-xl overflow-hidden" data-testid="booking-step-4">
            <div className="h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                Foglalás összegzése
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customerFound?.is_vip && (
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <span className="text-yellow-400 font-medium">VIP ügyfél</span>
                    <p className="text-slate-400 text-sm">{customerFound.completed_bookings}. foglalás | Összesen: {customerFound.total_spent?.toLocaleString()} Ft</p>
                  </div>
                </div>
              )}
              
              <div className="bg-slate-800/50 rounded-xl p-5 space-y-3 border border-slate-700">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
                  <Car className="w-6 h-6 text-green-400" />
                  <span className="text-white font-semibold text-lg">{selectedService?.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="text-slate-400 flex items-center gap-2"><MapPin className="w-4 h-4" /> Telephely</div>
                  <div className="text-white text-right">{form.location}</div>
                  <div className="text-slate-400 flex items-center gap-2"><Calendar className="w-4 h-4" /> Időpont</div>
                  <div className="text-white text-right">{form.date} <span className="text-green-400 font-bold">{form.time_slot}</span></div>
                  <div className="text-slate-400 flex items-center gap-2"><User className="w-4 h-4" /> Név</div>
                  <div className="text-white text-right">{form.customer_name}</div>
                  <div className="text-slate-400 flex items-center gap-2"><Car className="w-4 h-4" /> Rendszám</div>
                  <div className="text-white text-right font-mono">{form.plate_number}</div>
                  <div className="text-slate-400 flex items-center gap-2"><Phone className="w-4 h-4" /> Telefon</div>
                  <div className="text-white text-right">{form.phone}</div>
                  <div className="text-slate-400 flex items-center gap-2"><Mail className="w-4 h-4" /> Email</div>
                  <div className="text-white text-right truncate">{form.email}</div>
                </div>
                <div className="pt-4 mt-3 border-t border-slate-700 flex justify-between items-center">
                  <span className="text-slate-300 font-medium">Fizetendő összeg</span>
                  <span className="text-green-400 text-2xl font-bold">{selectedService?.price?.toLocaleString()} Ft</span>
                </div>
              </div>
              
              {/* Second Car Summary */}
              {addSecondCar && secondCar.plate_number && secondCar.service_id && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-3 pb-3 border-b border-green-500/20">
                    <Car className="w-6 h-6 text-green-400" />
                    <span className="text-white font-semibold text-lg">Második autó</span>
                    <Badge className="bg-green-500/20 text-green-400 ml-auto">Egymás után</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <div className="text-slate-400 flex items-center gap-2"><Car className="w-4 h-4" /> Rendszám</div>
                    <div className="text-white text-right font-mono">{secondCar.plate_number}</div>
                    <div className="text-slate-400 flex items-center gap-2"><Car className="w-4 h-4" /> Típus</div>
                    <div className="text-white text-right">{secondCar.car_type || "-"}</div>
                    <div className="text-slate-400 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Szolgáltatás</div>
                    <div className="text-white text-right">{services.find(s => s.service_id === secondCar.service_id)?.name}</div>
                  </div>
                  <div className="pt-4 mt-3 border-t border-green-500/20 flex justify-between items-center">
                    <span className="text-slate-300 font-medium">2. autó</span>
                    <span className="text-green-400 text-xl font-bold">
                      {services.find(s => s.service_id === secondCar.service_id)?.price?.toLocaleString()} Ft
                    </span>
                  </div>
                </div>
              )}
              
              {/* Total if second car */}
              {addSecondCar && secondCar.plate_number && secondCar.service_id && (
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-4 flex justify-between items-center border border-green-500/30">
                  <span className="text-white font-bold text-lg">Összesen fizetendő</span>
                  <span className="text-green-400 text-3xl font-bold">
                    {((selectedService?.price || 0) + (services.find(s => s.service_id === secondCar.service_id)?.price || 0)).toLocaleString()} Ft
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-4 sm:mt-6 gap-2">
          <Button 
            variant="outline" 
            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-sm sm:text-base" 
            onClick={() => setStep(s => s - 1)} 
            disabled={step === 1}
            data-testid="booking-prev-btn"
          >
            <ChevronLeft className="w-4 h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Vissza</span>
          </Button>
          {step < 4 ? (
            <Button 
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 sm:px-8 text-sm sm:text-base" 
              onClick={() => setStep(s => s + 1)} 
              disabled={!canGoNext()}
              data-testid="booking-next-btn"
            >
              Tovább <ChevronRight className="w-4 h-4 ml-1 sm:ml-2" />
            </Button>
          ) : (
            <Button 
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 sm:px-8 text-sm sm:text-base" 
              onClick={handleSubmit} 
              disabled={submitting}
              data-testid="booking-submit-btn"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" /> <span className="hidden sm:inline">Foglalás...</span><span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Foglalás véglegesítése</span><span className="sm:hidden">Foglalás</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* AI Chatbot */}
      <AIChatbot />
    </div>
  );
};

export default BookingPage;
