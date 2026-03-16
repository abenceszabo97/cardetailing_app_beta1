import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
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
  Car
} from "lucide-react";

export const Services = () => {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleteServiceId, setDeleteServiceId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    category: "komplett",
    price: 0,
    duration: 60,
    description: "",
    car_size: "",
    package: ""
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

  useEffect(() => {
    fetchServices();
  }, []);

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
    if (!window.confirm("Biztosan törölni szeretnéd ezt a szolgáltatást?")) return;
    
    try {
      await axios.delete(`${API}/services/${serviceId}`, { withCredentials: true });
      toast.success("Szolgáltatás törölve!");
      fetchServices();
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
    <div className="space-y-6" data-testid="services-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Manrope']">Szolgáltatások</h1>
          <p className="text-slate-400 mt-1">{services.length} szolgáltatás</p>
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
                <div className="grid grid-cols-3 gap-4">
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
      <Tabs defaultValue="komplett" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 p-1">
          {categories.map(cat => (
            <TabsTrigger 
              key={cat.value} 
              value={cat.value}
              className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
            >
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-white"
                            onClick={() => openEditDialog(service)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-400"
                            onClick={() => handleDelete(service.service_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
      </Tabs>
    </div>
  );
};
