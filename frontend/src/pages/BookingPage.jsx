import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { Car, MapPin, Clock, User, Phone, Mail, FileText, CheckCircle2, ChevronRight, ChevronLeft, Search, Star, Loader2 } from "lucide-react";

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

  useEffect(() => {
    axios.get(`${API}/bookings/public-locations`).then(r => setLocations(r.data));
    axios.get(`${API}/bookings/public-services`).then(r => setServices(r.data));
  }, []);

  useEffect(() => {
    if (form.location && form.date) {
      setLoadingSlots(true);
      axios.get(`${API}/bookings/available-slots?location=${form.location}&date=${form.date}&service_id=${form.service_id || ""}`)
        .then(r => { setSlots(r.data); setLoadingSlots(false); })
        .catch(() => setLoadingSlots(false));
    }
  }, [form.location, form.date, form.service_id]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const selectedService = services.find(s => s.service_id === form.service_id);

  // Plate number lookup with debounce
  const lookupPlate = useCallback(async (plate) => {
    if (!plate || plate.length < 5) {
      setCustomerFound(null);
      return;
    }
    
    setLookingUp(true);
    try {
      const response = await axios.get(`${API}/bookings/lookup-plate/${encodeURIComponent(plate)}`);
      if (response.data.found) {
        setCustomerFound(response.data);
        // Auto-fill form with customer data
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
    } catch (error) {
      setCustomerFound(null);
    }
    setLookingUp(false);
  }, []);

  // Handle plate number change with lookup
  const handlePlateChange = (value) => {
    const plate = value.toUpperCase();
    set("plate_number", plate);
    
    // Lookup after user stops typing (debounce effect)
    if (plate.length >= 5) {
      const timeoutId = setTimeout(() => lookupPlate(plate), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const canGoNext = () => {
    if (step === 1) return form.location && form.service_id;
    if (step === 2) return form.date && form.time_slot;
    if (step === 3) return form.customer_name && form.plate_number && form.email && form.phone && form.car_type;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/bookings`, form);
      setSuccess(true);
      toast.success("Foglalás sikeresen rögzítve!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a foglalás során");
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setSuccess(false);
    setStep(1);
    setCustomerFound(null);
    setForm({
      customer_name: "", car_type: "", plate_number: "", email: "", phone: "",
      address: "", invoice_name: "", invoice_tax_number: "", invoice_address: "",
      service_id: "", worker_id: "", location: "", date: "", time_slot: "", notes: ""
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Foglalás sikeres!</h2>
            <p className="text-slate-400 mb-2">Kedves {form.customer_name},</p>
            <p className="text-slate-400 mb-4">Foglalását rögzítettük: <strong className="text-white">{form.date}</strong> - <strong className="text-white">{form.time_slot}</strong></p>
            <div className="bg-slate-950/50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-slate-400"><strong className="text-white">{selectedService?.name}</strong></p>
              <p className="text-sm text-slate-400">Telephely: <strong className="text-white">{form.location}</strong></p>
              <p className="text-sm text-slate-400">Rendszám: <strong className="text-white">{form.plate_number}</strong></p>
              <p className="text-lg text-green-400 font-bold mt-2">{selectedService?.price?.toLocaleString()} Ft</p>
            </div>
            <p className="text-slate-500 text-sm">Visszaigazoló e-mailt küldtünk.</p>
            <Button className="mt-4 bg-green-600 hover:bg-green-700" onClick={resetForm} data-testid="new-booking-btn">
              Új foglalás
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">X-CLEAN</h1>
          <p className="text-slate-400">Online időpontfoglalás</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-500'}`} data-testid={`step-${s}`}>
                {s}
              </div>
              {s < 4 && <div className={`w-8 h-0.5 ${step > s ? 'bg-green-500' : 'bg-slate-800'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Location & Service */}
        {step === 1 && (
          <Card className="bg-slate-900 border-slate-800" data-testid="booking-step-1">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-400" /> Telephely és szolgáltatás
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Telephely *</label>
                <Select value={form.location} onValueChange={v => set("location", v)}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-white" data-testid="booking-location">
                    <SelectValue placeholder="Válassz telephelyet" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {locations.map(loc => (
                      <SelectItem key={loc} value={loc} className="text-white">{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Szolgáltatás *</label>
                <div className="space-y-2 max-h-60 overflow-y-auto" data-testid="booking-services">
                  {services.map(svc => (
                    <div
                      key={svc.service_id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${form.service_id === svc.service_id ? 'border-green-500 bg-green-500/10' : 'border-slate-700 hover:border-slate-600'}`}
                      onClick={() => set("service_id", svc.service_id)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium text-sm">{svc.name}</span>
                        <span className="text-green-400 font-bold">{svc.price?.toLocaleString()} Ft</span>
                      </div>
                      {svc.duration && <span className="text-slate-500 text-xs">{svc.duration} perc</span>}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <Card className="bg-slate-900 border-slate-800" data-testid="booking-step-2">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-400" /> Dátum és időpont
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Dátum *</label>
                <Input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white" data-testid="booking-date"
                  min={new Date().toISOString().split("T")[0]} />
              </div>
              {form.date && (
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Időpont *</label>
                  {loadingSlots ? (
                    <p className="text-slate-500 text-sm py-4 text-center">Betöltés...</p>
                  ) : slots.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4 text-center">Nincs szabad időpont ezen a napon</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto" data-testid="booking-slots">
                      {slots.map(slot => (
                        <button
                          key={slot.time_slot}
                          className={`p-2 rounded-lg text-sm font-medium transition-colors ${form.time_slot === slot.time_slot ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                          onClick={() => {
                            set("time_slot", slot.time_slot);
                            if (slot.available_workers.length > 0 && !form.worker_id) {
                              set("worker_id", slot.available_workers[0].worker_id);
                            }
                          }}
                        >
                          {slot.time_slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {form.time_slot && slots.length > 0 && (
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Dolgozó (opcionális)</label>
                  <Select value={form.worker_id} onValueChange={v => set("worker_id", v)}>
                    <SelectTrigger className="bg-slate-950 border-slate-700 text-white" data-testid="booking-worker">
                      <SelectValue placeholder="Automatikus" />
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

        {/* Step 3: Personal Data with Quick Plate Lookup */}
        {step === 3 && (
          <Card className="bg-slate-900 border-slate-800" data-testid="booking-step-3">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-green-400" /> Személyes adatok
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Quick Plate Lookup - First field for returning customers */}
              <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
                <label className="text-sm text-green-400 mb-2 block flex items-center gap-2">
                  <Search className="w-4 h-4" /> Gyors foglalás rendszámmal
                </label>
                <div className="relative">
                  <Input 
                    placeholder="ABC-123" 
                    value={form.plate_number} 
                    onChange={e => handlePlateChange(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white uppercase font-mono pr-10" 
                    data-testid="booking-plate"
                  />
                  {lookingUp && (
                    <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-green-400 animate-spin" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">Visszatérő ügyfél? Írd be a rendszámot és automatikusan betöltjük az adatokat!</p>
                
                {/* Customer found indicator */}
                {customerFound && (
                  <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm font-medium">Visszatérő ügyfél!</span>
                    {customerFound.is_vip && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 ml-auto">
                        <Star className="w-3 h-3 mr-1" /> VIP
                      </Badge>
                    )}
                  </div>
                )}
                {customerFound && (
                  <div className="mt-2 text-xs text-slate-400">
                    {customerFound.completed_bookings} sikeres mosás | Összesen: {customerFound.total_spent?.toLocaleString()} Ft
                  </div>
                )}
              </div>

              <Input placeholder="Név *" value={form.customer_name} onChange={e => set("customer_name", e.target.value)}
                className="bg-slate-950 border-slate-700 text-white" data-testid="booking-name" />
              <Input placeholder="Autó típusa *" value={form.car_type} onChange={e => set("car_type", e.target.value)}
                className="bg-slate-950 border-slate-700 text-white" data-testid="booking-car-type" />
              <Input placeholder="E-mail *" type="email" value={form.email} onChange={e => set("email", e.target.value)}
                className="bg-slate-950 border-slate-700 text-white" data-testid="booking-email" />
              <Input placeholder="Telefonszám *" value={form.phone} onChange={e => set("phone", e.target.value)}
                className="bg-slate-950 border-slate-700 text-white" data-testid="booking-phone" />
              <Input placeholder="Lakcím" value={form.address} onChange={e => set("address", e.target.value)}
                className="bg-slate-950 border-slate-700 text-white" data-testid="booking-address" />
              
              <button onClick={() => setShowInvoice(!showInvoice)} className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1">
                <FileText className="w-4 h-4" /> {showInvoice ? "Számla adatok elrejtése" : "Számlát kérek (ÁFÁ-s)"}
              </button>
              {showInvoice && (
                <div className="space-y-3 p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                  <Input placeholder="Számlázási név" value={form.invoice_name} onChange={e => set("invoice_name", e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white" />
                  <Input placeholder="Adószám" value={form.invoice_tax_number} onChange={e => set("invoice_tax_number", e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white" />
                  <Input placeholder="Számlázási cím" value={form.invoice_address} onChange={e => set("invoice_address", e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white" />
                </div>
              )}
              <textarea placeholder="Megjegyzés (opcionális)" value={form.notes} onChange={e => set("notes", e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-3 text-sm resize-none h-20" data-testid="booking-notes" />
            </CardContent>
          </Card>
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <Card className="bg-slate-900 border-slate-800" data-testid="booking-step-4">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" /> Összegzés
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customerFound?.is_vip && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-400 font-medium">VIP ügyfél</span>
                  <span className="text-slate-400 text-sm ml-auto">{customerFound.completed_bookings}. foglalás</span>
                </div>
              )}
              <div className="bg-slate-950/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between"><span className="text-slate-400">Szolgáltatás</span><span className="text-white font-medium">{selectedService?.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Telephely</span><span className="text-white">{form.location}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Dátum</span><span className="text-white">{form.date} {form.time_slot}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Név</span><span className="text-white">{form.customer_name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Rendszám</span><span className="text-white font-mono">{form.plate_number}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Telefon</span><span className="text-white">{form.phone}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Email</span><span className="text-white">{form.email}</span></div>
                {form.notes && <div className="flex justify-between"><span className="text-slate-400">Megjegyzés</span><span className="text-white text-sm">{form.notes}</span></div>}
                <hr className="border-slate-700 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Fizetendő</span>
                  <span className="text-green-400 text-xl font-bold">{selectedService?.price?.toLocaleString()} Ft</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-4">
          <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => setStep(s => s - 1)} disabled={step === 1} data-testid="booking-prev-btn">
            <ChevronLeft className="w-4 h-4 mr-1" /> Vissza
          </Button>
          {step < 4 ? (
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => setStep(s => s + 1)} disabled={!canGoNext()} data-testid="booking-next-btn">
              Tovább <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={submitting} data-testid="booking-submit-btn">
              {submitting ? "Foglalás..." : "Foglalás véglegesítése"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
