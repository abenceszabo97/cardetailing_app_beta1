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
import { Textarea } from "../components/ui/textarea";
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
  ArrowLeftRight,
  Edit,
  FileText
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
  
  // Edit job state
  const [editingJob, setEditingJob] = useState(null);
  const [editJobData, setEditJobData] = useState({
    service_id: "",
    price: 0,
    notes: "",
    worker_id: ""
  });
  
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
      await axios.post(`${API}/jobs`, newJob, { withCredentials: true });
      toast.success("Munka sikeresen létrehozva!");
      setIsNewJobOpen(false);
      setNewJob({ customer_id: "", service_id: "", worker_id: "", price: 0, location: "Debrecen", date: new Date().toISOString().slice(0, 16), notes: "" });
      fetchData();
    } catch (error) {
      toast.error("Hiba a munka létrehozásakor");
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

  const handleEditJobOpen = (job) => {
    setEditingJob(job);
    setEditJobData({
      service_id: job.service_id || "",
      price: job.price || 0,
      notes: job.notes || "",
      worker_id: job.worker_id || ""
    });
  };

  const handleEditJobSave = async () => {
    if (!editingJob) return;
    try {
      const service = services.find(s => s.service_id === editJobData.service_id);
      const updateData = {
        service_id: editJobData.service_id,
        service_name: service?.name || editingJob.service_name,
        price: parseFloat(editJobData.price) || 0,
        notes: editJobData.notes,
        worker_id: editJobData.worker_id || null
      };
      
      await axios.put(`${API}/jobs/${editingJob.job_id}`, updateData, { withCredentials: true });
      toast.success("Munka frissítve!");
      setEditingJob(null);
      fetchData();
    } catch (error) {
      toast.error("Hiba a munka frissítésekor");
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
      
      const uploadRes = await axios.post(`${API}/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
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
      
      toast.success("Kép feltöltve!");
      fetchData();
    } catch (error) {
      toast.error("Hiba a kép feltöltésekor");
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
    return images[slotId] || null;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      kesz: { label: "Kész", className: "status-kesz" },
      folyamatban: { label: "Folyamatban", className: "status-folyamatban" },
      foglalt: { label: "Foglalt", className: "status-foglalt" }
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
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-['Manrope']">Új munka létrehozása</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-slate-300">Ügyfél</Label>
                  <Select value={newJob.customer_id} onValueChange={(v) => setNewJob({...newJob, customer_id: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700">
                      <SelectValue placeholder="Válassz ügyfelet" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {customers.map(c => (
                        <SelectItem key={c.customer_id} value={c.customer_id} className="text-white">
                          {c.name} - {c.plate_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Button onClick={handleCreateJob} className="w-full bg-green-600 hover:bg-green-500" disabled={!newJob.customer_id || !newJob.service_id}>
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
              <CardTitle className="text-xl text-white font-['Manrope']">Mai munkák</CardTitle>
            </CardHeader>
            <CardContent>
              {todayJobs.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nincs mai munka</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayJobs.map((job) => (
                    <div key={job.job_id} className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 hover:border-green-500/30 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-white">{job.plate_number}</span>
                            {getStatusBadge(job.status)}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                              onClick={() => handleEditJobOpen(job)}
                              data-testid={`edit-job-${job.job_id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-slate-400 text-sm mt-1">{job.customer_name}</p>
                          <p className="text-slate-500 text-sm">{job.service_name}</p>
                          {job.notes && (
                            <p className="text-xs text-amber-400/80 mt-1 flex items-start gap-1">
                              <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span className="italic">{job.notes}</span>
                            </p>
                          )}
                          {/* Worker badge - more prominent */}
                          <div className="flex items-center gap-2 mt-2">
                            {job.worker_name ? (
                              <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                <User className="w-3 h-3 mr-1" />
                                {job.worker_name}
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                <User className="w-3 h-3 mr-1" />
                                Nincs dolgozó
                              </Badge>
                            )}
                            {job.time_slot && (
                              <Badge variant="outline" className="border-slate-600 text-slate-400">
                                <Clock className="w-3 h-3 mr-1" />
                                {job.time_slot}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-400 hover:text-white mt-2" onClick={() => { setSelectedJob(job); setImageDialogOpen(true); }}>
                            <Image className="w-3 h-3 mr-1" />
                            Képek ({getImageCount(job)})
                          </Button>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="text-lg font-semibold text-green-400">{job.price.toLocaleString()} Ft</p>
                          {job.status === "foglalt" && (
                            <Button size="sm" variant="outline" className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10" onClick={() => handleUpdateJobStatus(job.job_id, "folyamatban")}>
                              <Clock className="w-3 h-3 mr-1" />Indítás
                            </Button>
                          )}
                          {job.status === "folyamatban" && (
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-500" onClick={() => handleUpdateJobStatus(job.job_id, "kesz", "keszpenz")}>
                                <Wallet className="w-3 h-3 mr-1" />Készpénz
                              </Button>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-500" onClick={() => handleUpdateJobStatus(job.job_id, "kesz", "kartya")}>
                                <CreditCard className="w-3 h-3 mr-1" />Kártya
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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
                                <div className="relative w-full h-full group">
                                  <img 
                                    src={imageUrl} 
                                    alt={slot.label} 
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() => setFullscreenImage(imageUrl)}
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button onClick={() => setFullscreenImage(imageUrl)} className="p-2 bg-white/20 rounded-full hover:bg-white/30">
                                      <ZoomIn className="w-4 h-4 text-white" />
                                    </button>
                                    <button onClick={() => handleRemoveImage(selectedJob.job_id, 'before', slot.id)} className="p-2 bg-red-500/80 rounded-full hover:bg-red-500">
                                      <X className="w-4 h-4 text-white" />
                                    </button>
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
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
                                <div className="relative w-full h-full group">
                                  <img 
                                    src={imageUrl} 
                                    alt={slot.label} 
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() => setFullscreenImage(imageUrl)}
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button onClick={() => setFullscreenImage(imageUrl)} className="p-2 bg-white/20 rounded-full hover:bg-white/30">
                                      <ZoomIn className="w-4 h-4 text-white" />
                                    </button>
                                    <button onClick={() => handleRemoveImage(selectedJob.job_id, 'after', slot.id)} className="p-2 bg-red-500/80 rounded-full hover:bg-red-500">
                                      <X className="w-4 h-4 text-white" />
                                    </button>
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
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
                                className="w-full aspect-[4/3] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
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
                                className="w-full aspect-[4/3] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
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

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30" onClick={() => setFullscreenImage(null)}>
            <X className="w-6 h-6 text-white" />
          </button>
          <img src={fullscreenImage} alt="Teljes méret" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Edit Job Dialog */}
      <Dialog open={!!editingJob} onOpenChange={(open) => !open && setEditingJob(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit className="w-5 h-5 text-green-400" />
              Munka szerkesztése
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400">Rendszám</p>
              <p className="text-lg font-bold text-white">{editingJob?.plate_number}</p>
              <p className="text-sm text-slate-500">{editingJob?.customer_name}</p>
            </div>
            
            <div>
              <Label className="text-slate-300">Szolgáltatás</Label>
              <Select value={editJobData.service_id} onValueChange={(v) => {
                const service = services.find(s => s.service_id === v);
                setEditJobData({...editJobData, service_id: v, price: service?.price || editJobData.price});
              }}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                  <SelectValue placeholder="Válassz szolgáltatást" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {services.map((s) => (
                    <SelectItem key={s.service_id} value={s.service_id} className="text-white hover:bg-slate-800">
                      {s.name} - {s.price.toLocaleString()} Ft
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-slate-300">Ár (Ft)</Label>
              <Input 
                type="number"
                value={editJobData.price} 
                onChange={(e) => setEditJobData({...editJobData, price: e.target.value})} 
                className="bg-slate-950 border-slate-700 text-white" 
              />
              <p className="text-xs text-slate-500 mt-1">Módosítható ha az ügyfél más árat szeretne</p>
            </div>
            
            <div>
              <Label className="text-slate-300">Dolgozó</Label>
              <Select value={editJobData.worker_id} onValueChange={(v) => setEditJobData({...editJobData, worker_id: v})}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                  <SelectValue placeholder="Válassz dolgozót" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {workers.map((w) => (
                    <SelectItem key={w.worker_id} value={w.worker_id} className="text-white hover:bg-slate-800">
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-slate-300">Megjegyzés</Label>
              <Textarea 
                value={editJobData.notes} 
                onChange={(e) => setEditJobData({...editJobData, notes: e.target.value})} 
                className="bg-slate-950 border-slate-700 text-white min-h-[80px]" 
                placeholder="Írj megjegyzést a munkához..."
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 border-slate-600" onClick={() => setEditingJob(null)}>
                Mégse
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-500" onClick={handleEditJobSave}>
                <Check className="w-4 h-4 mr-1" />
                Mentés
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
