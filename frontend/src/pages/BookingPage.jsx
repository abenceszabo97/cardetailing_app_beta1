import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import { 
  Car, MapPin, Clock, User, Phone, Mail, FileText, CheckCircle2, 
  ChevronRight, ChevronLeft, Search, Star, Loader2, Sparkles,
  Calendar, Users, Timer, AlertTriangle, Plus, X, Check
} from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, isToday, isBefore } from "date-fns";
import { hu } from "date-fns/locale";
import { AIChatbot } from "../components/AIComponents";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Car size icons as SVG components - green outline line-art style
const CarIcons = {
  S: () => (
    <svg viewBox="0 0 120 50" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Small hatchback */}
      <path d="M20 35 L20 28 Q20 22 26 20 L42 16 Q50 14 58 14 L72 16 Q80 17 84 20 L94 24 Q100 26 100 30 L100 35" />
      {/* Roof line */}
      <path d="M42 16 L42 22 Q42 24 44 24 L72 24 Q74 24 74 22 L74 16" />
      {/* Windows */}
      <line x1="58" y1="16" x2="58" y2="24" />
      {/* Wheels */}
      <circle cx="34" cy="37" r="7" strokeWidth="2.5" />
      <circle cx="34" cy="37" r="3" strokeWidth="1.5" />
      <circle cx="86" cy="37" r="7" strokeWidth="2.5" />
      <circle cx="86" cy="37" r="3" strokeWidth="1.5" />
      {/* Underline */}
      <line x1="41" y1="37" x2="79" y2="37" strokeWidth="1.5" />
      <line x1="12" y1="37" x2="27" y2="37" strokeWidth="1.5" />
      <line x1="93" y1="37" x2="108" y2="37" strokeWidth="1.5" />
    </svg>
  ),
  M: () => (
    <svg viewBox="0 0 130 50" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Sedan */}
      <path d="M16 35 L16 28 Q16 24 22 22 L38 18 Q46 15 56 13 L74 13 Q82 13 88 16 L100 20 Q106 22 108 26 L110 30 Q112 33 112 35" />
      {/* Roof / Windows */}
      <path d="M38 18 L40 22 Q40 24 42 24 L68 24 Q70 24 72 24 L88 16" />
      <line x1="56" y1="14" x2="55" y2="24" />
      {/* Trunk */}
      <path d="M88 16 L94 20" />
      {/* Wheels */}
      <circle cx="32" cy="37" r="7" strokeWidth="2.5" />
      <circle cx="32" cy="37" r="3" strokeWidth="1.5" />
      <circle cx="94" cy="37" r="7" strokeWidth="2.5" />
      <circle cx="94" cy="37" r="3" strokeWidth="1.5" />
      {/* Underline */}
      <line x1="39" y1="37" x2="87" y2="37" strokeWidth="1.5" />
      <line x1="8" y1="37" x2="25" y2="37" strokeWidth="1.5" />
      <line x1="101" y1="37" x2="118" y2="37" strokeWidth="1.5" />
    </svg>
  ),
  L: () => (
    <svg viewBox="0 0 140 50" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Large sedan / kombi */}
      <path d="M14 35 L14 28 Q14 24 20 22 L36 17 Q44 14 54 12 L80 12 Q90 12 96 14 L108 18 Q114 20 116 24 L118 30 Q120 33 120 35" />
      {/* Roof / Windows */}
      <path d="M36 17 L38 22 Q38 24 40 24 L76 24 Q78 24 78 22 L96 14" />
      <line x1="58" y1="13" x2="57" y2="24" />
      <line x1="78" y1="22" x2="88 " y2="16" />
      {/* Wheels */}
      <circle cx="30" cy="37" r="7" strokeWidth="2.5" />
      <circle cx="30" cy="37" r="3" strokeWidth="1.5" />
      <circle cx="104" cy="37" r="7" strokeWidth="2.5" />
      <circle cx="104" cy="37" r="3" strokeWidth="1.5" />
      {/* Underline */}
      <line x1="37" y1="37" x2="97" y2="37" strokeWidth="1.5" />
      <line x1="6" y1="37" x2="23" y2="37" strokeWidth="1.5" />
      <line x1="111" y1="37" x2="128" y2="37" strokeWidth="1.5" />
    </svg>
  ),
  XL: () => (
    <svg viewBox="0 0 140 55" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* SUV - taller, boxier */}
      <path d="M14 38 L14 26 Q14 22 18 20 L34 16 Q40 13 50 10 L80 10 Q92 10 98 12 L112 17 Q118 19 118 24 L120 30 Q122 36 122 38" />
      {/* Roof / Windows */}
      <path d="M34 16 L36 20 Q36 22 38 22 L68 22 Q70 22 70 20 L72 18" />
      <path d="M72 18 L80 14 Q84 12 88 14 L98 12" />
      <rect x="74" y="14" width="18" height="8" rx="1" strokeWidth="1.5" />
      <line x1="55" y1="11" x2="54" y2="22" />
      {/* Wheels - larger */}
      <circle cx="30" cy="40" r="8" strokeWidth="2.5" />
      <circle cx="30" cy="40" r="3.5" strokeWidth="1.5" />
      <circle cx="106" cy="40" r="8" strokeWidth="2.5" />
      <circle cx="106" cy="40" r="3.5" strokeWidth="1.5" />
      {/* Underline */}
      <line x1="38" y1="40" x2="98" y2="40" strokeWidth="1.5" />
      <line x1="6" y1="40" x2="22" y2="40" strokeWidth="1.5" />
      <line x1="114" y1="40" x2="130" y2="40" strokeWidth="1.5" />
    </svg>
  ),
  XXL: () => (
    <svg viewBox="0 0 150 55" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Van / Minibus - tallest, longest, boxiest */}
      <path d="M14 38 L14 14 Q14 10 18 10 L100 10 Q108 10 112 12 L122 16 Q128 18 128 24 L130 32 Q132 36 132 38" />
      {/* Windows */}
      <rect x="18" y="14" width="16" height="10" rx="1.5" strokeWidth="1.5" />
      <rect x="38" y="14" width="16" height="10" rx="1.5" strokeWidth="1.5" />
      <rect x="58" y="14" width="16" height="10" rx="1.5" strokeWidth="1.5" />
      <rect x="78" y="14" width="16" height="10" rx="1.5" strokeWidth="1.5" />
      {/* Front windshield */}
      <path d="M100 10 L108 12 L118 16 Q120 18 120 20 L120 24 L100 24 L100 10" strokeWidth="1.5" />
      {/* Wheels - larger */}
      <circle cx="32" cy="40" r="8" strokeWidth="2.5" />
      <circle cx="32" cy="40" r="3.5" strokeWidth="1.5" />
      <circle cx="114" cy="40" r="8" strokeWidth="2.5" />
      <circle cx="114" cy="40" r="3.5" strokeWidth="1.5" />
      {/* Underline */}
      <line x1="40" y1="40" x2="106" y2="40" strokeWidth="1.5" />
      <line x1="6" y1="40" x2="24" y2="40" strokeWidth="1.5" />
      <line x1="122" y1="40" x2="140" y2="40" strokeWidth="1.5" />
    </svg>
  )
};

const CAR_SIZE_INFO = {
  S: { name: "S - Kis autó", description: "Ferdehátú, kisautó", examples: "Suzuki Swift, VW Polo, Opel Corsa" },
  M: { name: "M - Közepes", description: "Sedan, kompakt", examples: "VW Golf, Toyota Corolla, Audi A3" },
  L: { name: "L - Nagy", description: "Kombi, nagy sedan", examples: "VW Passat, Skoda Octavia Kombi" },
  XL: { name: "XL - SUV", description: "SUV, crossover", examples: "VW Tiguan, Toyota RAV4, BMW X3" },
  XXL: { name: "XXL - Nagy SUV", description: "Terepjáró, kisbusz", examples: "Range Rover, Ford Transit" }
};

const BookingPage = () => {
  const [step, setStep] = useState(1);
  const [pricingData, setPricingData] = useState(null);
  const [extras, setExtras] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Selection state
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  
  // Form state
  const [form, setForm] = useState({
    customer_name: "", car_type: "", plate_number: "", email: "", phone: "",
    address: "", invoice_name: "", invoice_tax_number: "", invoice_address: "",
    worker_id: "", location: "Debrecen", date: "", time_slot: "", notes: ""
  });
  
  const [showInvoice, setShowInvoice] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [customerFound, setCustomerFound] = useState(null);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [selectedWeekStart, setSelectedWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Load pricing data and extras
  useEffect(() => {
    axios.get(`${API}/services/pricing-data`)
      .then(r => setPricingData(r.data))
      .catch(err => console.error("Pricing data error:", err));
    
    axios.get(`${API}/services/extras`)
      .then(r => setExtras(Array.isArray(r.data) ? r.data : []))
      .catch(err => console.error("Extras error:", err));
  }, []);

  // Load slots when date changes - include duration for time blocking
  useEffect(() => {
    if (form.location && form.date) {
      setLoadingSlots(true);
      const duration = getDuration();
      axios.get(`${API}/bookings/available-slots?location=${form.location}&date=${form.date}&duration=${duration || 60}`)
        .then(r => { setSlots(r.data); setLoadingSlots(false); })
        .catch(() => setLoadingSlots(false));
    }
  }, [form.location, form.date, selectedSize, selectedCategory, selectedPackage, selectedPromotion]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // Calculate price - supports promotions
  const getPrice = () => {
    if (selectedPromotion) return selectedPromotion.price;
    if (!selectedSize || !selectedCategory || !selectedPackage || !pricingData) return 0;
    return pricingData.price_matrix[selectedSize]?.[selectedCategory]?.[selectedPackage] || 0;
  };

  const getFeatures = () => {
    if (selectedPromotion) return selectedPromotion.features || [];
    if (!selectedCategory || !selectedPackage || !pricingData) return [];
    return pricingData.package_features[selectedCategory]?.[selectedPackage] || [];
  };

  const getDuration = () => {
    if (selectedPromotion) return selectedPromotion.duration || 70;
    if (!selectedSize || !selectedCategory || !pricingData) return 0;
    let base = pricingData.duration_matrix[selectedSize]?.[selectedCategory] || 60;
    if (selectedPackage === "VIP") base = Math.round(base * 1.5);
    else if (selectedPackage === "Pro") base = Math.round(base * 1.2);
    return base;
  };

  const getExtrasTotal = () => {
    return selectedExtras.reduce((sum, extraId) => {
      const extra = extras.find(e => e.service_id === extraId || e.name === extraId);
      return sum + (extra?.price || extra?.min_price || 0);
    }, 0);
  };

  const getTotalPrice = () => getPrice() + getExtrasTotal();

  // Select a promotion
  const selectPromotion = (promo) => {
    setSelectedPromotion(promo);
    // Auto-select size and category based on promotion
    if (promo.car_sizes?.length > 0) {
      setSelectedSize(promo.car_sizes[promo.car_sizes.length - 1]); // Largest allowed
    }
    setSelectedCategory(promo.category);
    setSelectedPackage(promo.package);
  };

  // Clear promotion and go back to normal selection
  const clearPromotion = () => {
    setSelectedPromotion(null);
    setSelectedSize(null);
    setSelectedCategory(null);
    setSelectedPackage(null);
  };

  // Plate lookup
  const lookupPlate = useCallback(async (plate) => {
    if (!plate || plate.length < 5) {
      setCustomerFound(null);
      setIsBlacklisted(false);
      return;
    }
    setLookingUp(true);
    try {
      const blacklistRes = await axios.get(`${API}/blacklist/check/${encodeURIComponent(plate)}`);
      if (blacklistRes.data.blacklisted) {
        setIsBlacklisted(true);
        setBlacklistReason(blacklistRes.data.reason || "");
        setCustomerFound(null);
        setLookingUp(false);
        return;
      }
      setIsBlacklisted(false);
      
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
        toast.success("Visszatérő ügyfél! Adatok betöltve.");
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

  const toggleExtra = (extraId) => {
    setSelectedExtras(prev => 
      prev.includes(extraId) 
        ? prev.filter(id => id !== extraId)
        : [...prev, extraId]
    );
  };

  const canGoNext = () => {
    if (step === 1) return (selectedPromotion || (selectedSize && selectedCategory && selectedPackage));
    if (step === 2) return form.date && form.time_slot;
    if (step === 3) return form.customer_name && form.plate_number && form.email && form.phone && !isBlacklisted;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Create service name from selection or promotion
      let serviceName;
      if (selectedPromotion) {
        serviceName = `${selectedPromotion.name} - ${selectedPromotion.description}`;
      } else {
        serviceName = `${selectedSize} - ${selectedCategory === 'kulso' ? 'Külső' : selectedCategory === 'belso' ? 'Belső' : 'Külső+Belső'} ${selectedPackage}`;
      }
      
      const bookingData = {
        ...form,
        car_type: form.car_type || CAR_SIZE_INFO[selectedSize]?.description || selectedSize,
        service_id: selectedPromotion ? `promo_${selectedPromotion.id}` : `dynamic_${selectedSize}_${selectedCategory}_${selectedPackage}`,
        service_name: serviceName,
        price: getTotalPrice(),
        duration: getDuration(),
        extras: selectedExtras,
        car_size: selectedSize,
        package_type: selectedPackage,
        category: selectedCategory,
        promotion_id: selectedPromotion?.id || null
      };
      
      await axios.post(`${API}/bookings`, bookingData);
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
    setSelectedSize(null);
    setSelectedCategory(null);
    setSelectedPackage(null);
    setSelectedExtras([]);
    setCustomerFound(null);
    setForm({
      customer_name: "", car_type: "", plate_number: "", email: "", phone: "",
      address: "", invoice_name: "", invoice_tax_number: "", invoice_address: "",
      worker_id: "", location: "Debrecen", date: "", time_slot: "", notes: ""
    });
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(selectedWeekStart, i));

  const getSlotStyle = (slot) => {
    if (!slot.is_available) return "bg-slate-800/50 text-slate-600 cursor-not-allowed border-slate-700/50";
    const percent = slot.availability_percent;
    if (percent === 100) return "bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30";
    if (percent >= 50) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/30";
    return "bg-orange-500/20 text-orange-400 border-orange-500/50 hover:bg-orange-500/30";
  };

  if (!pricingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900/90 border-slate-800 backdrop-blur-xl">
          <div className="h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Foglalás sikeres!</h2>
            <p className="text-slate-400 mb-4">
              Időpont: <strong className="text-white">{form.date}</strong> - <strong className="text-green-400">{form.time_slot}</strong>
            </p>
            <div className="bg-slate-950/50 rounded-xl p-4 mb-6 border border-slate-800">
              <div className="text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Csomag:</span>
                  <span className="text-white">{selectedSize} - {selectedCategory === 'kulso' ? 'Külső' : selectedCategory === 'belso' ? 'Belső' : 'Komplett'} {selectedPackage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rendszám:</span>
                  <span className="text-white font-mono">{form.plate_number}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Fizetendő:</span>
                <span className="text-green-400 text-2xl font-bold">{getTotalPrice().toLocaleString()} Ft</span>
              </div>
            </div>
            <p className="text-slate-500 text-sm mb-4">Visszaigazoló e-mailt küldtünk.</p>
            <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600" onClick={resetForm}>
              <Sparkles className="w-4 h-4 mr-2" /> Új foglalás
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 pb-20">
      <div className="w-full max-w-3xl relative">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-3 shadow-lg shadow-green-500/20 p-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_80351f3f-7954-46a7-9193-7dcbfbf56786/artifacts/lnbybw8y_59e55ae7-d1bd-2941-05b0-2eeff82c6764.png" 
              alt="X-CLEAN Logo" 
              className="w-full h-full object-contain mix-blend-multiply"
            />
          </div>
          <p className="text-slate-400">Online időpontfoglalás</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[
            { num: 1, label: "Szolgáltatás", icon: Sparkles },
            { num: 2, label: "Időpont", icon: Calendar },
            { num: 3, label: "Adatok", icon: User },
            { num: 4, label: "Összegzés", icon: CheckCircle2 }
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className={`flex flex-col items-center ${step >= s.num ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  step >= s.num ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg' : 'bg-slate-800'
                }`}>
                  <s.icon className={`w-5 h-5 ${step >= s.num ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <span className={`text-xs mt-1 ${step >= s.num ? 'text-green-400' : 'text-slate-600'}`}>{s.label}</span>
              </div>
              {i < 3 && <div className={`w-8 h-0.5 mx-1 ${step > s.num ? 'bg-green-500' : 'bg-slate-800'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Car Size, Category, Package Selection */}
        {step === 1 && (
          <Card className="bg-slate-900/90 border-slate-800 backdrop-blur-xl overflow-hidden" data-testid="booking-step-1">
            <div className="h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Car className="w-5 h-5 text-green-400" />
                </div>
                Válaszd ki a szolgáltatást
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Active Promotions Banner */}
              {pricingData?.promotions?.length > 0 && !selectedPromotion && (
                <div className="space-y-3">
                  <label className="text-sm text-pink-400 mb-2 block font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Aktuális akciók
                  </label>
                  {pricingData.promotions.map(promo => (
                    <button
                      key={promo.id}
                      onClick={() => selectPromotion(promo)}
                      className="w-full p-4 rounded-xl border-2 border-pink-500/50 bg-gradient-to-r from-pink-500/10 to-orange-500/10 hover:from-pink-500/20 hover:to-orange-500/20 transition-all text-left"
                      data-testid={`promo-${promo.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-pink-500/30 text-pink-300 border-pink-500/50">
                            {promo.badge || '🎉 AKCIÓ'}
                          </Badge>
                          <span className="text-white font-bold text-lg">{promo.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-pink-400 text-2xl font-bold">{promo.price.toLocaleString()} Ft</span>
                          {promo.original_price && (
                            <span className="text-slate-500 text-sm line-through ml-2">{promo.original_price.toLocaleString()} Ft</span>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-400 text-sm">{promo.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> ~{promo.duration} perc</span>
                        <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {promo.car_sizes?.join(', ')} méretig</span>
                        {promo.valid_until && <span>Érvényes: {promo.valid_until}-ig</span>}
                      </div>
                    </button>
                  ))}
                  <div className="text-center text-slate-500 text-sm pt-2">— vagy válassz egyedi szolgáltatást —</div>
                </div>
              )}

              {/* Selected Promotion Banner */}
              {selectedPromotion && (
                <div className="p-4 rounded-xl border-2 border-pink-500 bg-gradient-to-r from-pink-500/20 to-orange-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge className="bg-pink-500/30 text-pink-300 border-pink-500/50 mb-2">
                        {selectedPromotion.badge || '🎉 AKCIÓ KIVÁLASZTVA'}
                      </Badge>
                      <h3 className="text-white font-bold text-lg">{selectedPromotion.name}</h3>
                      <p className="text-slate-400 text-sm">{selectedPromotion.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-pink-400 text-3xl font-bold">{selectedPromotion.price.toLocaleString()} Ft</span>
                      <button 
                        onClick={clearPromotion}
                        className="block mt-2 text-xs text-slate-500 hover:text-white transition-colors"
                      >
                        <X className="w-3 h-3 inline mr-1" /> Másik szolgáltatás
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-pink-500/30">
                    <span className="text-slate-400 text-sm">Tartalmazza:</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedPromotion.features?.slice(0, 6).map((f, i) => (
                        <Badge key={i} variant="outline" className="text-xs border-slate-600 text-slate-400">
                          <Check className="w-3 h-3 mr-1 text-green-500" />{f}
                        </Badge>
                      ))}
                      {selectedPromotion.features?.length > 6 && (
                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-500">
                          +{selectedPromotion.features.length - 6} további
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Car Size Selection - only show if no promotion selected */}
              {!selectedPromotion && (
              <div>
                <label className="text-sm text-slate-400 mb-3 block font-medium">1. Autó mérete</label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(CAR_SIZE_INFO).map(([size, info]) => {
                    const IconComponent = CarIcons[size];
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${
                          selectedSize === size 
                            ? 'border-green-500 bg-green-500/10' 
                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                        }`}
                        data-testid={`size-${size}`}
                      >
                        <div className={`w-12 h-8 mb-2 ${selectedSize === size ? 'text-green-400' : 'text-slate-500'}`}>
                          <IconComponent />
                        </div>
                        <span className={`text-sm font-bold ${selectedSize === size ? 'text-white' : 'text-slate-300'}`}>{size}</span>
                        <span className="text-[10px] text-slate-500 text-center mt-1 leading-tight">{info.description}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedSize && (
                  <p className="text-xs text-slate-500 mt-2">
                    Példák: {CAR_SIZE_INFO[selectedSize].examples}
                  </p>
                )}
              </div>
              )}

              {/* Category Selection - only show if no promotion selected */}
              {!selectedPromotion && selectedSize && (
                <div>
                  <label className="text-sm text-slate-400 mb-3 block font-medium">2. Szolgáltatás típusa</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'kulso', name: 'Külső', desc: 'Külső tisztítás', icon: '🚿' },
                      { id: 'belso', name: 'Belső', desc: 'Belső takarítás', icon: '🧹' },
                      { id: 'komplett', name: 'Külső + Belső', desc: 'Teljes tisztítás', icon: '✨' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          selectedCategory === cat.id 
                            ? 'border-green-500 bg-green-500/10' 
                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                        }`}
                        data-testid={`category-${cat.id}`}
                      >
                        <div className="text-2xl mb-2">{cat.icon}</div>
                        <span className={`font-semibold block ${selectedCategory === cat.id ? 'text-white' : 'text-slate-300'}`}>
                          {cat.name}
                        </span>
                        <span className="text-xs text-slate-500">{cat.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Package Selection with Features - only show if no promotion selected */}
              {!selectedPromotion && selectedSize && selectedCategory && (
                <div>
                  <label className="text-sm text-slate-400 mb-3 block font-medium">3. Csomag választás</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Eco', 'Pro', 'VIP'].map(pkg => {
                      const price = pricingData.price_matrix[selectedSize]?.[selectedCategory]?.[pkg] || 0;
                      const features = pricingData.package_features[selectedCategory]?.[pkg] || [];
                      const isSelected = selectedPackage === pkg;
                      
                      return (
                        <button
                          key={pkg}
                          onClick={() => setSelectedPackage(pkg)}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            isSelected 
                              ? pkg === 'VIP' 
                                ? 'border-yellow-500 bg-yellow-500/10' 
                                : pkg === 'Pro'
                                  ? 'border-blue-500 bg-blue-500/10'
                                  : 'border-green-500 bg-green-500/10'
                              : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                          }`}
                          data-testid={`package-${pkg}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <Badge className={
                              pkg === 'VIP' ? 'bg-yellow-500/20 text-yellow-400' :
                              pkg === 'Pro' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-slate-500/20 text-slate-400'
                            }>
                              {pkg}
                            </Badge>
                            {isSelected && <Check className="w-5 h-5 text-green-400" />}
                          </div>
                          <div className={`text-2xl font-bold mb-3 ${
                            pkg === 'VIP' ? 'text-yellow-400' :
                            pkg === 'Pro' ? 'text-blue-400' :
                            'text-green-400'
                          }`}>
                            {price.toLocaleString()} Ft
                          </div>
                          <div className="space-y-1">
                            {features.slice(0, 4).map((feature, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                                <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                                <span className="truncate">{feature}</span>
                              </div>
                            ))}
                            {features.length > 4 && (
                              <div className="text-xs text-slate-500">+{features.length - 4} további...</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Package Features Detail - only show if no promotion selected */}
              {!selectedPromotion && selectedPackage && (
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-green-400" />
                    {selectedPackage} csomag tartalma
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {getFeatures().map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra Services - show for both promotion and manual selection */}
              {(selectedPromotion || selectedPackage) && extras.length > 0 && (
                <div>
                  <label className="text-sm text-slate-400 mb-3 block font-medium">
                    {selectedPromotion ? 'Extra szolgáltatások (opcionális)' : '4. Extra szolgáltatások (opcionális)'}
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {extras.map(extra => (
                      <div
                        key={extra.service_id || extra.name}
                        onClick={() => toggleExtra(extra.service_id || extra.name)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedExtras.includes(extra.service_id || extra.name)
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={selectedExtras.includes(extra.service_id || extra.name)}
                              className="border-slate-600"
                            />
                            <div>
                              <span className="text-white text-sm">{extra.name}</span>
                              {extra.description && (
                                <p className="text-xs text-slate-500">{extra.description}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-green-400 font-medium">
                            {extra.min_price ? `${extra.min_price.toLocaleString()} Ft-tól` : `${(extra.price || 0).toLocaleString()} Ft`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Summary - show for both promotion and manual selection */}
              {(selectedPromotion || selectedPackage) && (
                <div className={`rounded-xl p-4 border ${
                  selectedPromotion 
                    ? 'bg-gradient-to-r from-pink-500/10 to-orange-500/10 border-pink-500/30'
                    : 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-slate-400 text-sm">Összesen fizetendő</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Timer className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-500 text-sm">~{getDuration()} perc</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-3xl font-bold ${selectedPromotion ? 'text-pink-400' : 'text-green-400'}`}>
                        {getTotalPrice().toLocaleString()} Ft
                      </span>
                      {selectedPromotion && selectedPromotion.original_price && (
                        <div className="text-xs text-slate-500">
                          <span className="line-through">{selectedPromotion.original_price.toLocaleString()} Ft</span>
                          <span className="text-pink-400 ml-2">Megtakarítás: {(selectedPromotion.original_price - selectedPromotion.price).toLocaleString()} Ft</span>
                        </div>
                      )}
                      {!selectedPromotion && getExtrasTotal() > 0 && (
                        <div className="text-xs text-slate-500">
                          (alap: {getPrice().toLocaleString()} + extrák: {getExtrasTotal().toLocaleString()})
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Date & Time Selection */}
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
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map(day => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const isPast = isBefore(day, new Date()) && !isToday(day);
                  const isSelected = form.date === dateStr;
                  
                  return (
                    <button
                      key={dateStr}
                      onClick={() => !isPast && set("date", dateStr)}
                      disabled={isPast}
                      className={`p-3 rounded-xl text-center transition-all ${
                        isPast 
                          ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed' 
                          : isSelected 
                            ? 'bg-green-500 text-white shadow-lg' 
                            : isToday(day)
                              ? 'bg-slate-800 text-green-400 border-2 border-green-500/50'
                              : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700'
                      }`}
                    >
                      <div className="text-xs opacity-70">{format(day, "EEE", { locale: hu })}</div>
                      <div className="text-lg font-bold">{format(day, "d")}</div>
                    </button>
                  );
                })}
              </div>

              {/* Time Slots */}
              {form.date && (
                <div className="mt-4">
                  <label className="text-sm text-slate-400 mb-3 block">
                    Időpontok - {format(new Date(form.date), "MMMM d.", { locale: hu })}
                  </label>
                  
                  {loadingSlots ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 mx-auto text-green-400 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
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
                          className={`p-3 rounded-xl border-2 transition-all ${
                            form.time_slot === slot.time_slot && slot.is_available
                              ? 'border-green-400 bg-green-500 text-white shadow-lg'
                              : getSlotStyle(slot)
                          }`}
                        >
                          <div className="font-bold">{slot.time_slot}</div>
                          {slot.is_available ? (
                            <div className="text-xs opacity-70 flex items-center justify-center gap-1 mt-1">
                              <Users className="w-3 h-3" /> {slot.available_workers.length}
                            </div>
                          ) : (
                            <div className="text-xs opacity-50 mt-1">Foglalt</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
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
              {/* Plate Lookup */}
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
                      <Badge className="bg-yellow-500/20 text-yellow-400">
                        <Star className="w-3 h-3 mr-1" /> VIP
                      </Badge>
                    )}
                  </div>
                )}
                {isBlacklisted && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">Ez a rendszám tiltólistán van</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Név *" value={form.customer_name} onChange={e => set("customer_name", e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white" />
                <Input placeholder="Autó típusa" value={form.car_type} onChange={e => set("car_type", e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="E-mail *" type="email" value={form.email} onChange={e => set("email", e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white" />
                <Input placeholder="Telefonszám *" value={form.phone} onChange={e => set("phone", e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white" />
              </div>
              <Input placeholder="Lakcím" value={form.address} onChange={e => set("address", e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white" />
              
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
                className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl p-4 text-sm resize-none h-20" />
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
                  <Star className="w-6 h-6 text-yellow-400" />
                  <div>
                    <span className="text-yellow-400 font-medium">VIP ügyfél</span>
                    <p className="text-slate-400 text-sm">{customerFound.completed_bookings} korábbi mosás</p>
                  </div>
                </div>
              )}
              
              <div className="bg-slate-800/50 rounded-xl p-5 space-y-3 border border-slate-700">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
                  <Car className="w-6 h-6 text-green-400" />
                  <span className="text-white font-semibold text-lg">
                    {selectedSize} - {selectedCategory === 'kulso' ? 'Külső' : selectedCategory === 'belso' ? 'Belső' : 'Komplett'} {selectedPackage}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
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
                  <div className="text-slate-400 flex items-center gap-2"><Timer className="w-4 h-4" /> Időtartam</div>
                  <div className="text-white text-right">~{getDuration()} perc</div>
                </div>
                
                {/* Selected Features */}
                <div className="pt-3 border-t border-slate-700">
                  <span className="text-slate-400 text-sm">A csomag tartalma:</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {getFeatures().map((f, i) => (
                      <Badge key={i} variant="outline" className="text-xs border-slate-600 text-slate-400">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Selected Extras */}
                {selectedExtras.length > 0 && (
                  <div className="pt-3 border-t border-slate-700">
                    <span className="text-slate-400 text-sm">Extra szolgáltatások:</span>
                    <div className="mt-2 space-y-1">
                      {selectedExtras.map(extraId => {
                        const extra = extras.find(e => e.service_id === extraId || e.name === extraId);
                        return extra ? (
                          <div key={extraId} className="flex justify-between text-sm">
                            <span className="text-slate-300">+ {extra.name}</span>
                            <span className="text-green-400">{(extra.price || extra.min_price || 0).toLocaleString()} Ft</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                
                <div className="pt-4 mt-3 border-t border-slate-700 flex justify-between items-center">
                  <span className="text-slate-300 font-medium">Fizetendő összeg</span>
                  <span className="text-green-400 text-2xl font-bold">{getTotalPrice().toLocaleString()} Ft</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 gap-2">
          <Button 
            variant="outline" 
            className="border-slate-700 text-slate-300 hover:bg-slate-800" 
            onClick={() => setStep(s => s - 1)} 
            disabled={step === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Vissza
          </Button>
          {step < 4 ? (
            <Button 
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8" 
              onClick={() => setStep(s => s + 1)} 
              disabled={!canGoNext()}
            >
              Tovább <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8" 
              onClick={handleSubmit} 
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Foglalás...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Foglalás véglegesítése</>
              )}
            </Button>
          )}
        </div>
      </div>
      
      <AIChatbot />
    </div>
  );
};

export default BookingPage;
