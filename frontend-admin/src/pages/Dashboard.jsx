import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API, useAuth, useLocation2 } from "../App";
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
  ArrowLeftRight,
  Pencil,
  Bell,
  AlertTriangle,
  Package,
  FileText,
  Receipt,
  Search
} from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { 
  requestNotificationPermission, 
  isNotificationEnabled,
  notifyJobStatusChange, 
  notifyPayment, 
  notifyImageUpload,
  notifyJobEdit
} from "../services/notificationService";

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
  { id: "atadas_atvatel", label: "Átadás-átvétel dokumentáció", category: "handover", matchBefore: null },
];

const WORKER_GRADIENTS = [
  "from-blue-500/20 to-cyan-500/20",
  "from-purple-500/20 to-pink-500/20",
  "from-green-500/20 to-emerald-500/20",
  "from-orange-500/20 to-yellow-500/20",
  "from-red-500/20 to-rose-500/20",
  "from-indigo-500/20 to-violet-500/20",
];

export const Dashboard = () => {
  const { user } = useAuth();
  const { selectedLocation, locationForApi } = useLocation2();
  const [stats, setStats] = useState({ 
    today_cars: 0, today_revenue: 0, today_cash: 0, today_card: 0,
    month_cars: 0, month_revenue: 0, month_cash: 0, month_card: 0 
  });
  const [todayJobs, setTodayJobs] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewJobOpen, setIsNewJobOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(null); // slot id being uploaded
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [imageViewMode, setImageViewMode] = useState("slots"); // slots or comparison
  
  const fileInputRef = useRef(null);
  const [currentUploadSlot, setCurrentUploadSlot] = useState(null);
  
  // Edit job state
  const [editJobOpen, setEditJobOpen] = useState(false);
  const [editJob, setEditJob] = useState(null);

  // Invoice state
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceJob, setInvoiceJob] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({ buyer_name: "", buyer_email: "", buyer_address: "", buyer_tax_number: "", comment: "", billing_entity: "auto" });
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [jobSearch, setJobSearch] = useState("");
  const [invoiceConfigured, setInvoiceConfigured] = useState(false);

  useEffect(() => {
    axios.get(`${API}/invoices/status`, { withCredentials: true })
      .then(r => setInvoiceConfigured(r.data.configured))
      .catch(() => {});
  }, []);

  const openInvoiceDialog = (job) => {
    setInvoiceJob(job);
    setInvoiceForm({
      buyer_name: job.customer_name || "",
      buyer_email: job.email || "",
      buyer_address: "",
      buyer_tax_number: "",
      comment: `${job.plate_number} – ${job.service_name || "Autókozmetikai szolgáltatás"}`,
      billing_entity: "auto"
    });
    setInvoiceDialogOpen(true);
  };

  const handleCreateInvoice = async () => {
    if (!invoiceJob) return;
    setInvoiceLoading(true);
    try {
      const res = await axios.post(`${API}/invoices/create`, {
        job_id: invoiceJob.job_id,
        buyer_name: invoiceForm.buyer_name,
        buyer_email: invoiceForm.buyer_email || undefined,
        buyer_address: invoiceForm.buyer_address || undefined,
        buyer_tax_number: invoiceForm.buyer_tax_number || undefined,
        payment_method: invoiceJob.payment_method || "keszpenz",
        comment: invoiceForm.comment || undefined,
        billing_entity: invoiceForm.billing_entity !== "auto" ? invoiceForm.billing_entity : undefined,
      }, { withCredentials: true });
      toast.success(res.data.message || "Számla kiállítva!");
      setInvoiceDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Hiba a számla kiállításakor");
    } finally {
      setInvoiceLoading(false);
    }
  };
  
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
      const locationParam = locationForApi ? `?location=${locationForApi}` : "";
      
      const [statsRes, jobsRes, dailyRes, customersRes, servicesRes, workersRes, lowStockRes] = await Promise.allSettled([
        axios.get(`${API}/stats/dashboard${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/jobs/today${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/stats/daily${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/customers`, { withCredentials: true }),
        axios.get(`${API}/services`, { withCredentials: true }),
        axios.get(`${API}/workers${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/notifications/low-stock`, { withCredentials: true })
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (jobsRes.status === 'fulfilled') setTodayJobs(Array.isArray(jobsRes.value.data) ? jobsRes.value.data : []);
      if (dailyRes.status === 'fulfilled') setDailyStats(Array.isArray(dailyRes.value.data) ? dailyRes.value.data : []);
      if (customersRes.status === 'fulfilled') setCustomers(Array.isArray(customersRes.value.data) ? customersRes.value.data : []);
      if (servicesRes.status === 'fulfilled') setServices(Array.isArray(servicesRes.value.data) ? servicesRes.value.data : []);
      if (workersRes.status === 'fulfilled') setWorkers(Array.isArray(workersRes.value.data) ? workersRes.value.data : []);
      if (lowStockRes.status === 'fulfilled') setLowStockItems(Array.isArray(lowStockRes.value.data) ? lowStockRes.value.data : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Hiba az adatok betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Request notification permission on load
    requestNotificationPermission();

    // ── SSE: live refresh when jobs/bookings change ────────────────────────
    let es;
    let retryTimeout;
    const refreshInterval = setInterval(fetchData, 60000);
    const handleNewBooking = () => fetchData();

    window.addEventListener("xclean:new-booking", handleNewBooking);
    const connectSSE = () => {
      try {
        es = new EventSource(`${API}/events/dashboard`, { withCredentials: true });
        es.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === "refresh") fetchData();
          } catch {}
        };
        es.onerror = () => {
          es.close();
          // Reconnect after 5 s
          retryTimeout = setTimeout(connectSSE, 5000);
        };
      } catch {}
    };
    connectSSE();
    return () => {
      es?.close();
      clearTimeout(retryTimeout);
      clearInterval(refreshInterval);
      window.removeEventListener("xclean:new-booking", handleNewBooking);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation, locationForApi]);

  // Notification permission state
  const [notificationsEnabled, setNotificationsEnabled] = useState(isNotificationEnabled());

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
      const job = todayJobs.find(j => j.job_id === jobId);
      const updateData = { status };
      if (paymentMethod) updateData.payment_method = paymentMethod;
      await axios.put(`${API}/jobs/${jobId}`, updateData, { withCredentials: true });
      toast.success("Státusz frissítve!");

      // Send notification
      if (job) {
        if (paymentMethod) {
          notifyPayment(job, paymentMethod);
        } else {
          notifyJobStatusChange(job, status);
        }
      }

      // Auto-open invoice dialog when marking job as done with payment
      if (status === "kesz" && paymentMethod && job && !job.invoice_number) {
        const jobWithPayment = { ...job, payment_method: paymentMethod };
        // Small delay so fetchData can start, then open dialog
        setTimeout(() => openInvoiceDialog(jobWithPayment), 300);
      }

      fetchData();
    } catch (error) {
      toast.error("Hiba a státusz frissítésekor");
    }
  };

  const handleSlotUploadClick = (slotId, type) => {
    setCurrentUploadSlot({ slotId, type });
    fileInputRef.current?.click();
  };

  // Handle edit job
  const handleEditJob = (job) => {
    setEditJob({
      ...job,
      service_id: job.service_id || "",
      worker_id: job.worker_id || "",
      price: job.price || 0,
      notes: job.notes || "",
      time_slot: job.time_slot || "",
      car_type: job.car_type || "",
      phone: job.phone || ""
    });
    setEditJobOpen(true);
  };

  const handleSaveEditJob = async () => {
    if (!editJob) return;
    
    try {
      const selectedService = services.find(s => s.service_id === editJob.service_id);
      const selectedWorker = workers.find(w => w.worker_id === editJob.worker_id);
      
      await axios.put(`${API}/jobs/${editJob.job_id}`, {
        service_id: editJob.service_id,
        service_name: selectedService?.name || editJob.service_name,
        worker_id: editJob.worker_id,
        worker_name: selectedWorker?.name || editJob.worker_name,
        price: parseFloat(editJob.price) || 0,
        notes: editJob.notes,
        time_slot: editJob.time_slot,
        car_type: editJob.car_type,
        phone: editJob.phone
      }, { withCredentials: true });
      
      toast.success("Munka frissítve!");
      
      // Send notification for edit
      notifyJobEdit(editJob);
      
      setEditJobOpen(false);
      setEditJob(null);
      fetchData();
    } catch (error) {
      console.error("Edit job error:", error);
      toast.error("Hiba a munka frissítésekor");
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedJob || !currentUploadSlot) {
      return;
    }
    
    // Reset file input immediately
    e.target.value = '';
    
    const { slotId, type } = currentUploadSlot;
    const job = todayJobs.find(j => j.job_id === selectedJob.job_id);
    
    setUploading(slotId);
    try {
      // Compress image if too large (for mobile photos)
      let fileToUpload = file;
      if (file.size > 2 * 1024 * 1024) { // > 2MB
        try {
          fileToUpload = await compressImage(file);
        } catch {
          // Compression failed, use original
        }
      }
      
      const formData = new FormData();
      formData.append('file', fileToUpload);
      
      // Use the new Cloudinary-based upload endpoint with entity context
      const uploadRes = await axios.post(
        `${API}/files/upload?entity_type=job&entity_id=${selectedJob.job_id}`, 
        formData, 
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000 // 60 second timeout for mobile uploads
        }
      );
      
      const imageUrl = uploadRes.data.url;
      if (!imageUrl) {
        throw new Error("No URL returned from upload");
      }
      
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
      
      // Get slot label for notification
      const allSlots = [...IMAGE_SLOTS_BEFORE, ...IMAGE_SLOTS_AFTER];
      const slot = allSlots.find(s => s.id === slotId);
      
      toast.success("Kép feltöltve!");
      
      // Send notification
      notifyImageUpload(selectedJob, slot?.label || slotId);
      
      fetchData();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.detail || "Hiba a kép feltöltésekor");
    } finally {
      setUploading(null);
      setCurrentUploadSlot(null);
    }
  };

  // Helper function to compress large images (for mobile)
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              reject(new Error('Canvas to blob failed'));
            }
          }, 'image/jpeg', 0.7);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
      kesz:           { label: "Kész",            className: "bg-green-500/20 text-green-400 border border-green-500/30" },
      folyamatban:    { label: "Folyamatban",     className: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
      foglalt:        { label: "Foglalt",         className: "bg-blue-500/20 text-blue-400 border border-blue-500/30" },
      visszaigazolva: { label: "Visszaigazolva",  className: "bg-blue-500/20 text-blue-300 border border-blue-500/30" },
      nem_jott_el:    { label: "Nem jött el",     className: "bg-slate-500/20 text-slate-400 border border-slate-700" },
      lemondva:       { label: "Lemondva",        className: "bg-red-500/20 text-red-400 border border-red-500/30" },
      lemondta:       { label: "Lemondva",        className: "bg-red-500/20 text-red-400 border border-red-500/30" },
    };
    const config = statusConfig[status] || { label: status, className: "bg-slate-700/20 text-slate-400 border border-slate-700" };
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

  const filteredTodayJobs = jobSearch.trim()
    ? todayJobs.filter(j => {
        const q = jobSearch.toLowerCase();
        return j.plate_number?.toLowerCase().includes(q) || j.customer_name?.toLowerCase().includes(q);
      })
    : todayJobs;

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Manrope']">Főoldal</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">Üdvözöljük, {user?.name}!</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
            <MapPin className="w-4 h-4 text-green-400" />
            <span className="text-sm text-white">{selectedLocation === "all" ? "Összes" : selectedLocation}</span>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Rendszám, ügyfél..."
              value={jobSearch}
              onChange={e => setJobSearch(e.target.value)}
              className="pl-9 pr-8 bg-slate-900 border-slate-700 text-white h-9 text-sm"
            />
            {jobSearch && (
              <button
                onClick={() => setJobSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
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

      {/* Revenue Forecast */}
      {(() => {
        const now = new Date();
        const dayOfMonth = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysRemaining = daysInMonth - dayOfMonth;
        const dailyAvg = dayOfMonth > 0 ? (stats.month_revenue || 0) / dayOfMonth : 0;
        const projected = Math.round(dailyAvg * daysInMonth);
        const progress = daysInMonth > 0 ? Math.round((dayOfMonth / daysInMonth) * 100) : 0;
        const revenueProgress = projected > 0 ? Math.min(100, Math.round(((stats.month_revenue || 0) / projected) * 100)) : 0;
        if (!stats.month_revenue) return null;
        return (
          <Card className="glass-card border-purple-500/20">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="w-9 h-9 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <p className="text-xs text-slate-400">Bevétel előrejelzés ({now.toLocaleString("hu-HU", { month: "long" })})</p>
                    <span className="text-xs text-slate-500">{dayOfMonth}. nap / {daysInMonth} — még {daysRemaining} nap</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-1">
                    <span className="text-lg font-bold text-purple-400">{projected.toLocaleString()} Ft</span>
                    <span className="text-xs text-slate-500">várható havi bevétel</span>
                    <span className="text-xs text-green-400">Jelenlegi: {(stats.month_revenue || 0).toLocaleString()} Ft</span>
                    <span className="text-xs text-slate-500">Napi átlag: {Math.round(dailyAvg).toLocaleString()} Ft</span>
                  </div>
                  {/* Progress bars */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                        <div className="bg-slate-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500 w-8 text-right">{progress}%</span>
                      <span className="text-[10px] text-slate-600">idő</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                        <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${revenueProgress}%` }} />
                      </div>
                      <span className="text-[10px] text-purple-400 w-8 text-right">{revenueProgress}%</span>
                      <span className="text-[10px] text-slate-600">bevétel</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5" data-testid="dashboard-low-stock-alert">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-amber-400 font-semibold text-sm">Alacsony készlet ({lowStockItems.length} termék)</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {lowStockItems.slice(0, 5).map((item) => (
                    <span
                      key={item.inventory_id}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
                        item.severity === "critical"
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      }`}
                      data-testid={`low-stock-item-${item.inventory_id}`}
                    >
                      <Package className="w-3 h-3" />
                      {item.product_name}: {item.current_quantity}/{item.min_level} {item.unit}
                    </span>
                  ))}
                  {lowStockItems.length > 5 && (
                    <span className="text-xs text-slate-500">+{lowStockItems.length - 5} további</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        <div>
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
                /* Worker-based view - responsive columns */
                <div
                  className="space-y-4 md:space-y-0 md:grid md:gap-4"
                  style={{
                    gridTemplateColumns:
                      workers.length <= 1
                        ? "minmax(0, 1fr)"
                        : workers.length === 2
                          ? "repeat(2, minmax(0, 1fr))"
                          : "repeat(3, minmax(0, 1fr))",
                  }}
                >
                  {workers.map((worker, workerIndex) => {
                    const workerJobs = filteredTodayJobs.filter(j => j.worker_id === worker.worker_id || j.worker_name === worker.name);
                    
                    return (
                      <div key={worker.worker_id} className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                        {/* Worker header */}
                        <div className={`bg-gradient-to-r ${WORKER_GRADIENTS[workerIndex % WORKER_GRADIENTS.length]} border-b border-slate-700 px-3 sm:px-4 py-2 sm:py-3`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-500/30 flex items-center justify-center">
                                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                              </div>
                              <span className="text-white font-semibold text-sm sm:text-base">{worker.name}</span>
                            </div>
                            <Badge className="bg-slate-800 text-slate-300 text-xs">
                              {workerJobs.length} munka
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Worker jobs */}
                        <div className="p-2 sm:p-3 space-y-2 max-h-[350px] sm:max-h-[400px] overflow-y-auto">
                          {workerJobs.length === 0 ? (
                            <div className="text-center py-4 text-slate-500 text-sm">
                              Nincs hozzárendelt munka
                            </div>
                          ) : (
                            workerJobs.map((job) => (
                              <div key={job.job_id} className="bg-slate-950/50 rounded-lg p-2.5 sm:p-3 border border-slate-800 hover:border-green-500/30 transition-colors">
                                {/* Mobile: Stack layout, Desktop: Side by side */}
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    {/* Header row with plate and status */}
                                    <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
                                      <span className="font-bold text-white text-sm sm:text-base">{job.plate_number}</span>
                                      {getStatusBadge(job.status)}
                                      {/* Price on mobile - inline */}
                                      <span className="text-green-400 font-semibold text-sm sm:hidden ml-auto">{job.price?.toLocaleString()} Ft</span>
                                    </div>
                                    
                                    {/* Customer and service info */}
                                    <p className="text-slate-400 text-xs sm:text-sm mt-1">{job.customer_name}</p>
                                    <p className="text-slate-500 text-xs truncate">{job.service_name}</p>
                                    
                                    {/* Details row - horizontal on mobile */}
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-500">
                                      {job.time_slot && (
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          <span>{job.time_slot}</span>
                                        </div>
                                      )}
                                      {job.car_type && (
                                        <div className="flex items-center gap-1">
                                          <Car className="w-3 h-3" />
                                          <span>{job.car_type}</span>
                                        </div>
                                      )}
                                      {job.phone && (
                                        <a href={`tel:${job.phone}`} className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                                          <span>📞</span>
                                          <span>{job.phone}</span>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Desktop price and image button */}
                                  <div className="hidden sm:flex flex-col items-end gap-1">
                                    <span className="text-green-400 font-semibold text-sm">{job.price?.toLocaleString()} Ft</span>
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-slate-400 hover:text-white px-2" onClick={() => { setSelectedJob(job); setImageDialogOpen(true); }}>
                                      <Image className="w-3 h-3 mr-1" />
                                      {getImageCount(job)}
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Action buttons - improved mobile layout */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-800">
                                  {/* Mobile image button */}
                                  <Button variant="ghost" size="sm" className="sm:hidden h-8 text-xs text-slate-400 hover:text-white px-2" onClick={() => { setSelectedJob(job); setImageDialogOpen(true); }}>
                                    <Image className="w-3.5 h-3.5 mr-1" />
                                    {getImageCount(job)}
                                  </Button>
                                  
                                  {/* Edit button - icon only */}
                                  <Button size="sm" variant="outline" className="h-8 sm:h-7 text-xs border-slate-600 text-slate-400 hover:bg-slate-700 px-2" onClick={() => handleEditJob(job)} title="Szerkesztés">
                                    <Pencil className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                                  </Button>
                                  
                                  {job.status === "foglalt" && (
                                    <>
                                      <Button size="sm" variant="outline" className="h-8 sm:h-7 text-xs border-green-500/50 text-green-400 hover:bg-green-500/10 px-2 sm:px-3" onClick={() => handleUpdateJobStatus(job.job_id, "folyamatban")}>
                                        <Clock className="w-3.5 h-3.5 sm:w-3 sm:h-3 sm:mr-1" />
                                        <span className="hidden sm:inline">Indít</span>
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-8 sm:h-7 text-xs border-red-500/50 text-red-400 hover:bg-red-500/10 px-2 sm:px-3" onClick={() => handleUpdateJobStatus(job.job_id, "nem_jott_el")}>
                                        <span className="sm:hidden">❌</span>
                                        <span className="hidden sm:inline">❌ Nem jött</span>
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-8 sm:h-7 text-xs border-orange-500/50 text-orange-400 hover:bg-orange-500/10 px-2 sm:px-3" onClick={() => handleUpdateJobStatus(job.job_id, "lemondta")}>
                                        <span className="sm:hidden">🚫</span>
                                        <span className="hidden sm:inline">🚫 Lemondta</span>
                                      </Button>
                                    </>
                                  )}
                                  {job.status === "folyamatban" && (
                                    <>
                                      <Button size="sm" className="h-8 sm:h-7 text-xs bg-green-600 hover:bg-green-500 px-2 sm:px-3" onClick={() => handleUpdateJobStatus(job.job_id, "kesz", "keszpenz")}>
                                        <Wallet className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1" />
                                        Készpénz
                                      </Button>
                                      <Button size="sm" className="h-8 sm:h-7 text-xs bg-blue-600 hover:bg-blue-500 px-2 sm:px-3" onClick={() => handleUpdateJobStatus(job.job_id, "kesz", "kartya")}>
                                        <CreditCard className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1" />
                                        Kártya
                                      </Button>
                                    </>
                                  )}
                                  {job.status === "kesz" && job.payment_method && (
                                    <>
                                      <Badge className={`text-xs ${job.payment_method === "keszpenz" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
                                        {job.payment_method === "keszpenz" ? "💵 Készpénz" : "💳 Kártya"}
                                      </Badge>
                                      {invoiceConfigured && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className={`h-8 sm:h-7 text-xs px-2 ${job.invoice_number ? 'border-green-500/40 text-green-400' : 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10'}`}
                                          onClick={() => !job.invoice_number && openInvoiceDialog(job)}
                                          title={job.invoice_number ? `Számla: ${job.invoice_number}` : "Számla kiállítása"}
                                          disabled={!!job.invoice_number}
                                        >
                                          <Receipt className="w-3.5 h-3.5 mr-1" />
                                          {job.invoice_number ? "Számlázva" : "Számla"}
                                        </Button>
                                      )}
                                    </>
                                  )}
                                  {job.status === "nem_jott_el" && (
                                    <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs">
                                      ❌ Nem jelent meg
                                    </Badge>
                                  )}
                                  {job.status === "lemondta" && (
                                    <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs">
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
                  {filteredTodayJobs.filter(j => !j.worker_id && !j.worker_name).length > 0 && (
                    <div
                      className="bg-slate-900/50 rounded-xl border border-orange-500/30 overflow-hidden"
                      style={{ gridColumn: "1 / -1" }}
                    >
                      <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-b border-orange-500/30 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-orange-500/30 flex items-center justify-center">
                              <User className="w-4 h-4 text-orange-400" />
                            </div>
                            <span className="text-white font-semibold">Hozzárendelésre vár</span>
                          </div>
                          <Badge className="bg-orange-500/20 text-orange-300 text-xs">
                            {filteredTodayJobs.filter(j => !j.worker_id && !j.worker_name).length} munka
                          </Badge>
                        </div>
                      </div>
                      <div className="p-2 sm:p-3 space-y-2">
                        {filteredTodayJobs.filter(j => !j.worker_id && !j.worker_name).map((job) => (
                          <div key={job.job_id} className="bg-slate-950/50 rounded-lg p-2.5 sm:p-3 border border-slate-800 hover:border-orange-500/30 transition-colors">
                            {/* Mobile-optimized layout */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                {/* Header row */}
                                <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
                                  <span className="font-bold text-white text-sm sm:text-base">{job.plate_number}</span>
                                  {getStatusBadge(job.status)}
                                  <span className="text-green-400 font-semibold text-sm sm:hidden ml-auto">{job.price?.toLocaleString()} Ft</span>
                                </div>
                                <p className="text-slate-400 text-xs sm:text-sm mt-1">{job.customer_name}</p>
                                <p className="text-slate-500 text-xs">{job.service_name}</p>
                                
                                {/* Details row */}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-500">
                                  {job.time_slot && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{job.time_slot}</span>
                                    </div>
                                  )}
                                  {job.car_type && (
                                    <div className="flex items-center gap-1">
                                      <Car className="w-3 h-3" />
                                      <span>{job.car_type}</span>
                                    </div>
                                  )}
                                  {job.phone && (
                                    <a href={`tel:${job.phone}`} className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                                      <span>📞</span>
                                      <span>{job.phone}</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                              
                              {/* Desktop price */}
                              <div className="hidden sm:flex flex-col items-end gap-1">
                                <span className="text-green-400 font-semibold text-sm">{job.price?.toLocaleString()} Ft</span>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-slate-400 hover:text-white px-2" onClick={() => { setSelectedJob(job); setImageDialogOpen(true); }}>
                                  <Image className="w-3 h-3 mr-1" />
                                  {getImageCount(job)}
                                </Button>
                              </div>
                            </div>
                            
                            {/* Action buttons - mobile optimized */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-800">
                              {/* Mobile image button */}
                              <Button variant="ghost" size="sm" className="sm:hidden h-8 text-xs text-slate-400 hover:text-white px-2" onClick={() => { setSelectedJob(job); setImageDialogOpen(true); }}>
                                <Image className="w-3.5 h-3.5 mr-1" />
                                {getImageCount(job)}
                              </Button>
                              
                              {/* Edit button - icon only */}
                              <Button size="sm" variant="outline" className="h-8 sm:h-7 text-xs border-slate-600 text-slate-400 hover:bg-slate-700 px-2" onClick={() => handleEditJob(job)} title="Szerkesztés">
                                <Pencil className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                              </Button>
                              
                              {job.status === "foglalt" && (
                                <>
                                  <Button size="sm" variant="outline" className="h-8 sm:h-7 text-xs border-green-500/50 text-green-400 hover:bg-green-500/10 px-2 sm:px-3" onClick={() => handleUpdateJobStatus(job.job_id, "folyamatban")}>
                                    <Clock className="w-3.5 h-3.5 sm:w-3 sm:h-3 sm:mr-1" />
                                    <span className="hidden sm:inline">Indít</span>
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-8 sm:h-7 text-xs border-red-500/50 text-red-400 hover:bg-red-500/10 px-2 sm:px-3" onClick={() => handleUpdateJobStatus(job.job_id, "nem_jott_el")}>
                                    <span className="sm:hidden">❌</span>
                                    <span className="hidden sm:inline">❌ Nem jött</span>
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-8 sm:h-7 text-xs border-orange-500/50 text-orange-400 hover:bg-orange-500/10 px-2 sm:px-3" onClick={() => handleUpdateJobStatus(job.job_id, "lemondta")}>
                                    <span className="sm:hidden">🚫</span>
                                    <span className="hidden sm:inline">🚫 Lemondta</span>
                                  </Button>
                                </>
                              )}
                              {job.status === "folyamatban" && (
                                <>
                                  <Button size="sm" className="h-8 sm:h-7 text-xs bg-green-600 hover:bg-green-500 px-2 sm:px-3" onClick={() => handleUpdateJobStatus(job.job_id, "kesz", "keszpenz")}>
                                    <Wallet className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1" />
                                    Készpénz
                                  </Button>
                                  <Button size="sm" className="h-8 sm:h-7 text-xs bg-blue-600 hover:bg-blue-500 px-2 sm:px-3" onClick={() => handleUpdateJobStatus(job.job_id, "kesz", "kartya")}>
                                    <CreditCard className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1" />
                                    Kártya
                                  </Button>
                                </>
                              )}
                              {job.status === "kesz" && job.payment_method && (
                                <Badge className={`text-xs ${job.payment_method === "keszpenz" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
                                  {job.payment_method === "keszpenz" ? "💵 Készpénz" : "💳 Kártya"}
                                </Badge>
                              )}
                              {job.status === "nem_jott_el" && (
                                <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs">
                                  ❌ Nem jelent meg
                                </Badge>
                              )}
                              {job.status === "lemondta" && (
                                <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs">
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
      </div>

      {/* Hidden file input - supports camera and gallery on mobile */}
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
                      {IMAGE_SLOTS_AFTER.filter(s => s.category !== "handover").map((slot) => {
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

                  {/* Handover / Átadás-átvétel section */}
                  {(() => {
                    const handoverSlot = IMAGE_SLOTS_AFTER.find(s => s.category === "handover");
                    if (!handoverSlot) return null;
                    const imageUrl = getSlotImage(selectedJob, 'after', handoverSlot.id);
                    return (
                      <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4">
                        <Label className="text-amber-400 text-lg font-semibold flex items-center gap-2 mb-4">
                          <ArrowLeftRight className="w-5 h-5" />
                          Átadás-átvétel dokumentáció
                        </Label>
                        <p className="text-slate-400 text-xs mb-3">
                          Készíts képet az autó átadásakor — a kép a munka lezárásakor az ügyfélnek is megmutatható.
                        </p>
                        <div className="max-w-xs">
                          <div className={`aspect-[4/3] rounded-lg border-2 border-dashed ${imageUrl ? 'border-amber-500/50 bg-amber-500/5' : 'border-amber-500/30 bg-slate-800/50'} overflow-hidden`}>
                            {imageUrl ? (
                              <div className="relative w-full h-full group cursor-pointer" onClick={() => setFullscreenImage(imageUrl)}>
                                <img
                                  src={imageUrl}
                                  alt={handoverSlot.label}
                                  className="w-full h-full object-contain bg-slate-900"
                                  onError={(e) => { e.target.onerror = null; e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="75"><rect fill="%23374151" width="100" height="75"/><text x="50%" y="50%" fill="%239CA3AF" font-size="10" text-anchor="middle" dy=".3em">Hiba</text></svg>'; }}
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                                  <button onClick={(e) => { e.stopPropagation(); setFullscreenImage(imageUrl); }} className="p-2 bg-white/20 rounded-full hover:bg-white/30 pointer-events-auto">
                                    <ZoomIn className="w-4 h-4 text-white" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(selectedJob.job_id, 'after', handoverSlot.id); }} className="p-2 bg-red-500/80 rounded-full hover:bg-red-500 pointer-events-auto">
                                    <X className="w-4 h-4 text-white" />
                                  </button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 pointer-events-none">
                                  <Check className="w-3 h-3 text-amber-400 inline mr-1" />
                                  <span className="text-[10px] text-white">Átadás-átvétel</span>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleSlotUploadClick(handoverSlot.id, 'after')}
                                disabled={uploading === handoverSlot.id}
                                className="w-full h-full flex flex-col items-center justify-center text-amber-500/70 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                              >
                                {uploading === handoverSlot.id ? (
                                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-500/50 border-t-amber-400" />
                                ) : (
                                  <>
                                    <Camera className="w-8 h-8 mb-2" />
                                    <span className="text-xs text-center px-2">Kép feltöltése</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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

      {/* Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="bg-slate-900 border-amber-500/30 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-amber-400 flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Számla / Nyugta kiállítása
            </DialogTitle>
            <p className="text-slate-400 text-sm pt-1">
              Tölts ki annyi adatot, amennyit meg tudsz adni. Adószám megadásával számla, anélkül nyugta készül.
            </p>
          </DialogHeader>
          {invoiceJob && (
            <div className="space-y-4">
              {/* Job summary */}
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{invoiceJob.customer_name} · {invoiceJob.plate_number}</p>
                    <p className="text-slate-400 text-sm">{invoiceJob.service_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold text-lg">{invoiceJob.price?.toLocaleString()} Ft</p>
                    <p className="text-slate-500 text-xs">
                      {invoiceJob.payment_method === "keszpenz" ? "💵 Készpénz" : invoiceJob.payment_method === "kartya" ? "💳 Kártya" : "🏦 Átutalás"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Vevő neve *</Label>
                <Input value={invoiceForm.buyer_name} onChange={e => setInvoiceForm(f => ({...f, buyer_name: e.target.value}))} className="bg-slate-950 border-slate-700 text-white" placeholder="Vevő teljes neve" />
              </div>
              <div>
                <Label className="text-slate-300">
                  Adószám
                  <span className="ml-2 text-xs text-amber-400">→ ha megadod, számla készül (nem nyugta)</span>
                </Label>
                <Input value={invoiceForm.buyer_tax_number} onChange={e => setInvoiceForm(f => ({...f, buyer_tax_number: e.target.value}))} className="bg-slate-950 border-slate-700 text-white" placeholder="12345678-1-00" />
              </div>
              <div>
                <Label className="text-slate-300">Email <span className="text-slate-500 font-normal">(opcionális)</span></Label>
                <Input type="email" value={invoiceForm.buyer_email} onChange={e => setInvoiceForm(f => ({...f, buyer_email: e.target.value}))} className="bg-slate-950 border-slate-700 text-white" placeholder="Az ügyfél erre kapja a számlát" />
              </div>
              <div>
                <Label className="text-slate-300">Cím <span className="text-slate-500 font-normal">(opcionális)</span></Label>
                <Input value={invoiceForm.buyer_address} onChange={e => setInvoiceForm(f => ({...f, buyer_address: e.target.value}))} className="bg-slate-950 border-slate-700 text-white" placeholder="Irányítószám, város, utca" />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Számlázási fiók</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "auto", label: "🤖 Automatikus" },
                    { value: "budapest", label: "🏙️ Budapest" },
                    { value: "debrecen_private", label: "👤 Debrecen – Magánszemély" },
                    { value: "debrecen_company", label: "🏢 Debrecen – Céges" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setInvoiceForm(f => ({...f, billing_entity: opt.value}))}
                      className={`p-2 rounded-lg border text-xs text-left transition-all ${
                        invoiceForm.billing_entity === opt.value
                          ? 'border-amber-500 bg-amber-500/10 text-white'
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Megjegyzés</Label>
                <Input value={invoiceForm.comment} onChange={e => setInvoiceForm(f => ({...f, comment: e.target.value}))} className="bg-slate-950 border-slate-700 text-white" />
              </div>

              <p className="text-slate-500 text-xs">
                ÁFA: 27%. {invoiceForm.buyer_tax_number ? "Adószám megadva → számla lesz kiállítva." : "Adószám nélkül → nyugta kerül kiállításra."}
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
                <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)} className="border-slate-700 text-slate-400">
                  Kihagyás
                </Button>
                <Button
                  onClick={handleCreateInvoice}
                  disabled={invoiceLoading || !invoiceForm.buyer_name}
                  className="bg-amber-600 hover:bg-amber-500"
                >
                  {invoiceLoading ? <span className="animate-spin mr-1">⏳</span> : <Receipt className="w-4 h-4 mr-1" />}
                  {invoiceForm.buyer_tax_number ? "Számla kiállítása" : "Nyugta kiállítása"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <Dialog open={editJobOpen} onOpenChange={setEditJobOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-green-400 flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Munka szerkesztése
            </DialogTitle>
          </DialogHeader>
          {editJob && (
            <div className="space-y-4">
              {/* Customer info - read only */}
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <p className="text-slate-400 text-xs">Ügyfél</p>
                <p className="text-white font-semibold">{editJob.customer_name}</p>
                <p className="text-slate-400 text-sm">{editJob.plate_number}</p>
              </div>

              {/* Service */}
              <div>
                <Label className="text-slate-300">Szolgáltatás</Label>
                <Select value={editJob.service_id} onValueChange={(v) => {
                  const service = services.find(s => s.service_id === v);
                  setEditJob(prev => ({ 
                    ...prev, 
                    service_id: v,
                    service_name: service?.name || prev.service_name,
                    price: service?.price || prev.price
                  }));
                }}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                    <SelectValue placeholder="Válassz szolgáltatást" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {services.map((service) => (
                      <SelectItem key={service.service_id} value={service.service_id} className="text-white hover:bg-slate-800">
                        {service.name} - {service.price?.toLocaleString()} Ft
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Worker */}
              <div>
                <Label className="text-slate-300">Dolgozó</Label>
                <Select value={editJob.worker_id} onValueChange={(v) => {
                  const worker = workers.find(w => w.worker_id === v);
                  setEditJob(prev => ({ 
                    ...prev, 
                    worker_id: v,
                    worker_name: worker?.name || prev.worker_name
                  }));
                }}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                    <SelectValue placeholder="Válassz dolgozót" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {workers.map((worker) => (
                      <SelectItem key={worker.worker_id} value={worker.worker_id} className="text-white hover:bg-slate-800">
                        {worker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price */}
              <div>
                <Label className="text-slate-300">Ár (Ft)</Label>
                <Input
                  type="number"
                  value={editJob.price}
                  onChange={(e) => setEditJob(prev => ({ ...prev, price: e.target.value }))}
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>

              {/* Time slot */}
              <div>
                <Label className="text-slate-300">Időpont</Label>
                <Input
                  type="time"
                  value={editJob.time_slot || ""}
                  onChange={(e) => setEditJob(prev => ({ ...prev, time_slot: e.target.value }))}
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>

              {/* Car type */}
              <div>
                <Label className="text-slate-300">Autó típus</Label>
                <Select value={editJob.car_type || ""} onValueChange={(v) => setEditJob(prev => ({ ...prev, car_type: v }))}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                    <SelectValue placeholder="Válassz típust" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="Sedan" className="text-white hover:bg-slate-800">Sedan</SelectItem>
                    <SelectItem value="SUV" className="text-white hover:bg-slate-800">SUV</SelectItem>
                    <SelectItem value="Kombi" className="text-white hover:bg-slate-800">Kombi</SelectItem>
                    <SelectItem value="Ferdehátú" className="text-white hover:bg-slate-800">Ferdehátú</SelectItem>
                    <SelectItem value="Terepjáró" className="text-white hover:bg-slate-800">Terepjáró</SelectItem>
                    <SelectItem value="Pickup" className="text-white hover:bg-slate-800">Pickup</SelectItem>
                    <SelectItem value="Kisbusz" className="text-white hover:bg-slate-800">Kisbusz</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Phone */}
              <div>
                <Label className="text-slate-300">Telefonszám</Label>
                <Input
                  type="tel"
                  value={editJob.phone || ""}
                  onChange={(e) => setEditJob(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-slate-950 border-slate-700 text-white"
                  placeholder="+36..."
                />
              </div>

              {/* Notes */}
              <div>
                <Label className="text-slate-300">Megjegyzés</Label>
                <Input
                  value={editJob.notes || ""}
                  onChange={(e) => setEditJob(prev => ({ ...prev, notes: e.target.value }))}
                  className="bg-slate-950 border-slate-700 text-white"
                  placeholder="Egyéb megjegyzés..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                <Button variant="outline" onClick={() => { setEditJobOpen(false); setEditJob(null); }} className="border-slate-700">
                  Mégse
                </Button>
                <Button onClick={handleSaveEditJob} className="bg-green-600 hover:bg-green-500">
                  <Check className="w-4 h-4 mr-1" />
                  Mentés
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
