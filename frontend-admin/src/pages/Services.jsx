import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth, useLocation2 } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Sparkles,
  Plus,
  Edit,
  Trash2,
  Clock,
  Car,
  Tag,
  Percent,
  Calendar,
  Check,
  Pencil,
  MapPin,
} from "lucide-react";

export const Services = () => {
  const { user } = useAuth();
  const { selectedLocation, locationForApi } = useLocation2();
  const [services, setServices] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [extras, setExtras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleteServiceId, setDeleteServiceId] = useState(null);
  
  // Promotion states
  const [isNewPromoOpen, setIsNewPromoOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [deletePromoId, setDeletePromoId] = useState(null);

  // Extra states
  const [isNewExtraOpen, setIsNewExtraOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState(null);
  const [extraForm, setExtraForm] = useState({
    name: "", category: "extra_kulso", price: 0, min_price: 0, description: "", location: locationForApi || null
  });
  
  // Use global location context so Services page reflects the selected location
  const [servicesLoc, setServicesLoc] = useState(locationForApi || "all");

  // Polírozás type management states
  const [polishTypes, setPolishTypes] = useState({});
  const [isNewPolishTypeOpen, setIsNewPolishTypeOpen] = useState(false);
  const [editingPolishType, setEditingPolishType] = useState(null); // { typeKey, data }
  const [isEditPolishTypeOpen, setIsEditPolishTypeOpen] = useState(false);
  const [polishTypeForm, setPolishTypeForm] = useState({
    name: "",
    description: "",
    duration_label: "",
    location: null,
    prices: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 }
  });
  const [polishTypeSaving, setPolishTypeSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "komplett",
    price: 0,
    duration: 60,
    description: "",
    car_size: "",
    package: "",
    location: locationForApi || null
  });

  const [promoForm, setPromoForm] = useState({
    name: "",
    description: "",
    price: 0,
    original_price: 0,
    category: "komplett",
    car_sizes: ["S", "M"],
    package: "Pro",
    duration: 70,
    badge: "🎉 AKCIÓ",
    valid_until: "",
    active: true,
    location: locationForApi || null
  });

  const categories = [
    { value: "komplett", label: "Komplett" },
    { value: "kulso", label: "Külső" },
    { value: "belso", label: "Belső" }
  ];

  const carSizes = ["S", "M", "L", "XL", "XXL"];
  const packages = ["Eco", "Pro", "VIP"];

  const fetchServices = async (loc) => {
    try {
      // Show location-specific + global (null-location) services for the selected location.
      // Global services (location=null) are shared across all locations intentionally.
      // New services created while a location is selected inherit that location.
      const locParam = (loc && loc !== "all") ? `?location=${loc}` : "";
      const response = await axios.get(`${API}/services${locParam}`, { withCredentials: true });
      setServices(response.data);
    } catch (error) {
      toast.error("Hiba a szolgáltatások betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  const fetchPromotions = async (loc) => {
    try {
      const locParam = (loc && loc !== "all") ? `?location=${loc}` : "";
      const response = await axios.get(`${API}/services/promotions/admin${locParam}`, { withCredentials: true });
      setPromotions(response.data);
    } catch (error) {
      console.error("Promotions error:", error);
    }
  };

  const fetchPolishTypes = async () => {
    try {
      const response = await axios.get(`${API}/services/pricing-data`, { withCredentials: true });
      if (response.data?.polishing?.types) {
        setPolishTypes(response.data.polishing.types);
      }
    } catch (error) {
      console.warn("Could not fetch polishing types:", error);
    }
  };

  // Sync servicesLoc with the global location when it changes
  useEffect(() => {
    setServicesLoc(locationForApi || "all");
  }, [locationForApi]);

  useEffect(() => {
    fetchServices(servicesLoc);
    fetchPromotions(servicesLoc);
    fetchExtras();
    fetchPolishTypes();
  }, [servicesLoc]);

  const fetchExtras = async () => {
    try {
      const locParam = locationForApi ? `?location=${locationForApi}` : "";
      const response = await axios.get(`${API}/services/extras/admin${locParam}`, { withCredentials: true });
      setExtras(response.data);
    } catch (error) {
      console.error("Extras error:", error);
    }
  };

  const handleExtraSubmit = async () => {
    try {
      const payload = { ...extraForm };
      if (payload.price === 0 && payload.min_price > 0) payload.price = payload.min_price;
      if (editingExtra) {
        await axios.put(`${API}/services/extras/${editingExtra.service_id}`, payload, { withCredentials: true });
        toast.success("Extra frissítve");
      } else {
        await axios.post(`${API}/services/extras`, payload, { withCredentials: true });
        toast.success("Extra létrehozva");
      }
      setIsNewExtraOpen(false);
      setEditingExtra(null);
      setExtraForm({ name: "", category: "extra_kulso", price: 0, min_price: 0, description: "", location: locationForApi || null });
      fetchExtras();
    } catch (error) {
      toast.error("Hiba az extra mentésekor");
    }
  };

  const handleDeleteExtra = async (serviceId) => {
    try {
      await axios.delete(`${API}/services/extras/${serviceId}`, { withCredentials: true });
      toast.success("Extra törölve");
      fetchExtras();
    } catch (error) {
      toast.error("Hiba az extra törlésekor");
    }
  };

  const resetPolishTypeForm = () => {
    setPolishTypeForm({
      name: "",
      description: "",
      duration_label: "",
      location: null,
      prices: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 }
    });
  };

  const handleCreatePolishType = async () => {
    setPolishTypeSaving(true);
    try {
      const prices = polishTypeForm.prices;
      const minPrice = Math.min(...Object.values(prices).map(Number));
      await axios.post(`${API}/services`, {
        name: polishTypeForm.name,
        description: polishTypeForm.description,
        category: "poliroz",
        service_type: "poliroz",
        price: minPrice,
        duration: 120,
        duration_label: polishTypeForm.duration_label,
        size_prices: prices,
        location: polishTypeForm.location
      }, { withCredentials: true });
      toast.success("Polírozás típus létrehozva!");
      setIsNewPolishTypeOpen(false);
      resetPolishTypeForm();
      fetchPolishTypes();
      fetchServices(servicesLoc);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a létrehozáskor");
    }
    setPolishTypeSaving(false);
  };

  const handleUpdatePolishType = async () => {
    if (!editingPolishType) return;
    setPolishTypeSaving(true);
    try {
      const prices = polishTypeForm.prices;
      const minPrice = Math.min(...Object.values(prices).map(Number).filter(v => v > 0));
      const payload = {
        name: polishTypeForm.name,
        description: polishTypeForm.description,
        category: "poliroz",
        service_type: "poliroz",
        price: minPrice || 0,
        duration: 120,
        duration_label: polishTypeForm.duration_label,
        size_prices: prices,
        location: polishTypeForm.location
      };
      if (editingPolishType.service_id) {
        // DB record — update it
        await axios.put(`${API}/services/${editingPolishType.service_id}`, payload, { withCredentials: true });
        toast.success("Polírozás típus frissítve!");
      } else {
        // Hardcoded — create as new DB record
        await axios.post(`${API}/services`, payload, { withCredentials: true });
        toast.success("Polírozás típus DB-be mentve!");
      }
      setIsEditPolishTypeOpen(false);
      setEditingPolishType(null);
      resetPolishTypeForm();
      fetchPolishTypes();
      fetchServices(servicesLoc);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a mentéskor");
    }
    setPolishTypeSaving(false);
  };

  const handleDeletePolishType = async (serviceId) => {
    try {
      await axios.delete(`${API}/services/${serviceId}`, { withCredentials: true });
      toast.success("Polírozás típus törölve!");
      fetchPolishTypes();
      fetchServices(servicesLoc);
    } catch (error) {
      toast.error("Hiba a törlés során");
    }
  };

  const openEditPolishType = (typeKey, typeData) => {
    setEditingPolishType({ typeKey, ...typeData });
    setPolishTypeForm({
      name: typeData.name || "",
      description: typeData.description || "",
      duration_label: typeData.duration_label || "",
      location: typeData.location || null,
      prices: { S: 0, M: 0, L: 0, XL: 0, XXL: 0, ...(typeData.prices || {}) }
    });
    setIsEditPolishTypeOpen(true);
  };

  const handleSubmit = async () => {
    try {
      // Clean up empty strings to null
      const cleanedData = {
        ...formData,
        car_size: formData.car_size || null,
        package: formData.package || null,
        description: formData.description || null
      };
      
      if (editingService) {
        await axios.put(`${API}/services/${editingService.service_id}`, cleanedData, { withCredentials: true });
        toast.success("Szolgáltatás frissítve!");
      } else {
        await axios.post(`${API}/services`, cleanedData, { withCredentials: true });
        toast.success("Szolgáltatás létrehozva!");
      }
      setIsNewServiceOpen(false);
      setEditingService(null);
      resetForm();
      fetchServices(servicesLoc);
    } catch (error) {
      console.error("Service error:", error);
      toast.error(error.response?.data?.detail || "Hiba történt");
    }
  };

  const handleDelete = async (serviceId) => {
    try {
      await axios.delete(`${API}/services/${serviceId}`, { withCredentials: true });
      toast.success("Szolgáltatás törölve!");
      fetchServices();
      setDeleteServiceId(null);
    } catch (error) {
      toast.error("Hiba a törlés során");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "komplett",
      price: 0,
      duration: 60,
      description: "",
      car_size: "",
      package: "",
      location: servicesLoc !== "all" ? servicesLoc : null
    });
  };

  // Promotion handlers
  const resetPromoForm = () => {
    setPromoForm({
      name: "",
      description: "",
      price: 0,
      original_price: 0,
      category: "komplett",
      car_sizes: ["S", "M"],
      package: "Pro",
      duration: 70,
      badge: "🎉 AKCIÓ",
      valid_until: "",
      active: true,
      location: servicesLoc !== "all" ? servicesLoc : null
    });
  };

  const handlePromoSubmit = async () => {
    try {
      if (editingPromo && !editingPromo._hardcoded) {
        await axios.put(`${API}/services/promotions/${editingPromo.id}`, promoForm, { withCredentials: true });
        toast.success("Akció frissítve!");
      } else {
        // New or hardcoded (seed to DB)
        await axios.post(`${API}/services/promotions`, promoForm, { withCredentials: true });
        toast.success(editingPromo?._hardcoded ? "Akció DB-be mentve!" : "Akció létrehozva!");
      }
      setIsNewPromoOpen(false);
      setEditingPromo(null);
      resetPromoForm();
      fetchPromotions(servicesLoc);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba történt");
    }
  };

  const handleDeletePromo = async (promoId) => {
    try {
      await axios.delete(`${API}/services/promotions/${promoId}`, { withCredentials: true });
      toast.success("Akció törölve!");
      fetchPromotions();
      setDeletePromoId(null);
    } catch (error) {
      toast.error("Hiba a törlés során");
    }
  };

  const openEditPromoDialog = (promo) => {
    setEditingPromo(promo);
    setPromoForm({
      name: promo.name,
      description: promo.description,
      price: promo.price,
      original_price: promo.original_price || 0,
      category: promo.category,
      car_sizes: promo.car_sizes || ["S", "M"],
      package: promo.package,
      duration: promo.duration,
      badge: promo.badge || "🎉 AKCIÓ",
      valid_until: promo.valid_until || "",
      active: promo.active !== false,
      location: promo.location || null
    });
    setIsNewPromoOpen(true);
  };

  const toggleCarSize = (size) => {
    setPromoForm(prev => ({
      ...prev,
      car_sizes: prev.car_sizes.includes(size)
        ? prev.car_sizes.filter(s => s !== size)
        : [...prev.car_sizes, size]
    }));
  };

  const openEditDialog = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      category: service.category,
      price: service.price,
      duration: service.duration,
      description: service.description || "",
      car_size: service.car_size || "",
      package: service.package || "",
      location: service.location || null
    });
    setIsNewServiceOpen(true);
  };

  const getCategoryColor = (category) => {
    const colors = {
      komplett: "bg-green-500/20 text-green-400",
      kulso: "bg-blue-500/20 text-blue-400",
      belso: "bg-purple-500/20 text-purple-400",
      extra: "bg-orange-500/20 text-orange-400"
    };
    return colors[category] || colors.komplett;
  };

  const getCategoryLabel = (cat) => {
    if (cat === "extra_kulso") return "Külső extra";
    if (cat === "extra_belso") return "Belső extra";
    if (cat === "extra_special") return "Speciális";
    return cat || "Extra";
  };

  const getCategoryBadgeClass = (cat) => {
    if (cat === "extra_kulso") return "bg-green-500/20 text-green-400";
    if (cat === "extra_belso") return "bg-blue-500/20 text-blue-400";
    if (cat === "extra_special") return "bg-orange-500/20 text-orange-400";
    return "bg-slate-500/20 text-slate-400";
  };

  const groupedServices = services.reduce((acc, service) => {
    const cat = service.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="services-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Manrope']">Szolgáltatások</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">{services.length} szolgáltatás</p>
        </div>
      </div>

      {/* Location Filter */}
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-slate-400" />
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-1">
          {[{ val: "all", label: "Összes telephely" }, { val: "Debrecen", label: "Debrecen" }, { val: "Budapest", label: "Budapest" }].map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setServicesLoc(val)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                servicesLoc === val ? "bg-green-500/20 text-green-400" : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* New Service Button row */}
      <div className="flex justify-end">
        <div className="flex gap-2">
        <Dialog open={isNewServiceOpen} onOpenChange={(open) => {
            setIsNewServiceOpen(open);
            if (!open) {
              setEditingService(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-500" data-testid="new-service-btn">
                <Plus className="w-4 h-4 mr-2" />
                Új szolgáltatás
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-['Manrope']">
                  {editingService ? "Szolgáltatás szerkesztése" : "Új szolgáltatás"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-slate-300">Név</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="Szolgáltatás neve"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Kategória</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                      <SelectTrigger className="bg-slate-950 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value} className="text-white">
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Ár (Ft)</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: parseInt(e.target.value) || 0})}
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-300">Időtartam (perc)</Label>
                    <Input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 0})}
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Autó méret</Label>
                    <Select value={formData.car_size || "none"} onValueChange={(v) => setFormData({...formData, car_size: v === "none" ? "" : v})}>
                      <SelectTrigger className="bg-slate-950 border-slate-700">
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        <SelectItem value="none" className="text-white">-</SelectItem>
                        {carSizes.map(size => (
                          <SelectItem key={size} value={size} className="text-white">{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Csomag</Label>
                    <Select value={formData.package || "none"} onValueChange={(v) => setFormData({...formData, package: v === "none" ? "" : v})}>
                      <SelectTrigger className="bg-slate-950 border-slate-700">
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        <SelectItem value="none" className="text-white">-</SelectItem>
                        {packages.map(pkg => (
                          <SelectItem key={pkg} value={pkg} className="text-white">{pkg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Telephely</Label>
                  <Select value={formData.location || "all"} onValueChange={(v) => setFormData({...formData, location: v === "all" ? null : v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700">
                      <SelectValue placeholder="Mindkét telephely" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="all" className="text-white">Mindkét telephely</SelectItem>
                      <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
                      <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Leírás</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="Opcionális leírás..."
                  />
                </div>
                <Button
                  onClick={handleSubmit}
                  className="w-full bg-green-600 hover:bg-green-500"
                  disabled={!formData.name || !formData.price}
                >
                  {editingService ? "Mentés" : "Létrehozás"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Services by Category */}
      <Tabs defaultValue="promotions" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 flex overflow-x-auto gap-1 w-full sm:w-auto h-auto flex-nowrap">
          <TabsTrigger 
            value="promotions"
            className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400"
          >
            <Tag className="w-4 h-4 mr-2" />
            Akciók
          </TabsTrigger>
          {categories.map(cat => (
            <TabsTrigger 
              key={cat.value} 
              value={cat.value}
              className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
            >
              {cat.label}
            </TabsTrigger>
          ))}
          <TabsTrigger
            value="extras"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
          >
            <Plus className="w-4 h-4 mr-1" />
            Extrák
          </TabsTrigger>
          <TabsTrigger
            value="poliroz"
            className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
          >
            ✨ Polírozás
          </TabsTrigger>
        </TabsList>

        {/* Promotions Tab */}
        <TabsContent value="promotions" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg text-white font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-400" />
              Aktuális akciók
            </h2>
            <Dialog open={isNewPromoOpen} onOpenChange={(open) => {
              setIsNewPromoOpen(open);
              if (!open) {
                setEditingPromo(null);
                resetPromoForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-pink-600 hover:bg-pink-500" data-testid="new-promo-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Új akció
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl font-['Manrope']">
                    {editingPromo?._hardcoded ? "Beépített akció mentése DB-be" : editingPromo ? "Akció szerkesztése" : "Új akció létrehozása"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-slate-300">Akció neve</Label>
                    <Input
                      value={promoForm.name}
                      onChange={(e) => setPromoForm({...promoForm, name: e.target.value})}
                      className="bg-slate-950 border-slate-700 text-white"
                      placeholder="pl. Tavaszi akció"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Leírás</Label>
                    <Input
                      value={promoForm.description}
                      onChange={(e) => setPromoForm({...promoForm, description: e.target.value})}
                      className="bg-slate-950 border-slate-700 text-white"
                      placeholder="pl. Komplett külső+belső tisztítás M méretig"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Akciós ár (Ft)</Label>
                      <Input
                        type="number"
                        value={promoForm.price}
                        onChange={(e) => setPromoForm({...promoForm, price: parseInt(e.target.value) || 0})}
                        className="bg-slate-950 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Eredeti ár (Ft)</Label>
                      <Input
                        type="number"
                        value={promoForm.original_price}
                        onChange={(e) => setPromoForm({...promoForm, original_price: parseInt(e.target.value) || 0})}
                        className="bg-slate-950 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Kategória</Label>
                      <Select value={promoForm.category} onValueChange={(v) => setPromoForm({...promoForm, category: v})}>
                        <SelectTrigger className="bg-slate-950 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          <SelectItem value="komplett" className="text-white">Komplett</SelectItem>
                          <SelectItem value="kulso" className="text-white">Külső</SelectItem>
                          <SelectItem value="belso" className="text-white">Belső</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Csomag</Label>
                      <Select value={promoForm.package} onValueChange={(v) => setPromoForm({...promoForm, package: v})}>
                        <SelectTrigger className="bg-slate-950 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          {packages.map(pkg => (
                            <SelectItem key={pkg} value={pkg} className="text-white">{pkg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300">Autó méretek (max)</Label>
                    <div className="flex gap-2 mt-2">
                      {carSizes.map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleCarSize(size)}
                          className={`px-3 py-2 rounded-lg border-2 transition-colors ${
                            promoForm.car_sizes.includes(size)
                              ? 'border-pink-500 bg-pink-500/20 text-pink-400'
                              : 'border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Időtartam (perc)</Label>
                      <Input
                        type="number"
                        value={promoForm.duration}
                        onChange={(e) => setPromoForm({...promoForm, duration: parseInt(e.target.value) || 0})}
                        className="bg-slate-950 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Érvényesség vége</Label>
                      <Input
                        type="date"
                        value={promoForm.valid_until}
                        onChange={(e) => setPromoForm({...promoForm, valid_until: e.target.value})}
                        className="bg-slate-950 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300">Badge szöveg</Label>
                    <Input
                      value={promoForm.badge}
                      onChange={(e) => setPromoForm({...promoForm, badge: e.target.value})}
                      className="bg-slate-950 border-slate-700 text-white"
                      placeholder="pl. 🌸 AKCIÓ vagy 🔥 KIÁRUSÍTÁS"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Telephely</Label>
                    <Select value={promoForm.location || "all"} onValueChange={(v) => setPromoForm({...promoForm, location: v === "all" ? null : v})}>
                      <SelectTrigger className="bg-slate-950 border-slate-700">
                        <SelectValue placeholder="Mindkét telephely" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        <SelectItem value="all" className="text-white">Mindkét telephely</SelectItem>
                        <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
                        <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Switch
                      checked={promoForm.active}
                      onCheckedChange={(checked) => setPromoForm({...promoForm, active: checked})}
                    />
                    <Label className="text-slate-300">Aktív (megjelenik a foglalási oldalon)</Label>
                  </div>
                </div>
                <DialogFooter className="mt-6 gap-2">
                  <Button variant="outline" onClick={() => setIsNewPromoOpen(false)} className="border-slate-700">
                    Mégse
                  </Button>
                  <Button onClick={handlePromoSubmit} className="bg-pink-600 hover:bg-pink-500">
                    {editingPromo?._hardcoded ? "Mentés DB-be" : editingPromo ? "Mentés" : "Létrehozás"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Promotions list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {promotions.map(promo => (
              <Card
                key={promo.id}
                className={`overflow-hidden transition-colors ${
                  promo._hardcoded
                    ? 'border-amber-500/40 hover:border-amber-500'
                    : promo.active
                      ? 'border-pink-500/50 hover:border-pink-500'
                      : 'border-slate-800 opacity-60'
                }`}
              >
                <div className={`h-1 ${promo._hardcoded ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : promo.active ? 'bg-gradient-to-r from-pink-500 to-orange-500' : 'bg-slate-700'}`} />
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={promo._hardcoded ? 'bg-amber-500/20 text-amber-400' : promo.active ? 'bg-pink-500/20 text-pink-400' : 'bg-slate-700 text-slate-500'}>
                          {promo.badge || '🎉 AKCIÓ'}
                        </Badge>
                        {promo._hardcoded && (
                          <Badge className="bg-amber-700/30 text-amber-400 text-xs">Beépített – katt. szerk.</Badge>
                        )}
                        {!promo._hardcoded && !promo.active && (
                          <Badge className="bg-slate-700 text-slate-500">Inaktív</Badge>
                        )}
                      </div>
                      <h3 className="text-white font-semibold text-lg">{promo.name}</h3>
                      <p className="text-slate-400 text-sm">{promo.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
                        title={promo._hardcoded ? "Mentés DB-be és szerkesztés" : "Szerkesztés"}
                        onClick={() => openEditPromoDialog(promo)}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!promo._hardcoded && (
                        <button
                          className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md"
                          onClick={() => setDeletePromoId(promo.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {promo.location && (
                      <Badge variant="outline" className="border-green-500/40 text-green-400">
                        <MapPin className="w-3 h-3 mr-1" />{promo.location}
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-slate-600 text-slate-400">
                      <Car className="w-3 h-3 mr-1" />
                      {promo.car_sizes?.join(', ')} méret
                    </Badge>
                    <Badge variant="outline" className="border-slate-600 text-slate-400">
                      <Clock className="w-3 h-3 mr-1" />
                      {promo.duration} perc
                    </Badge>
                    <Badge className={`${
                      promo.package === 'VIP' ? 'bg-yellow-500/20 text-yellow-400' :
                      promo.package === 'Pro' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {promo.package}
                    </Badge>
                    {promo.valid_until && (
                      <Badge variant="outline" className="border-slate-600 text-slate-400">
                        <Calendar className="w-3 h-3 mr-1" />
                        {promo.valid_until}-ig
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      {promo.original_price && promo.original_price > promo.price && (
                        <>
                          <span className="text-slate-500 line-through">{promo.original_price.toLocaleString()} Ft</span>
                          <Badge className="bg-green-500/20 text-green-400">
                            -{Math.round((1 - promo.price / promo.original_price) * 100)}%
                          </Badge>
                        </>
                      )}
                    </div>
                    <span className="text-2xl font-bold text-pink-400">
                      {promo.price?.toLocaleString()} Ft
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {promotions.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nincs még akció létrehozva</p>
              <p className="text-sm mt-1">Kattints az "Új akció" gombra egy akció létrehozásához</p>
            </div>
          )}
        </TabsContent>

        {categories.map(cat => (
          <TabsContent key={cat.value} value={cat.value} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(groupedServices[cat.value] || []).map(service => (
                <Card 
                  key={service.service_id} 
                  className="glass-card hover:border-green-500/30 transition-colors"
                  data-testid={`service-card-${service.service_id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{service.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {service.location && (
                            <Badge variant="outline" className="text-xs border-green-500/40 text-green-400">
                              <MapPin className="w-3 h-3 mr-1" />{service.location}
                            </Badge>
                          )}
                          {service.car_size && (
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                              <Car className="w-3 h-3 mr-1" />
                              {service.car_size}
                            </Badge>
                          )}
                          {service.package && (
                            <Badge className={`text-xs ${
                              service.package === 'VIP' ? 'bg-yellow-500/20 text-yellow-400' :
                              service.package === 'Pro' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {service.package}
                            </Badge>
                          )}
                        </div>
                      </div>
                        <div className="flex gap-1">
                          <button 
                            type="button"
                            className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openEditDialog(service);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteServiceId(service.service_id);
                            }}
                            data-testid={`delete-service-${service.service_id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                    </div>
                    
                    {service.description && (
                      <p className="text-slate-500 text-sm mb-3">{service.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <span className="flex items-center gap-1 text-slate-400 text-sm">
                        <Clock className="w-4 h-4" />
                        {service.duration} perc
                      </span>
                      <span className="text-xl font-bold text-green-400">
                        {service.price.toLocaleString()} Ft
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {(!groupedServices[cat.value] || groupedServices[cat.value].length === 0) && (
              <div className="text-center py-12 text-slate-400">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nincs szolgáltatás ebben a kategóriában</p>
              </div>
            )}
          </TabsContent>
        ))}

        {/* Extras Tab */}
        <TabsContent value="extras" className="mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg text-white font-semibold flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" />
              Extra szolgáltatások
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const res = await axios.post(`${API}/services/extras/seed`, {}, { withCredentials: true });
                    toast.success(res.data.message || "Alapértelmezett extrák betöltve!");
                    fetchExtras();
                  } catch { toast.error("Hiba az extrák betöltésekor"); }
                }}
                className="border-slate-600 text-slate-300 hover:text-white text-xs"
              >
                Új extrák betöltése
              </Button>
              <Button
                onClick={() => {
                  setExtraForm({ name: "", category: "extra_kulso", price: 0, min_price: 0, description: "", location: locationForApi || null });
                  setEditingExtra(null);
                  setIsNewExtraOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-500"
                data-testid="new-extra-btn"
              >
                <Plus className="w-4 h-4 mr-2" /> Új extra
              </Button>
            </div>
          </div>

          {/* Extras Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {extras.map(extra => (
              <Card key={extra.service_id} className="glass-card hover:border-blue-500/30 transition-colors overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <Badge className={`mb-2 text-xs ${getCategoryBadgeClass(extra.category)}`}>
                        {getCategoryLabel(extra.category)}
                      </Badge>
                      <h3 className="text-white font-semibold truncate">{extra.name}</h3>
                      {extra.description && (
                        <p className="text-slate-400 text-sm mt-1">{extra.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2 flex-shrink-0">
                      <button
                        className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
                        onClick={() => {
                          setEditingExtra(extra);
                          setExtraForm({
                            name: extra.name,
                            category: extra.category || "extra_kulso",
                            price: extra.price || 0,
                            min_price: extra.min_price || 0,
                            description: extra.description || "",
                            location: extra.location || null
                          });
                          setIsNewExtraOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md"
                        onClick={() => handleDeleteExtra(extra.service_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {extra.location && (
                    <Badge variant="outline" className="border-green-500/40 text-green-400 text-xs mb-3">
                      <MapPin className="w-3 h-3 mr-1" />{extra.location}
                    </Badge>
                  )}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                    <span className="text-xl font-bold text-blue-400">
                      {extra.min_price ? `${extra.min_price.toLocaleString()} Ft-tól` : `${(extra.price || 0).toLocaleString()} Ft`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {extras.length === 0 && (
            <div className="text-center text-slate-500 py-12">
              <Plus className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Nincs extra szolgáltatás</p>
              <p className="text-sm mt-1">Adj hozzá extra szolgáltatásokat a Booking oldalhoz</p>
            </div>
          )}
        </TabsContent>

        {/* Polírozás Tab */}
        <TabsContent value="poliroz" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg text-white font-semibold flex items-center gap-2">
                  ✨ Polírozási szolgáltatások
                  <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-normal">Debrecen</span>
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  A polírozási árak automatikusan szinkronizálva vannak a Debreceni booking oldallal.
                  Új polírozás típust az alábbi gombbal hozhatsz létre.
                </p>
              </div>
              <Button
                className="bg-amber-600 hover:bg-amber-500"
                onClick={() => {
                  resetPolishTypeForm();
                  setIsNewPolishTypeOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Új polírozás típus
              </Button>
            </div>

            {/* Polishing type card grid */}
            <div>
              <h3 className="text-white font-medium mb-3 text-sm text-slate-300">Polírozás típusok</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(polishTypes).map(([typeKey, typeData]) => {
                  const prices = typeData.prices || {};
                  const priceValues = Object.values(prices).map(Number).filter(v => v > 0);
                  const minP = priceValues.length ? Math.min(...priceValues) : 0;
                  const maxP = priceValues.length ? Math.max(...priceValues) : 0;
                  const isDbRecord = !!typeData._db && !!typeData.service_id;
                  return (
                    <Card
                      key={typeKey}
                      className="bg-slate-900/80 border-slate-800 rounded-xl hover:border-amber-500/30 transition-colors overflow-hidden"
                    >
                      <div className="h-1 bg-gradient-to-r from-amber-500 to-yellow-400" />
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold truncate">{typeData.name}</h3>
                            {typeData.description && (
                              <p className="text-slate-400 text-xs mt-0.5">{typeData.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2 flex-shrink-0">
                            <button
                              className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
                              title={isDbRecord ? "Szerkesztés" : "Szerkesztés (mentés DB-be)"}
                              onClick={() => openEditPolishType(typeKey, typeData)}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {isDbRecord && (
                              <button
                                className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md"
                                onClick={() => handleDeletePolishType(typeData.service_id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          {typeData.duration_label && (
                            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                              <Clock className="w-3 h-3 mr-1" />{typeData.duration_label}
                            </Badge>
                          )}
                          {typeData.location && (
                            <Badge variant="outline" className="border-green-500/40 text-green-400 text-xs">
                              <MapPin className="w-3 h-3 mr-1" />{typeData.location}
                            </Badge>
                          )}
                          {!isDbRecord && (
                            <Badge className="bg-amber-700/30 text-amber-400 text-xs" title="Szerkesztés DB-be menti">Beépített</Badge>
                          )}
                        </div>
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                          {minP > 0 && (
                            <span className="text-amber-400 font-bold text-lg">
                              {minP === maxP
                                ? `${minP.toLocaleString()} Ft`
                                : `${minP.toLocaleString()} – ${maxP.toLocaleString()} Ft`}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {Object.keys(polishTypes).length === 0 && (
                  <div className="col-span-full text-center py-8 text-slate-500 text-sm">
                    Nincsenek polírozás típusok betöltve
                  </div>
                )}
              </div>
            </div>

          </div>
        </TabsContent>
      </Tabs>

      {/* New/Edit Extra Dialog */}
      <Dialog open={isNewExtraOpen} onOpenChange={setIsNewExtraOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-400">
              {editingExtra ? "Extra szerkesztése" : "Új extra szolgáltatás"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Név</Label>
              <Input
                value={extraForm.name}
                onChange={(e) => setExtraForm({...extraForm, name: e.target.value})}
                className="bg-slate-950 border-slate-700 text-white"
                placeholder="pl. Bőrápolás"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300">Ár (Ft)</Label>
                <Input
                  type="number"
                  value={extraForm.price}
                  onChange={(e) => setExtraForm({...extraForm, price: parseFloat(e.target.value) || 0})}
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Min. ár (Ft-tól)</Label>
                <Input
                  type="number"
                  value={extraForm.min_price}
                  onChange={(e) => setExtraForm({...extraForm, min_price: parseFloat(e.target.value) || 0})}
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Telephely</Label>
              <select
                value={extraForm.location || ""}
                onChange={(e) => setExtraForm({...extraForm, location: e.target.value || null})}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-md px-3 py-2"
              >
                <option value="">Mindenhol</option>
                <option value="Debrecen">Debrecen</option>
                <option value="Budapest">Budapest</option>
              </select>
            </div>
            <div>
              <Label className="text-slate-300">Leírás</Label>
              <Input
                value={extraForm.description}
                onChange={(e) => setExtraForm({...extraForm, description: e.target.value})}
                className="bg-slate-950 border-slate-700 text-white"
                placeholder="Opcionális leírás"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewExtraOpen(false)} className="border-slate-700">Mégse</Button>
            <Button onClick={handleExtraSubmit} className="bg-blue-600 hover:bg-blue-500">
              {editingExtra ? "Mentés" : "Létrehozás"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteServiceId} onOpenChange={() => setDeleteServiceId(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Szolgáltatás törlése</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400">Biztosan törölni szeretnéd ezt a szolgáltatást?</p>
          <p className="text-white font-medium">
            {services.find(s => s.service_id === deleteServiceId)?.name}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteServiceId(null)} className="border-slate-700">
              Mégse
            </Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteServiceId)} className="bg-red-600 hover:bg-red-700">
              Törlés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Promotion Dialog */}
      <Dialog open={!!deletePromoId} onOpenChange={() => setDeletePromoId(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Akció törlése</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400">Biztosan törölni szeretnéd ezt az akciót?</p>
          <p className="text-white font-medium">
            {promotions.find(p => p.id === deletePromoId)?.name}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletePromoId(null)} className="border-slate-700">
              Mégse
            </Button>
            <Button variant="destructive" onClick={() => handleDeletePromo(deletePromoId)} className="bg-red-600 hover:bg-red-700">
              Törlés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
