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
import { 
  Car, 
  Banknote, 
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
  Upload
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";
import { hu } from "date-fns/locale";

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
  const [uploading, setUploading] = useState(false);
  
  const beforeFileRef = useRef(null);
  const afterFileRef = useRef(null);
  
  // New job form state
  const [newJob, setNewJob] = useState({
    customer_id: "",
    service_id: "",
    worker_id: "",
    price: 0,
    location: "Budapest",
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

  // Update selectedJob when todayJobs changes
  useEffect(() => {
    if (selectedJob) {
      const updatedJob = todayJobs.find(j => j.job_id === selectedJob.job_id);
      if (updatedJob) {
        setSelectedJob(updatedJob);
      }
    }
  }, [todayJobs]);

  const handleCreateJob = async () => {
    try {
      await axios.post(`${API}/jobs`, newJob, { withCredentials: true });
      toast.success("Munka sikeresen létrehozva!");
      setIsNewJobOpen(false);
      setNewJob({
        customer_id: "",
        service_id: "",
        worker_id: "",
        price: 0,
        location: "Budapest",
        date: new Date().toISOString().slice(0, 16),
        notes: ""
      });
      fetchData();
    } catch (error) {
      toast.error("Hiba a munka létrehozásakor");
    }
  };

  const handleUpdateJobStatus = async (jobId, status, paymentMethod = null) => {
    try {
      const updateData = { status };
      if (paymentMethod) {
        updateData.payment_method = paymentMethod;
      }
      await axios.put(`${API}/jobs/${jobId}`, updateData, { withCredentials: true });
      toast.success("Státusz frissítve!");
      fetchData();
    } catch (error) {
      toast.error("Hiba a státusz frissítésekor");
    }
  };

  const handleFileUpload = async (file, type) => {
    if (!file || !selectedJob) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await axios.post(`${API}/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const imageUrl = uploadRes.data.url;
      const job = todayJobs.find(j => j.job_id === selectedJob.job_id);
      if (!job) return;
      
      const currentImages = type === 'before' ? (job.images_before || []) : (job.images_after || []);
      const updatedImages = [...currentImages, imageUrl];
      
      await axios.put(`${API}/jobs/${selectedJob.job_id}`, {
        [type === 'before' ? 'images_before' : 'images_after']: updatedImages
      }, { withCredentials: true });
      
      toast.success("Kép feltöltve!");
      fetchData();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Hiba a kép feltöltésekor");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (jobId, type, index) => {
    const job = todayJobs.find(j => j.job_id === jobId);
    if (!job) return;
    
    const currentImages = type === 'before' ? (job.images_before || []) : (job.images_after || []);
    const updatedImages = currentImages.filter((_, i) => i !== index);
    
    try {
      await axios.put(`${API}/jobs/${jobId}`, {
        [type === 'before' ? 'images_before' : 'images_after']: updatedImages
      }, { withCredentials: true });
      toast.success("Kép törölve!");
      fetchData();
    } catch (error) {
      toast.error("Hiba a kép törlésekor");
    }
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
    setNewJob({
      ...newJob,
      service_id: serviceId,
      price: service?.price || 0
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Manrope']">Dashboard</h1>
          <p className="text-slate-400 mt-1">Üdvözöljük, {user?.name}!</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-white" data-testid="dashboard-location-select">
              <MapPin className="w-4 h-4 mr-2 text-green-400" />
              <SelectValue placeholder="Telephely" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-white">Összes</SelectItem>
              <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
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
                    <SelectTrigger className="bg-slate-950 border-slate-700" data-testid="new-job-customer">
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
                    <SelectTrigger className="bg-slate-950 border-slate-700" data-testid="new-job-service">
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
                    <SelectTrigger className="bg-slate-950 border-slate-700" data-testid="new-job-worker">
                      <SelectValue placeholder="Válassz dolgozót" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {workers.map(w => (
                        <SelectItem key={w.worker_id} value={w.worker_id} className="text-white">
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Ár (Ft)</Label>
                    <Input
                      type="number"
                      value={newJob.price}
                      onChange={(e) => setNewJob({...newJob, price: parseInt(e.target.value) || 0})}
                      className="bg-slate-950 border-slate-700 text-white"
                      data-testid="new-job-price"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Telephely</Label>
                    <Select value={newJob.location} onValueChange={(v) => setNewJob({...newJob, location: v})}>
                      <SelectTrigger className="bg-slate-950 border-slate-700" data-testid="new-job-location">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
                        <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Dátum és idő</Label>
                  <Input
                    type="datetime-local"
                    value={newJob.date}
                    onChange={(e) => setNewJob({...newJob, date: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    data-testid="new-job-date"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Megjegyzés</Label>
                  <Input
                    value={newJob.notes}
                    onChange={(e) => setNewJob({...newJob, notes: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="Opcionális megjegyzés..."
                    data-testid="new-job-notes"
                  />
                </div>
                <Button 
                  onClick={handleCreateJob}
                  className="w-full bg-green-600 hover:bg-green-500"
                  disabled={!newJob.customer_id || !newJob.service_id}
                  data-testid="create-job-submit"
                >
                  Létrehozás
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards - 6 cards with cash/card breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="glass-card kpi-card" data-testid="kpi-today-cars">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Mai autók</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.today_cars}</p>
              </div>
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Car className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card kpi-card" data-testid="kpi-today-cash">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Mai készpénz</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{stats.today_cash?.toLocaleString() || 0} Ft</p>
              </div>
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card kpi-card" data-testid="kpi-today-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Mai kártya</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{stats.today_card?.toLocaleString() || 0} Ft</p>
              </div>
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card kpi-card" data-testid="kpi-month-cars">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Havi autók</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.month_cars}</p>
              </div>
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card kpi-card" data-testid="kpi-month-cash">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Havi készpénz</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{stats.month_cash?.toLocaleString() || 0} Ft</p>
              </div>
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card kpi-card" data-testid="kpi-month-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Havi kártya</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{stats.month_card?.toLocaleString() || 0} Ft</p>
              </div>
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Jobs */}
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
                    <div 
                      key={job.job_id}
                      className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 hover:border-green-500/30 transition-colors"
                      data-testid={`job-card-${job.job_id}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-white">{job.plate_number}</span>
                            {getStatusBadge(job.status)}
                          </div>
                          <p className="text-slate-400 text-sm mt-1">{job.customer_name}</p>
                          <p className="text-slate-500 text-sm">{job.service_name}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {job.worker_name || "Nincs hozzárendelve"}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {job.location}
                            </span>
                          </div>
                          {/* Images section */}
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-slate-400 hover:text-white"
                              onClick={() => { setSelectedJob(job); setImageDialogOpen(true); }}
                            >
                              <Image className="w-3 h-3 mr-1" />
                              Képek ({(job.images_before?.length || 0) + (job.images_after?.length || 0)})
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="text-lg font-semibold text-green-400">{job.price.toLocaleString()} Ft</p>
                          {job.status === "foglalt" && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                              onClick={() => handleUpdateJobStatus(job.job_id, "folyamatban")}
                              data-testid={`start-job-${job.job_id}`}
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              Indítás
                            </Button>
                          )}
                          {job.status === "folyamatban" && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-500"
                                onClick={() => handleUpdateJobStatus(job.job_id, "kesz", "keszpenz")}
                                data-testid={`complete-cash-${job.job_id}`}
                              >
                                <Wallet className="w-3 h-3 mr-1" />
                                Készpénz
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-500"
                                onClick={() => handleUpdateJobStatus(job.job_id, "kesz", "kartya")}
                                data-testid={`complete-card-${job.job_id}`}
                              >
                                <CreditCard className="w-3 h-3 mr-1" />
                                Kártya
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

        {/* Monthly Chart */}
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
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                    />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }}
                      labelFormatter={(value) => format(new Date(value), 'yyyy. MMMM d.', { locale: hu })}
                    />
                    <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} name="Autók száma" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-['Manrope']">
              Képek - {selectedJob?.plate_number}
            </DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-6 mt-4">
              {/* Before Images */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-slate-300 text-lg">Előtte</Label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={beforeFileRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(e.target.files[0], 'before');
                          e.target.value = '';
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => beforeFileRef.current?.click()}
                      className="bg-green-600 hover:bg-green-500"
                      disabled={uploading}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      {uploading ? "Feltöltés..." : "Kép feltöltése"}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(selectedJob.images_before || []).map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`Előtte ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                      <button
                        onClick={() => handleRemoveImage(selectedJob.job_id, 'before', idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(!selectedJob.images_before || selectedJob.images_before.length === 0) && (
                    <p className="text-slate-500 text-sm col-span-3">Nincs kép</p>
                  )}
                </div>
              </div>

              {/* After Images */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-slate-300 text-lg">Utána</Label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={afterFileRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(e.target.files[0], 'after');
                          e.target.value = '';
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => afterFileRef.current?.click()}
                      className="bg-green-600 hover:bg-green-500"
                      disabled={uploading}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      {uploading ? "Feltöltés..." : "Kép feltöltése"}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(selectedJob.images_after || []).map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`Utána ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                      <button
                        onClick={() => handleRemoveImage(selectedJob.job_id, 'after', idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(!selectedJob.images_after || selectedJob.images_after.length === 0) && (
                    <p className="text-slate-500 text-sm col-span-3">Nincs kép</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
