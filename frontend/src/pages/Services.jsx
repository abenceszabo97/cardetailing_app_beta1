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
  Pencil
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
    name: "", category: "extra_kulso", price: 0, min_price: 0, description: "", location: null
  });
  
  const [formData, setFormData] = useState({
    name: "",
    category: "komplett",
    price: 0,
    duration: 60,
    description: "",
    car_size: "",
    package: ""
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
    active: true
  });

  const categories = [
    { value: "komplett", label: "Komplett" },
    { value: "kulso", label: "Külső" },
    { value: "belso", label: "Belső" },
    { value: "extra", label: "Extra" }
  ];

  const carSizes = ["S", "M", "L", "XL", "XXL"];
  const packages = ["Eco", "Pro", "VIP"];

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services`, { withCredentials: true });
      setServices(response.data);
    } catch (error) {
      toast.error("Hiba a szolgáltatások betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  const fetchPromotions = async () => {
    try {
      const response = await axios.get(`${API}/services/promotions/admin`, { withCredentials: true });
      setPromotions(response.data);
    } catch (error) {
      console.error("Promotions error:", error);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchPromotions();
    fetchExtras();
  }, []);

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
      setExtraForm({ name: "", category: "extra_kulso", price: 0, min_price: 0, description: "", location: null });
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
      fetchServices();
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
      package: ""
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
      active: true
    });
  };

  const handlePromoSubmit = async () => {
    try {
      if (editingPromo) {
        await axios.put(`${API}/services/promotions/${editingPromo.id}`, promoForm, { withCredentials: true });
        toast.success("Akció frissítve!");
      } else {
        await axios.post(`${API}/services/promotions`, promoForm, { withCredentials: true });
        toast.success("Akció létrehozva!");
      }
      setIsNewPromoOpen(false);
      setEditingPromo(null);
      resetPromoForm();
      fetchPromotions();
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
      active: promo.active !== false
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
      package: service.package || ""
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
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-[95vw] sm:max-w-lg">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Services by Category */}
      <Tabs defaultValue="promotions" className="w-full">
        <div className="overflow-x-auto pb-1">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 min-w-max">
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
        </TabsList>
        </div>

        {/* Promotions Tab */}
        <TabsContent value="promotions" className="mt-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
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
              <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl font-['Manrope']">
                    {editingPromo ? "Akció szerkesztése" : "Új akció létrehozása"}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <div className="flex flex-wrap gap-2 mt-2">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    {editingPromo ? "Mentés" : "Létrehozás"}
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
                  promo.active 
                    ? 'border-pink-500/50 hover:border-pink-500' 
                    : 'border-slate-800 opacity-60'
                }`}
              >
                <div className={`h-1 ${promo.active ? 'bg-gradient-to-r from-pink-500 to-orange-500' : 'bg-slate-700'}`} />
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={promo.active ? 'bg-pink-500/20 text-pink-400' : 'bg-slate-700 text-slate-500'}>
                          {promo.badge || '🎉 AKCIÓ'}
                        </Badge>
                        {!promo.active && (
                          <Badge className="bg-slate-700 text-slate-500">Inaktív</Badge>
                        )}
                      </div>
                      <h3 className="text-white font-semibold text-lg">{promo.name}</h3>
                      <p className="text-slate-400 text-sm">{promo.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
                        onClick={() => openEditPromoDialog(promo)}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md"
                        onClick={() => setDeletePromoId(promo.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
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
                        <div className="flex items-center gap-2 mt-1">
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-lg text-white font-semibold flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" />
              Extra szolgáltatások
            </h2>
            <Button
              onClick={() => {
                setExtraForm({ name: "", category: "extra_kulso", price: 0, min_price: 0, description: "", location: null });
                setEditingExtra(null);
                setIsNewExtraOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-500"
              data-testid="new-extra-btn"
            >
              <Plus className="w-4 h-4 mr-2" /> Új extra
            </Button>
          </div>

          {/* Extras List */}
          <div className="space-y-3">
            {extras.map(extra => (
              <Card key={extra.service_id} className="glass-card">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium">{extra.name}</h3>
                      {extra.location && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{extra.location}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">{extra.description || extra.category}</p>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="text-green-400 font-bold">
                      {extra.min_price ? `${extra.min_price.toLocaleString()} Ft-tól` : `${(extra.price || 0).toLocaleString()} Ft`}
                    </span>
                    <Button
                      variant="ghost" size="sm"
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
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => handleDeleteExtra(extra.service_id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {extras.length === 0 && (
              <div className="text-center text-slate-500 py-12">
                <Plus className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Nincs extra szolgáltatás</p>
                <p className="text-sm mt-1">Adj hozzá extra szolgáltatásokat a Booking oldalhoz</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* New/Edit Extra Dialog */}
      <Dialog open={isNewExtraOpen} onOpenChange={setIsNewExtraOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-[95vw] sm:max-w-md">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
