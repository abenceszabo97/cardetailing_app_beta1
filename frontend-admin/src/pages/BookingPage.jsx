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
import { AIChatbot, AIUpsellSuggestions } from "../components/AIComponents";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Car size icons - inline SVG components matching reference image style
const CarIcons = {
  S: () => (
    <svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 36 L15 30 C15 28 16 26 18 25 L30 21 C34 19 38 18 44 17 L56 17 C62 17 66 18 70 20 L80 24 C83 25 85 27 85 30 L85 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M32 21 L34 26 L56 26 L58 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="46" y1="18" x2="46" y2="26" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="28" cy="38" r="6" stroke="currentColor" strokeWidth="2"/>
      <circle cx="28" cy="38" r="2.5" stroke="currentColor" strokeWidth="1"/>
      <circle cx="74" cy="38" r="6" stroke="currentColor" strokeWidth="2"/>
      <circle cx="74" cy="38" r="2.5" stroke="currentColor" strokeWidth="1"/>
      <line x1="34" y1="38" x2="68" y2="38" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="8" y1="38" x2="22" y2="38" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="80" y1="38" x2="92" y2="38" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  M: () => (
    <svg viewBox="0 0 110 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 36 L12 29 C12 27 13 25 16 23 L28 19 C33 17 38 15 46 14 L64 14 C70 14 76 15 80 17 L90 21 C94 23 96 25 96 28 L97 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M30 19 L33 25 L60 25 L78 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="48" y1="15" x2="47" y2="25" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M78 17 L85 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="26" cy="38" r="6" stroke="currentColor" strokeWidth="2"/>
      <circle cx="26" cy="38" r="2.5" stroke="currentColor" strokeWidth="1"/>
      <circle cx="82" cy="38" r="6" stroke="currentColor" strokeWidth="2"/>
      <circle cx="82" cy="38" r="2.5" stroke="currentColor" strokeWidth="1"/>
      <line x1="32" y1="38" x2="76" y2="38" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="5" y1="38" x2="20" y2="38" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="88" y1="38" x2="105" y2="38" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  L: () => (
    <svg viewBox="0 0 120 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 36 L10 28 C10 26 12 24 15 22 L28 18 C34 15 40 13 50 12 L72 12 C80 12 86 13 90 15 L102 19 C106 21 108 23 108 26 L109 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M30 18 L33 24 L65 24 L68 22 L88 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="50" y1="13" x2="49" y2="24" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="68" y1="22" x2="68" y2="24" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="25" cy="38" r="6" stroke="currentColor" strokeWidth="2"/>
      <circle cx="25" cy="38" r="2.5" stroke="currentColor" strokeWidth="1"/>
      <circle cx="94" cy="38" r="6" stroke="currentColor" strokeWidth="2"/>
      <circle cx="94" cy="38" r="2.5" stroke="currentColor" strokeWidth="1"/>
      <line x1="31" y1="38" x2="88" y2="38" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="3" y1="38" x2="19" y2="38" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="100" y1="38" x2="117" y2="38" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  XL: () => (
    <svg viewBox="0 0 120 55" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 40 L10 24 C10 22 12 19 15 17 L30 13 C36 10 42 8 52 8 L74 8 C82 8 88 9 92 11 L104 15 C108 17 110 20 110 24 L111 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M32 13 L34 20 L62 20 L64 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="67" y="11" width="20" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="48" y1="9" x2="47" y2="20" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="26" cy="42" r="7" stroke="currentColor" strokeWidth="2"/>
      <circle cx="26" cy="42" r="3" stroke="currentColor" strokeWidth="1"/>
      <circle cx="96" cy="42" r="7" stroke="currentColor" strokeWidth="2"/>
      <circle cx="96" cy="42" r="3" stroke="currentColor" strokeWidth="1"/>
      <line x1="33" y1="42" x2="89" y2="42" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="3" y1="42" x2="19" y2="42" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="103" y1="42" x2="117" y2="42" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  XXL: () => (
    <svg viewBox="0 0 130 55" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 40 L10 12 C10 9 12 8 15 8 L90 8 C96 8 100 9 104 11 L114 15 C118 17 120 20 120 24 L121 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="14" y="12" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="32" y="12" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="50" y="12" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="68" y="12" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M90 8 L100 10 L110 14 C112 15 113 17 113 19 L113 22 L90 22 L90 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="26" cy="42" r="7" stroke="currentColor" strokeWidth="2"/>
      <circle cx="26" cy="42" r="3" stroke="currentColor" strokeWidth="1"/>
      <circle cx="104" cy="42" r="7" stroke="currentColor" strokeWidth="2"/>
      <circle cx="104" cy="42" r="3" stroke="currentColor" strokeWidth="1"/>
      <line x1="33" y1="42" x2="97" y2="42" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="3" y1="42" x2="19" y2="42" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="111" y1="42" x2="127" y2="42" stroke="currentColor" strokeWidth="1.5"/>
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
  const [selectedPolishingType, setSelectedPolishingType] = useState(null); // "1lepes" | "tobbLepes"
  
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
  // Load pricing data when location changes
  useEffect(() => {
    const locParam = form.location ? `?location=${form.location}` : "";
    axios.get(`${API}/services/pricing-data${locParam}`)
      .then(r => {
        setPricingData(r.data);
        if (r.data.extras) setExtras(r.data.extras);
      })
      .catch(err => console.error("Pricing data error:", err));
    
    if (!form.location) {
      axios.get(`${API}/services/extras`)
        .then(r => setExtras(Array.isArray(r.data) ? r.data : []))
        .catch(err => console.error("Extras error:", err));
    }
  }, [form.location]);

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
  const getPolishingPrice = () => {
    if (!selectedSize || !selectedPolishingType || !pricingData?.polishing) return 0;
    return pricingData.polishing.types[selectedPolishingType]?.prices[selectedSize] || 0;
  };

  const getPrice = () => {
    if (selectedPromotion) return selectedPromotion.price;
    if (selectedCategory === "poliroz") return getPolishingPrice();
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
    if (selectedCategory === "poliroz" && selectedSize) {
      const polishDurations = { "1lepes": { S: 90, M: 100, L: 120, XL: 140, XXL: 160 }, "tobbLepes": { S: 150, M: 180, L: 210, XL: 240, XXL: 270 } };
      return polishDurations[selectedPolishingType]?.[selectedSize] || 120;
    }
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
    setSelectedExtras([]); // Clear extras when promotion selected
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
    setSelectedPolishingType(null);
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

  // Resolve extra name from its ID (service_id or name)
  const resolveExtraName = (extraId) =>
    extras.find(e => (e.service_id || e.name) === extraId)?.name || extraId;

  // Returns true if the given extraId cannot currently be selected
  const isExtraDisabled = (extraId) => {
    const name = resolveExtraName(extraId);
    // "Eladásra felkészítés" is already selected → everything else blocked
    const eladasId = extras.find(e => e.name === "Eladásra felkészítés");
    const eladasKey = eladasId ? (eladasId.service_id || eladasId.name) : "Eladásra felkészítés";
    if (selectedExtras.includes(eladasKey) && extraId !== eladasKey) return true;
    // "Komplett kárpittisztítás" selected → "Kárpittisztítás/ülés" blocked
    const kompKarpitKey = (() => { const e = extras.find(ex => ex.name === "Komplett kárpittisztítás"); return e ? (e.service_id || e.name) : "Komplett kárpittisztítás"; })();
    if (name === "Kárpittisztítás/ülés" && selectedExtras.includes(kompKarpitKey)) return true;
    // "Komplett 3 fázisú bőrápolás" selected → "3 fázisú bőrápolás/ülés" blocked
    const kompBorapKey = (() => { const e = extras.find(ex => ex.name === "Komplett 3 fázisú bőrápolás"); return e ? (e.service_id || e.name) : "Komplett 3 fázisú bőrápolás"; })();
    if (name === "3 fázisú bőrápolás/ülés" && selectedExtras.includes(kompBorapKey)) return true;
    return false;
  };

  const toggleExtra = (extraId) => {
    if (isExtraDisabled(extraId) && !selectedExtras.includes(extraId)) return; // blocked
    const name = resolveExtraName(extraId);
    setSelectedExtras(prev => {
      if (prev.includes(extraId)) {
        // Deselect always allowed
        return prev.filter(id => id !== extraId);
      }
      // --- Selecting ---
      // "Eladásra felkészítés": exclusive – clears all others
      if (name === "Eladásra felkészítés") return [extraId];
      // Selecting "Komplett kárpittisztítás" → remove "Kárpittisztítás/ülés" if present
      let next = [...prev];
      if (name === "Komplett kárpittisztítás") {
        next = next.filter(id => resolveExtraName(id) !== "Kárpittisztítás/ülés");
      }
      // Selecting "Komplett 3 fázisú bőrápolás" → remove "3 fázisú bőrápolás/ülés" if present
      if (name === "Komplett 3 fázisú bőrápolás") {
        next = next.filter(id => resolveExtraName(id) !== "3 fázisú bőrápolás/ülés");
      }
      return [...next, extraId];
    });
  };

  const canGoNext = () => {
    if (step === 1) return form.location && (selectedPromotion || (selectedSize && selectedCategory === "poliroz" && selectedPolishingType) || (selectedSize && selectedCategory && selectedPackage && selectedCategory !== "poliroz"));
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
        serviceName = `${selectedPromotion.name}`;
      } else if (selectedCategory === "poliroz") {
        const polishLabel = selectedPolishingType === "1lepes" ? "1-lépéses polírozás" : "Többlépéses polírozás";
        serviceName = `${selectedSize} - ${polishLabel}`;
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
              {/* Location Selector */}
              <div>
                <label className="text-sm text-slate-400 mb-3 block font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-400" /> Telephely
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["Debrecen", "Budapest"].map(loc => (
                    <button
                      key={loc}
                      onClick={() => set("location", loc)}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        form.location === loc
                          ? 'border-green-500 bg-green-500/10 text-white'
                          : 'border-slate-700 hover:border-slate-600 bg-slate-800/50 text-slate-300'
                      }`}
                      data-testid={`location-${loc}`}
                    >
                      <MapPin className={`w-5 h-5 mx-auto mb-1 ${form.location === loc ? 'text-green-400' : 'text-slate-500'}`} />
                      <span className="text-sm font-medium">{loc}</span>
                    </button>
                  ))}
                </div>
              </div>

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
                        <div className={`w-16 h-12 mb-2 ${selectedSize === size ? 'text-green-400' : 'text-slate-500'}`}>
                          {CarIcons[size]()}
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
                  <div className={`grid gap-3 ${form.location === "Debrecen" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
                    {[
                      { id: 'kulso', name: 'Külső', desc: 'Külső tisztítás', icon: '🚿' },
                      { id: 'belso', name: 'Belső', desc: 'Belső takarítás', icon: '🧹' },
                      { id: 'komplett', name: 'Külső + Belső', desc: 'Teljes tisztítás', icon: '✨' },
                      ...(form.location === "Debrecen" ? [{ id: 'poliroz', name: 'Polírozás', desc: 'Fényezés polírozás', icon: '🔮' }] : [])
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { setSelectedCategory(cat.id); setSelectedPolishingType(null); setSelectedPackage(null); }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          selectedCategory === cat.id
                            ? cat.id === 'poliroz'
                              ? 'border-amber-500 bg-amber-500/10'
                              : 'border-green-500 bg-green-500/10'
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

              {/* Polishing Type Selection - only for Debrecen poliroz category */}
              {!selectedPromotion && selectedSize && selectedCategory === "poliroz" && (
                <div>
                  <label className="text-sm text-slate-400 mb-3 block font-medium">3. Polírozás típusa</label>
                  <div className="grid grid-cols-2 gap-3">
                    {pricingData?.polishing?.types && Object.entries(pricingData.polishing.types).map(([typeId, typeData]) => {
                      const price = typeData.prices?.[selectedSize] || 0;
                      const isSelected = selectedPolishingType === typeId;
                      return (
                        <button
                          key={typeId}
                          onClick={() => setSelectedPolishingType(typeId)}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500/10'
                              : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                          }`}
                          data-testid={`polishing-${typeId}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                              {typeData.name}
                            </span>
                            {isSelected && <Check className="w-5 h-5 text-amber-400 flex-shrink-0" />}
                          </div>
                          <div className={`text-2xl font-bold mb-2 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`}>
                            {price.toLocaleString()} Ft
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Timer className="w-3 h-3" /> {typeData.duration_label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {pricingData?.polishing?.addons?.length > 0 && (
                    <div className="mt-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                      <p className="text-xs text-amber-400/80 mb-2 font-medium">Elérhető kiegészítők:</p>
                      {pricingData.polishing.addons.map((addon, i) => (
                        <div key={i} className="flex justify-between text-xs py-1">
                          <span className="text-slate-400">{addon.name} <span className="text-slate-600">({addon.note})</span></span>
                          <span className="text-slate-300">+{addon.price.toLocaleString()} Ft</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Package Selection with Features - only show if no promotion selected and not poliroz */}
              {!selectedPromotion && selectedSize && selectedCategory && selectedCategory !== "poliroz" && (
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

              {/* Extra Services - show for promotion, package, or poliroz type selection */}
              {(selectedPromotion || selectedPackage || (selectedCategory === "poliroz" && selectedPolishingType)) && extras.length > 0 && (
                <div>
                  <label className="text-sm text-slate-400 mb-3 block font-medium">
                    {selectedPromotion ? 'Extra szolgáltatások' : '4. Extra szolgáltatások (opcionális)'}
                  </label>
                  {selectedPromotion ? (
                    <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                      <p className="text-amber-400 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Az akciós csomag már tartalmazza az összes szolgáltatást!
                      </p>
                      <p className="text-slate-500 text-xs mt-1">Az akciós árak fix csomagokat tartalmaznak, extra szolgáltatás nem adható hozzá.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {extras.map(extra => {
                        const extraKey = extra.service_id || extra.name;
                        const isSelected = selectedExtras.includes(extraKey);
                        const disabled = isExtraDisabled(extraKey);
                        const isExclusive = extra.name === "Eladásra felkészítés";
                        return (
                          <div
                            key={extraKey}
                            onClick={() => !disabled && toggleExtra(extraKey)}
                            className={`p-3 rounded-lg border transition-all ${
                              disabled && !isSelected
                                ? 'border-slate-800 bg-slate-900/30 cursor-not-allowed opacity-40'
                                : isSelected
                                  ? isExclusive
                                    ? 'border-orange-500 bg-orange-500/10 cursor-pointer'
                                    : 'border-green-500 bg-green-500/10 cursor-pointer'
                                  : 'border-slate-700 hover:border-slate-600 bg-slate-800/30 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <Checkbox
                                  checked={isSelected}
                                  disabled={disabled && !isSelected}
                                  className={isSelected && isExclusive ? "border-orange-500" : "border-slate-600"}
                                />
                                <div className="min-w-0">
                                  <span className={`text-sm font-medium ${isExclusive ? 'text-orange-300' : 'text-white'}`}>
                                    {extra.name}
                                    {isExclusive && <span className="ml-2 text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">FULL SERVICE</span>}
                                  </span>
                                  {extra.description && (
                                    <p className="text-xs text-slate-500 truncate">{extra.description}</p>
                                  )}
                                  {disabled && !isSelected && (
                                    <p className="text-xs text-slate-600 italic">Más szolgáltatással nem kombinálható</p>
                                  )}
                                </div>
                              </div>
                              <span className={`font-medium text-sm whitespace-nowrap ${isExclusive ? 'text-orange-400' : 'text-green-400'}`}>
                                {extra.min_price ? `${extra.min_price.toLocaleString()} Ft-tól` : `${(extra.price || 0).toLocaleString()} Ft`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Price Summary - show for promotion, package, or poliroz type selection */}
              {(selectedPromotion || selectedPackage || (selectedCategory === "poliroz" && selectedPolishingType)) && (
                <>
                  {/* Smart Extra Suggestions - inline, automatic */}
                  {!selectedPromotion && selectedSize && selectedPackage && extras.length > 0 && (
                    (() => {
                      const unselectedExtras = extras.filter(e => !selectedExtras.includes(e.service_id || e.name) && !isExtraDisabled(e.service_id || e.name));
                      if (unselectedExtras.length === 0) return null;
                      const suggested = unselectedExtras.slice(0, 3);
                      return (
                        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-sm font-medium">Ajánlott extrák a választott szolgáltatáshoz</span>
                          </div>
                          <div className="space-y-2">
                            {suggested.map(extra => (
                              <button
                                key={extra.service_id || extra.name}
                                onClick={() => toggleExtra(extra.service_id || extra.name)}
                                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-700/50 bg-slate-800/30 hover:border-green-500/50 hover:bg-green-500/5 transition-all text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded border border-slate-600 flex items-center justify-center">
                                    <Plus className="w-3 h-3 text-green-400" />
                                  </div>
                                  <div>
                                    <span className="text-white text-sm">{extra.name}</span>
                                    {extra.description && <p className="text-xs text-slate-500">{extra.description}</p>}
                                  </div>
                                </div>
                                <span className="text-green-400 font-medium text-sm whitespace-nowrap ml-2">
                                  +{extra.min_price ? `${extra.min_price.toLocaleString()} Ft` : `${(extra.price || 0).toLocaleString()} Ft`}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </>
              )}

              {/* Price Summary - show for all selection types */}
              {(selectedPromotion || selectedPackage || (selectedCategory === "poliroz" && selectedPolishingType)) && (
                <div className={`rounded-xl p-4 border ${
                  selectedPromotion
                    ? 'bg-gradient-to-r from-pink-500/10 to-orange-500/10 border-pink-500/30'
                    : selectedCategory === "poliroz"
                      ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30'
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
                      <span className={`text-3xl font-bold ${selectedPromotion ? 'text-pink-400' : selectedCategory === "poliroz" ? 'text-amber-400' : 'text-green-400'}`}>
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

              {/* Worker Selection */}
              {form.time_slot && (
                <div className="mt-4">
                  <label className="text-sm text-slate-400 mb-3 block">
                    Munkatárs választása
                  </label>
                  {(() => {
                    const selectedSlot = slots.find(s => s.time_slot === form.time_slot);
                    const workers = selectedSlot?.available_workers || [];
                    if (workers.length === 0) return <p className="text-sm text-slate-500">Nincs elérhető munkatárs</p>;
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <button
                          onClick={() => set("worker_id", "")}
                          className={`p-3 rounded-xl border-2 transition-all text-center ${
                            !form.worker_id 
                              ? 'border-green-400 bg-green-500/10 text-white' 
                              : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                          }`}
                          data-testid="worker-any"
                        >
                          <Users className="w-5 h-5 mx-auto mb-1 text-green-400" />
                          <div className="text-sm font-medium">Mindegy</div>
                        </button>
                        {workers.map(w => (
                          <button
                            key={w.worker_id}
                            onClick={() => set("worker_id", w.worker_id)}
                            className={`p-3 rounded-xl border-2 transition-all text-center ${
                              form.worker_id === w.worker_id
                                ? 'border-green-400 bg-green-500/10 text-white'
                                : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                            }`}
                            data-testid={`worker-${w.worker_id}`}
                          >
                            <User className="w-5 h-5 mx-auto mb-1 text-green-400" />
                            <div className="text-sm font-medium">{w.name}</div>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
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
                    {selectedPromotion
                      ? selectedPromotion.name
                      : selectedCategory === "poliroz"
                        ? `${selectedSize} – ${selectedPolishingType === "1lepes" ? "1-lépéses polírozás" : "Többlépéses polírozás"}`
                        : `${selectedSize} - ${selectedCategory === 'kulso' ? 'Külső' : selectedCategory === 'belso' ? 'Belső' : 'Komplett'} ${selectedPackage}`
                    }
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="text-slate-400 flex items-center gap-2"><Calendar className="w-4 h-4" /> Időpont</div>
                  <div className="text-white text-right">{form.date} <span className="text-green-400 font-bold">{form.time_slot}</span></div>
                  {form.worker_id && (() => {
                    const selectedSlot = slots.find(s => s.time_slot === form.time_slot);
                    const worker = selectedSlot?.available_workers?.find(w => w.worker_id === form.worker_id);
                    return worker ? (
                      <>
                        <div className="text-slate-400 flex items-center gap-2"><Users className="w-4 h-4" /> Munkatárs</div>
                        <div className="text-white text-right">{worker.name}</div>
                      </>
                    ) : null;
                  })()}
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
