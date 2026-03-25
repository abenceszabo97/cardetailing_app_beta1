import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
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
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Car, 
  Calendar, 
  TrendingUp, 
  Plus,
  Clock,
  User,
  MapPin,
  CreditCard,
  Wallet,
  Image,
  X,
  Upload,
  ZoomIn,
  Camera,
  Check,
  ArrowLeftRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";
import { hu } from "date-fns/locale";

// Image slot definitions
const IMAGE_SLOTS_BEFORE = [
  { id: "kulter_elol_jobb", label: "Kültér Előlről jobboldal", category: "kulter" },
  { id: "kulter_elol_bal", label: "Kültér Elől baloldal", category: "kulter" },
  { id: "kulter_hatul_jobb", label: "Kültér Hátul jobboldal", category: "kulter" },
  { id: "kulter_hatul_bal", label: "Kültér Hátul baloldal", category: "kulter" },
  { id: "belter_elol_bal", label: "Beltér elől baloldal", category: "belter" },
  { id: "belter_elol_jobb", label: "Beltér elől jobboldal", category: "belter" },
  { id: "belter_hatul_bal", label: "Beltér hátul baloldal", category: "belter" },
  { id: "belter_hatul_jobb", label: "Beltér hátul jobboldal", category: "belter" },
];

const IMAGE_SLOTS_AFTER = [
  { id: "elol_jobb", label: "Előlről jobboldal", category: "kulter", matchBefore: "kulter_elol_jobb" },
  { id: "elol_bal", label: "Elől baloldal", category: "kulter", matchBefore: "kulter_elol_bal" },
  { id: "hatul_jobb", label: "Hátul jobboldal", category: "kulter", matchBefore: "kulter_hatul_jobb" },
  { id: "hatul_bal", label: "Hátul baloldal", category: "kulter", matchBefore: "kulter_hatul_bal" },
  { id: "belter_elol_bal", label: "Beltér elől baloldal", category: "belter", matchBefore: "belter_elol_bal" },
  { id: "belter_elol_jobb", label: "Beltér elől jobboldal", category: "belter", matchBefore: "belter_elol_jobb" },
  { id: "belter_hatul_bal", label: "Beltér hátul baloldal", category: "belter", matchBefore: "belter_hatul_bal" },
  { id: "belter_hatul_jobb", label: "Beltér hátul jobboldal", category: "belter", matchBefore: "belter_hatul_jobb" },
];

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ 
    today_cars: 0, today_revenue: 0, today_cash: 0, today_card: 0,
    month_cars: 0, month_revenue: 0, month_cash: 0, month_card: 0 
  });
  const [todayJobs, setTodayJobs] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [isNewJobOpen, setIsNewJobOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(null); // slot id being uploaded
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [imageViewMode, setImageViewMode] = useState("slots"); // slots or comparison
  
  const fileInputRef = useRef(null);
  const [currentUploadSlot, setCurrentUploadSlot] = useState(null);
  
  const [newJob, setNewJob] = useState({
    customer_id: "",
    service_id: "",
    worker_id: "",
    price: 0,
    location: "Debrecen",
    date: new Date().toISOString().slice(0, 16),
    notes: ""
  });

  const fetchData = async () => {
    try {
      const locationParam = selectedLocation !== "all" ? `?location=${selectedLocation}` : "";
      
      const [statsRes, jobsRes, dailyRes, customersRes, servicesRes, workersRes] = await Promise.all([
        axios.get(`${API}/stats/dashboard${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/jobs/today${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/stats/daily${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/customers`, { withCredentials: true }),
        axios.get(`${API}/services`, { withCredentials: true }),
        axios.get(`${API}/workers${locationParam}`, { withCredentials: true })
      ]);

      setStats(statsRes.data);
      setTodayJobs(jobsRes.data);
      setDailyStats(dailyRes.data);
      setCustomers(customersRes.data);
      setServices(servicesRes.data);
      setWorkers(workersRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Hiba az adatok betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedLocation]);

  useEffect(() => {
    if (selectedJob) {
      const updatedJob = todayJobs.find(j => j.job_id === selectedJob.job_id);
      if (updatedJob) setSelectedJob(updatedJob);
    }
  }, [todayJobs]);

  const handleCreateJob = async () => {
    try {
      let customerId = newJob.customer_id;
      let customerName = "";
      let plateNumber = "";
      let phone = "";
      let email = "";
      let carType = "";
      
      // If creating new customer
      if (newJob.isNewCustomer) {
        if (!newJob.newCustomerName || !newJob.newCustomerPlate) {
          toast.error("Név és rendszám megadása kötelező!");
          return;
        }
        
        // Create new customer first
        const customerData = {
          name: newJob.newCustomerName,
          plate_number: newJob.newCustomerPlate.toUpperCase(),
          phone: newJob.newCustomerPhone || "",
          email: newJob.newCustomerEmail || "",
          car_type: newJob.newCustomerCarType || "",
          location: newJob.location
        };
        
        const customerRes = await axios.post(`${API}/customers`, customerData, { withCredentials: true });
        customerId = customerRes.data.customer_id;
        customerName = newJob.newCustomerName;
        plateNumber = newJob.newCustomerPlate.toUpperCase();
        phone = newJob.newCustomerPhone || "";
        email = newJob.newCustomerEmail || "";
        carType = newJob.newCustomerCarType || "";
        toast.success("Új ügyfél létrehozva!");
      } else {
        // Get existing customer data
        const customer = customers.find(c => c.customer_id === customerId);
        if (customer) {
          customerName = customer.name;
          plateNumber = customer.plate_number;
          phone = customer.phone || "";
          email = customer.email || "";
          carType = customer.car_type || "";
        }
      }
      
      // Create job with customer data
      const jobData = {
        customer_id: customerId,
        service_id: newJob.service_id,
        worker_id: newJob.worker_id,
        price: newJob.price,
        location: newJob.location,
        date: newJob.date,
        notes: newJob.notes,
        time_slot: newJob.date ? newJob.date.split("T")[1]?.slice(0, 5) : null,
        // Include customer info for display
        phone: phone,
        email: email,
        car_type: carType
      };
      
      await axios.post(`${API}/jobs`, jobData, { withCredentials: true });
      toast.success("Munka sikeresen létrehozva!");
      setIsNewJobOpen(false);
      setNewJob({ 
        customer_id: "", service_id: "", worker_id: "", price: 0, 
        location: "Debrecen", date: new Date().toISOString().slice(0, 16), notes: "",
        isNewCustomer: false, newCustomerName: "", newCustomerPlate: "",
        newCustomerPhone: "", newCustomerEmail: "", newCustomerCarType: "",
        customerSearch: ""
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a munka létrehozásakor");
    }
  };

  const handleUpdateJobStatus = async (jobId, status, paymentMethod = null) => {
    try {
      const updateData = { status };
      if (paymentMethod) updateData.payment_method = paymentMethod;
      await axios.put(`${API}/jobs/${jobId}`, updateData, { withCredentials: true });
      toast.success("Státusz frissítve!");
      fetchData();
    } catch (error) {
      toast.error("Hiba a státusz frissítésekor");
    }
  };

  const handleSlotUploadClick = (slotId, type) => {
    setCurrentUploadSlot({ slotId, type });
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedJob || !currentUploadSlot) return;
    
    e.target.value = '';
    
    const { slotId, type } = currentUploadSlot;
    const job = todayJobs.find(j => j.job_id === selectedJob.job_id);
    
    setUploading(slotId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Use the new Cloudinary-based upload endpoint with entity context
      const uploadRes = await axios.post(
        `${API}/files/upload?entity_type=job&entity_id=${selectedJob.job_id}`, 
        formData, 
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      
      const imageUrl = uploadRes.data.url;
      const currentImages = type === 'before' 
        ? (job?.images_before || {})
        : (job?.images_after || {});
      
      // Convert array to object if needed (backwards compatibility)
      const imagesObj = Array.isArray(currentImages) ? {} : { ...currentImages };
      imagesObj[slotId] = imageUrl;
      
      await axios.put(`${API}/jobs/${selectedJob.job_id}`, {
        [type === 'before' ? 'images_before' : 'images_after']: imagesObj
      }, { withCredentials: true });
      
      // Update selectedJob with new image
      setSelectedJob(prev => ({
        ...prev,
        [type === 'before' ? 'images_before' : 'images_after']: imagesObj
      }));
      
      toast.success("Kép feltöltve!");
      fetchData();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.detail || "Hiba a kép feltöltésekor");
    } finally {
      setUploading(null);
      setCurrentUploadSlot(null);
    }
  };

  const handleRemoveImage = async (jobId, type, slotId) => {
    const job = todayJobs.find(j => j.job_id === jobId);
    if (!job) return;
    
    const currentImages = type === 'before' 
      ? (job.images_before || {})
      : (job.images_after || {});
    
    // Convert array to object if needed
    const imagesObj = Array.isArray(currentImages) ? {} : { ...currentImages };
    delete imagesObj[slotId];
    
    try {
      await axios.put(`${API}/jobs/${jobId}`, {
        [type === 'before' ? 'images_before' : 'images_after']: imagesObj
      }, { withCredentials: true });
      toast.success("Kép törölve!");
      fetchData();
    } catch (error) {
      toast.error("Hiba a kép törlésekor");
    }
  };

  const getImageCount = (job) => {
    const beforeCount = job?.images_before 
      ? (Array.isArray(job.images_before) ? job.images_before.length : Object.keys(job.images_before).length)
      : 0;
    const afterCount = job?.images_after 
      ? (Array.isArray(job.images_after) ? job.images_after.length : Object.keys(job.images_after).length)
      : 0;
    return beforeCount + afterCount;
  };

  const getSlotImage = (job, type, slotId) => {
    const images = type === 'before' ? job?.images_before : job?.images_after;
    if (!images) return null;
    if (Array.isArray(images)) return null; // Old format
    const imageUrl = images[slotId];
    if (!imageUrl) return null;
    
    // Handle relative URLs (old format: /api/images/img_xxx)
    if (imageUrl.startsWith('/api/')) {
      return `${API.replace('/api', '')}${imageUrl}`;
    }
    // Handle full Cloudinary URLs
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    // Otherwise prepend API base
    return `${API.replace('/api', '')}${imageUrl}`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      kesz: { label: "Kész", className: "status-kesz" },
      folyamatban: { label: "Folyamatban", className: "status-folyamatban" },
      foglalt: { label: "Foglalt", className: "status-foglalt" },
      nem_jott_el: { label: "Nem jött el", className: "bg-red-500/20 text-red-400 border border-red-500/30" },
      lemondta: { label: "Lemondva", className: "bg-orange-500/20 text-orange-400 border border-orange-500/30" }
    };
    const config = statusConfig[status] || statusConfig.foglalt;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleServiceChange = (serviceId) => {
    const service = services.find(s => s.service_id === serviceId);
    setNewJob({ ...newJob, service_id: serviceId, price: service?.price || 0 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Manrope']">Főoldal</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">Üdvözöljük, {user?.name}!</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[140px] sm:w-[180px] bg-slate-900 border-slate-700 text-white text-sm" data-testid="dashboard-location-select">
              <MapPin className="w-4 h-4 mr-1 sm:mr-2 text-green-400" />
              <SelectValue placeholder="Telephely" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-white">Összes</SelectItem>
              <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={isNewJobOpen} onOpenChange={setIsNewJobOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-500" data-testid="new-job-btn">
                <Plus className="w-4 h-4 mr-2" />
                Új munka
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-['Manrope']">Új munka létrehozása</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Customer Selection or New Customer */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-slate-300">Ügyfél</Label>
                    <button 
                      type="button"
                      onClick={() => setNewJob({...newJob, isNewCustomer: !newJob.isNewCustomer, customer_id: ""})}
                      className="text-xs text-green-400 hover:text-green-300"
                    >
                      {newJob.isNewCustomer ? "← Meglévő ügyfél" : "+ Új ügyfél"}
                    </button>
                  </div>
                  
                  {newJob.isNewCustomer ? (
                    <div className="space-y-3 p-3 bg-slate-950/50 rounded-lg border border-slate-700">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-slate-400">Név *</Label>
                          <Input 
                            value={newJob.newCustomerName || ""} 
                            onChange={(e) => setNewJob({...newJob, newCustomerName: e.target.value})}
                            className="bg-slate-950 border-slate-700 text-white h-9"
                            placeholder="Ügyfél neve"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400">Rendszám *</Label>
                          <Input 
                            value={newJob.newCustomerPlate || ""} 
                            onChange={(e) => setNewJob({...newJob, newCustomerPlate: e.target.value.toUpperCase()})}
                            className="bg-slate-950 border-slate-700 text-white h-9 uppercase font-mono"
                            placeholder="ABC-123"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-slate-400">Telefon</Label>
                          <Input 
                            value={newJob.newCustomerPhone || ""} 
                            onChange={(e) => setNewJob({...newJob, newCustomerPhone: e.target.value})}
                            className="bg-slate-950 border-slate-700 text-white h-9"
                            placeholder="+36 30 123 4567"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400">Email</Label>
                          <Input 
                            value={newJob.newCustomerEmail || ""} 
                            onChange={(e) => setNewJob({...newJob, newCustomerEmail: e.target.value})}
                            className="bg-slate-950 border-slate-700 text-white h-9"
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-400">Autó típusa</Label>
                        <Input 
                          value={newJob.newCustomerCarType || ""} 
                          onChange={(e) => setNewJob({...newJob, newCustomerCarType: e.target.value})}
                          className="bg-slate-950 border-slate-700 text-white h-9"
                          placeholder="pl. VW Golf"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        placeholder="Keresés név vagy rendszám alapján..."
                        value={newJob.customerSearch || ""}
                        onChange={(e) => setNewJob({...newJob, customerSearch: e.target.value})}
                        className="bg-slate-950 border-slate-700 text-white mb-2"
                      />
                      <Select value={newJob.customer_id} onValueChange={(v) => setNewJob({...newJob, customer_id: v})}>
                        <SelectTrigger className="bg-slate-950 border-slate-700">
                          <SelectValue placeholder="Válassz ügyfelet" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                          {customers
                            .filter(c => {
                              const search = (newJob.customerSearch || "").toLowerCase();
                              if (!search) return true;
                              return c.name?.toLowerCase().includes(search) || 
                                     c.plate_number?.toLowerCase().includes(search);
                            })
                            .map(c => (
                              <SelectItem key={c.customer_id} value={c.customer_id} className="text-white">
                                {c.name} - {c.plate_number}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-slate-300">Szolgáltatás</Label>
                  <Select value={newJob.service_id} onValueChange={handleServiceChange}>
                    <SelectTrigger className="bg-slate-950 border-slate-700">
                      <SelectValue placeholder="Válassz szolgáltatást" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                      {services.map(s => (
                        <SelectItem key={s.service_id} value={s.service_id} className="text-white">
                          {s.name} - {s.price.toLocaleString()} Ft
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Dolgozó</Label>
                  <Select value={newJob.worker_id} onValueChange={(v) => setNewJob({...newJob, worker_id: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700">
                      <SelectValue placeholder="Válassz dolgozót" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {workers.map(w => (
                        <SelectItem key={w.worker_id} value={w.worker_id} className="text-white">{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Ár (Ft)</Label>
                    <Input type="number" value={newJob.price} onChange={(e) => setNewJob({...newJob, price: parseInt(e.target.value) || 0})} className="bg-slate-950 border-slate-700 text-white" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Telephely</Label>
                    <Select value={newJob.location} onValueChange={(v) => setNewJob({...newJob, location: v})}>
                      <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Dátum és idő</Label>
                  <Input type="datetime-local" value={newJob.date} onChange={(e) => setNewJob({...newJob, date: e.target.value})} className="bg-slate-950 border-slate-700 text-white" />
                </div>
                <div>
                  <Label className="text-slate-300">Megjegyzés</Label>
                  <Input value={newJob.notes} onChange={(e) => setNewJob({...newJob, notes: e.target.value})} className="bg-slate-950 border-slate-700 text-white" placeholder="Opcionális..." />
                </div>
                <Button 
                  onClick={handleCreateJob} 
                  className="w-full bg-green-600 hover:bg-green-500" 
                  disabled={
                    (!newJob.isNewCustomer && !newJob.customer_id) || 
                    (newJob.isNewCustomer && (!newJob.newCustomerName || !newJob.newCustomerPlate)) ||
                    !newJob.service_id
                  }
                >
                  Létrehozás
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        <Card className="glass-card kpi-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-slate-400">Mai autók</p>
                <p className="text-xl sm:text-2xl font-bold text-white mt-1">{stats.today_cars}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Car className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card kpi-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-slate-400">Mai készpénz</p>
                <p className="text-lg sm:text-2xl font-bold text-green-400 mt-1">{(stats.today_cash || 0).toLocaleString()}<span className="text-xs sm:text-sm"> Ft</span></p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card kpi-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-slate-400">Mai kártya</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-400 mt-1">{(stats.today_card || 0).toLocaleString()}<span className="text-xs sm:text-sm"> Ft</span></p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card kpi-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-slate-400">Havi autók</p>
                <p className="text-xl sm:text-2xl font-bold text-white mt-1">{stats.month_cars}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card kpi-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-slate-400">Havi készpénz</p>
                <p className="text-lg sm:text-2xl font-bold text-green-400 mt-1">{(stats.month_cash || 0).toLocaleString()}<span className="text-xs sm:text-sm"> Ft</span></p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card kpi-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-slate-400">Havi kártya</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-400 mt-1">{(stats.month_card || 0).toLocaleString()}<span className="text-xs sm:text-sm"> Ft</span></p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-xl text-white font-['Manrope'] flex items-center justify-between">
                <span>Mai munkák</span>
                <div className="flex items-center gap-2 text-sm font-normal">
                  <Badge variant="outline" className="border-slate-600 text-slate-400">
                    {todayJobs.length} munka
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayJobs.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nincs mai munka</p>
                </div>
              ) : (
                /* Worker-based view - 2 columns */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workers.slice(0, 2).map((worker) => {
                    const workerJobs = todayJobs.filter(j => j.worker_id === worker.worker_id || j.worker_name === worker.name);
                    const unassignedJobs = todayJobs.filter(j => !j.worker_id && !j.worker_name);
                    
                    return (
                      <div key={worker.worker_id} className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                        {/* Worker header */}
                        <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-b border-slate-700 px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-400" />
                              </div>
                              <span className="text-white font-semibold">{worker.name}</span>
                            </div>
                            <Badge className="bg-slate-800 text-slate-300">
                              {workerJobs.length} munka
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Worker jobs */}
                        <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                          {workerJobs.length === 0 ? (
                            <div className="text-center py-4 text-slate-500 text-sm">
                              Nincs hozzárendelt munka
                            </div>
                          ) : (
                            workerJobs.map((job) => (
                              <div key={job.job_id} className="bg-slate-950/50 rounded-lg p-3 border border-slate-800 hover:border-green-500/30 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-white text-sm">{job.plate_number}</span>
                                      {getStatusBadge(job.status)}
                                    </div>
                                    <p className="text-slate-400 text-xs mt-1 truncate">{job.customer_name}</p>
                                    <p className="text-slate-500 text-xs truncate">{job.service_name}</p>
                                    {job.time_slot && (
                                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                        <Clock className="w-3 h-3" />
                                        {job.time_slot}
                                      </div>
                                    )}
                                    {job.car_type && (
                                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                        <Car className="w-3 h-3" />
                                        {job.car_type}
                                      </div>
                                    )}
                                    {job.phone && (
                                      <div className="text-xs text-slate-500 mt-1">📞 {job.phone}</div>
                                    )}
                                  </div>
                                  <div className="text-right flex flex-col items-end gap-1">
                                    <span className="text-green-400 font-semibold text-sm">{job.price?.toLocaleString()} Ft</span>
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-slate-400 hover:text-white px-2" onClick={() => { setSelectedJob(job); setImageDialogOpen(true); }}>
                                      <Image className="w-3 h-3 mr-1" />
                                      {getImageCount(job)}
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Status actions */}
                                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-800">
                                  {job.status === "foglalt" && (
                                    <>
                                      <Button size="sm" variant="outline" className="h-7 text-xs border-green-500/50 text-green-400 hover:bg-green-500/10" onClick={() => handleUpdateJobStatus(job.job_id, "folyamatban")}>
                                        <Clock className="w-3 h-3 mr-1" />Indít
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={() => handleUpdateJobStatus(job.job_id, "nem_jott_el")}>
                                        ❌ Nem jött
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-7 text-xs border-orange-500/50 text-orange-400 hover:bg-orange-500/10" onClick={() => handleUpdateJobStatus(job.job_id, "lemondta")}>
                                        🚫 Lemondta
                                      </Button>
                                    </>
                                  )}
                                  {job.status === "folyamatban" && (
                                    <>
                                      <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-500" onClick={() => handleUpdateJobStatus(job.job_id, "kesz", "keszpenz")}>
                                        <Wallet className="w-3 h-3 mr-1" />Készpénz
                                      </Button>
                                      <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-500" onClick={() => handleUpdateJobStatus(job.job_id, "kesz", "kartya")}>
                                        <CreditCard className="w-3 h-3 mr-1" />Kártya
                                      </Button>
                                    </>
                                  )}
                                  {job.status === "kesz" && job.payment_method && (
                                    <Badge className={job.payment_method === "keszpenz" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}>
                                      {job.payment_method === "keszpenz" ? "💵 Készpénz" : "💳 Kártya"}
                                    </Badge>
                                  )}
                                  {job.status === "nem_jott_el" && (
                                    <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
                                      ❌ Nem jelent meg
                                    </Badge>
                                  )}
                                  {job.status === "lemondta" && (
                                    <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                      🚫 Lemondva
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Unassigned jobs section - if there are any */}
                  {todayJobs.filter(j => !j.worker_id && !j.worker_name).length > 0 && (
                    <div className="md:col-span-2 bg-slate-900/50 rounded-xl border border-orange-500/30 overflow-hidden">
                      <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-b border-orange-500/30 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-orange-500/30 flex items-center justify-center">
                              <User className="w-4 h-4 text-orange-400" />
                            </div>
                            <span className="text-white font-semibold">Hozzárendelésre vár</span>
                          </div>
                          <Badge className="bg-orange-500/20 text-orange-300">
                            {todayJobs.filter(j => !j.worker_id && !j.worker_name).length} munka
                          </Badge>
                        </div>
                      </div>
                      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {todayJobs.filter(j => !j.worker_id && !j.worker_name).map((job) => (
                          <div key={job.job_id} className="bg-slate-950/50 rounded-lg p-3 border border-slate-800 hover:border-orange-500/30 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-white text-sm">{job.plate_number}</span>
                                  {getStatusBadge(job.status)}
                                </div>
                                <p className="text-slate-400 text-xs mt-1">{job.customer_name}</p>
                                <p className="text-slate-500 text-xs">{job.service_name}</p>
                                {job.time_slot && (
                                  <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    {job.time_slot}
                                  </div>
                                )}
                                {job.car_type && (
                                  <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                    <Car className="w-3 h-3" />
                                    {job.car_type}
                                  </div>
                                )}
                                {job.phone && (
                                  <div className="text-xs text-slate-500 mt-1">📞 {job.phone}</div>
                                )}
                              </div>
                              <div className="text-right flex flex-col items-end gap-1">
                                <span className="text-green-400 font-semibold text-sm">{job.price?.toLocaleString()} Ft</span>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-slate-400 hover:text-white px-2" onClick={() => { setSelectedJob(job); setImageDialogOpen(true); }}>
                                  <Image className="w-3 h-3 mr-1" />
                                  {getImageCount(job)}
                                </Button>
                              </div>
                            </div>
                            
                            {/* Status actions */}
                            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-800">
                              {job.status === "foglalt" && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 text-xs border-green-500/50 text-green-400 hover:bg-green-500/10" onClick={() => handleUpdateJobStatus(job.job_id, "folyamatban")}>
                                    <Clock className="w-3 h-3 mr-1" />Indít
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={() => handleUpdateJobStatus(job.job_id, "nem_jott_el")}>
                                    ❌ Nem jött
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs border-orange-500/50 text-orange-400 hover:bg-orange-500/10" onClick={() => handleUpdateJobStatus(job.job_id, "lemondta")}>
                                    🚫 Lemondta
                                  </Button>
                                </>
                              )}
                              {job.status === "folyamatban" && (
                                <>
                                  <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-500" onClick={() => handleUpdateJobStatus(job.job_id, "kesz", "keszpenz")}>
                                    <Wallet className="w-3 h-3 mr-1" />Készpénz
                                  </Button>
                                  <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-500" onClick={() => handleUpdateJobStatus(job.job_id, "kesz", "kartya")}>
                                    <CreditCard className="w-3 h-3 mr-1" />Kártya
                                  </Button>
                                </>
                              )}
                              {job.status === "kesz" && job.payment_method && (
                                <Badge className={job.payment_method === "keszpenz" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}>
                                  {job.payment_method === "keszpenz" ? "💵 Készpénz" : "💳 Kártya"}
                                </Badge>
                              )}
                              {job.status === "nem_jott_el" && (
                                <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
                                  ❌ Nem jelent meg
                                </Badge>
                              )}
                              {job.status === "lemondta" && (
                                <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                  🚫 Lemondva
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-xl text-white font-['Manrope']">Havi grafikon</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyStats.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nincs adat</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(value) => format(new Date(value), 'MM/dd')} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} labelFormatter={(value) => format(new Date(value), 'yyyy. MMMM d.', { locale: hu })} />
                    <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} name="Autók" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileSelected}
      />

      {/* Image Dialog with Named Slots */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-['Manrope'] flex items-center gap-2">
              <Camera className="w-5 h-5 text-green-400" />
              Képek - {selectedJob?.plate_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedJob && (
            <div className="mt-4">
              {/* View Mode Tabs */}
              <Tabs value={imageViewMode} onValueChange={setImageViewMode} className="w-full">
                <TabsList className="bg-slate-800 border border-slate-700 mb-4">
                  <TabsTrigger value="slots" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                    <Upload className="w-4 h-4 mr-2" />
                    Feltöltés
                  </TabsTrigger>
                  <TabsTrigger value="comparison" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                    Előtte-Utána
                  </TabsTrigger>
                </TabsList>

                {/* Slots Upload View */}
                <TabsContent value="slots" className="space-y-6">
                  {/* Before Images */}
                  <div>
                    <Label className="text-slate-300 text-lg font-semibold flex items-center gap-2 mb-4">
                      <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                      Előtte képek
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {IMAGE_SLOTS_BEFORE.map((slot) => {
                        const imageUrl = getSlotImage(selectedJob, 'before', slot.id);
                        return (
                          <div key={slot.id} className="relative">
                            <div className={`aspect-[4/3] rounded-lg border-2 border-dashed ${imageUrl ? 'border-green-500/50 bg-green-500/5' : 'border-slate-600 bg-slate-800/50'} overflow-hidden`}>
                              {imageUrl ? (
                                <div className="relative w-full h-full group cursor-pointer" onClick={() => setFullscreenImage(imageUrl)}>
                                  <img 
                                    src={imageUrl} 
                                    alt={slot.label} 
                                    className="w-full h-full object-contain bg-slate-900"
                                    onError={(e) => { e.target.onerror = null; e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="75"><rect fill="%23374151" width="100" height="75"/><text x="50%" y="50%" fill="%239CA3AF" font-size="10" text-anchor="middle" dy=".3em">Hiba</text></svg>'; }}
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                                    <button onClick={(e) => { e.stopPropagation(); setFullscreenImage(imageUrl); }} className="p-2 bg-white/20 rounded-full hover:bg-white/30 pointer-events-auto">
                                      <ZoomIn className="w-4 h-4 text-white" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(selectedJob.job_id, 'before', slot.id); }} className="p-2 bg-red-500/80 rounded-full hover:bg-red-500 pointer-events-auto">
                                      <X className="w-4 h-4 text-white" />
                                    </button>
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 pointer-events-none">
                                    <Check className="w-3 h-3 text-green-400 inline mr-1" />
                                    <span className="text-[10px] text-white">{slot.label}</span>
                                  </div>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => handleSlotUploadClick(slot.id, 'before')}
                                  disabled={uploading === slot.id}
                                  className="w-full h-full flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
                                >
                                  {uploading === slot.id ? (
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-500 border-t-green-400" />
                                  ) : (
                                    <>
                                      <Camera className="w-6 h-6 mb-1" />
                                      <span className="text-[10px] text-center px-1">{slot.label}</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* After Images */}
                  <div>
                    <Label className="text-slate-300 text-lg font-semibold flex items-center gap-2 mb-4">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      Utána képek
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {IMAGE_SLOTS_AFTER.map((slot) => {
                        const imageUrl = getSlotImage(selectedJob, 'after', slot.id);
                        return (
                          <div key={slot.id} className="relative">
                            <div className={`aspect-[4/3] rounded-lg border-2 border-dashed ${imageUrl ? 'border-green-500/50 bg-green-500/5' : 'border-slate-600 bg-slate-800/50'} overflow-hidden`}>
                              {imageUrl ? (
                                <div className="relative w-full h-full group cursor-pointer" onClick={() => setFullscreenImage(imageUrl)}>
                                  <img 
                                    src={imageUrl} 
                                    alt={slot.label} 
                                    className="w-full h-full object-contain bg-slate-900"
                                    onError={(e) => { e.target.onerror = null; e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="75"><rect fill="%23374151" width="100" height="75"/><text x="50%" y="50%" fill="%239CA3AF" font-size="10" text-anchor="middle" dy=".3em">Hiba</text></svg>'; }}
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                                    <button onClick={(e) => { e.stopPropagation(); setFullscreenImage(imageUrl); }} className="p-2 bg-white/20 rounded-full hover:bg-white/30 pointer-events-auto">
                                      <ZoomIn className="w-4 h-4 text-white" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(selectedJob.job_id, 'after', slot.id); }} className="p-2 bg-red-500/80 rounded-full hover:bg-red-500 pointer-events-auto">
                                      <X className="w-4 h-4 text-white" />
                                    </button>
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 pointer-events-none">
                                    <Check className="w-3 h-3 text-green-400 inline mr-1" />
                                    <span className="text-[10px] text-white">{slot.label}</span>
                                  </div>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => handleSlotUploadClick(slot.id, 'after')}
                                  disabled={uploading === slot.id}
                                  className="w-full h-full flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
                                >
                                  {uploading === slot.id ? (
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-500 border-t-green-400" />
                                  ) : (
                                    <>
                                      <Camera className="w-6 h-6 mb-1" />
                                      <span className="text-[10px] text-center px-1">{slot.label}</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                {/* Comparison View */}
                <TabsContent value="comparison" className="space-y-4">
                  <p className="text-slate-400 text-sm mb-4">Előtte és utána képek egymás mellett az összehasonlításhoz.</p>
                  
                  {IMAGE_SLOTS_AFTER.map((afterSlot) => {
                    const beforeSlot = IMAGE_SLOTS_BEFORE.find(s => s.id === afterSlot.matchBefore);
                    const beforeImage = beforeSlot ? getSlotImage(selectedJob, 'before', beforeSlot.id) : null;
                    const afterImage = getSlotImage(selectedJob, 'after', afterSlot.id);
                    
                    if (!beforeImage && !afterImage) return null;
                    
                    return (
                      <div key={afterSlot.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <h4 className="text-white font-medium mb-3">{afterSlot.label}</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Before */}
                          <div>
                            <p className="text-orange-400 text-xs mb-2 flex items-center gap-1">
                              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                              Előtte
                            </p>
                            {beforeImage ? (
                              <img 
                                src={beforeImage} 
                                alt={`Előtte - ${afterSlot.label}`} 
                                className="w-full aspect-[4/3] object-contain bg-slate-900 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setFullscreenImage(beforeImage)}
                              />
                            ) : (
                              <div className="w-full aspect-[4/3] bg-slate-700/50 rounded-lg flex items-center justify-center">
                                <span className="text-slate-500 text-sm">Nincs kép</span>
                              </div>
                            )}
                          </div>
                          
                          {/* After */}
                          <div>
                            <p className="text-green-400 text-xs mb-2 flex items-center gap-1">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              Utána
                            </p>
                            {afterImage ? (
                              <img 
                                src={afterImage} 
                                alt={`Utána - ${afterSlot.label}`} 
                                className="w-full aspect-[4/3] object-contain bg-slate-900 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setFullscreenImage(afterImage)}
                              />
                            ) : (
                              <div className="w-full aspect-[4/3] bg-slate-700/50 rounded-lg flex items-center justify-center">
                                <span className="text-slate-500 text-sm">Nincs kép</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Show message if no comparison images */}
                  {IMAGE_SLOTS_AFTER.every(slot => {
                    const beforeSlot = IMAGE_SLOTS_BEFORE.find(s => s.id === slot.matchBefore);
                    return !getSlotImage(selectedJob, 'before', beforeSlot?.id) && !getSlotImage(selectedJob, 'after', slot.id);
                  }) && (
                    <div className="text-center py-8 text-slate-400">
                      <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nincs még összehasonlítható kép</p>
                      <p className="text-sm mt-1">Tölts fel képeket a "Feltöltés" fülön</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Viewer - Improved */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center cursor-pointer" 
          onClick={() => setFullscreenImage(null)}
          style={{ pointerEvents: 'auto' }}
        >
          <button 
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-[10000] cursor-pointer" 
            onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); }}
          >
            <X className="w-8 h-8 text-white" />
          </button>
          <div className="w-full h-full p-4 flex items-center justify-center">
            <img 
              src={fullscreenImage} 
              alt="Teljes méret" 
              className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl cursor-default" 
              onClick={(e) => e.stopPropagation()} 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23374151" width="200" height="200"/><text x="50%" y="50%" fill="%239CA3AF" font-size="14" text-anchor="middle" dy=".3em">Kép nem elérhető</text></svg>';
              }}
            />
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm pointer-events-none">
            Kattints bárhová a bezáráshoz
          </div>
        </div>
      )}
    </div>
  );
};
