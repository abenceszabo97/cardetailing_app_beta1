import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { 
  ArrowLeft, 
  Phone, 
  Car, 
  Banknote,
  Calendar,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  Image,
  ZoomIn,
  ArrowLeftRight,
  Camera
} from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

// Image slot labels for comparison view
const IMAGE_COMPARISON_PAIRS = [
  { beforeId: "kulter_elol_jobb", afterId: "elol_jobb", label: "Elől jobboldal" },
  { beforeId: "kulter_elol_bal", afterId: "elol_bal", label: "Elől baloldal" },
  { beforeId: "kulter_hatul_jobb", afterId: "hatul_jobb", label: "Hátul jobboldal" },
  { beforeId: "kulter_hatul_bal", afterId: "hatul_bal", label: "Hátul baloldal" },
  { beforeId: "belter_elol_bal", afterId: "belter_elol_bal", label: "Beltér elől bal" },
  { beforeId: "belter_elol_jobb", afterId: "belter_elol_jobb", label: "Beltér elől jobb" },
  { beforeId: "belter_hatul_bal", afterId: "belter_hatul_bal", label: "Beltér hátul bal" },
  { beforeId: "belter_hatul_jobb", afterId: "belter_hatul_jobb", label: "Beltér hátul jobb" },
];

export const CustomerDetail = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedJobImages, setSelectedJobImages] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    car_type: "",
    plate_number: ""
  });

  const fetchCustomer = async () => {
    try {
      const response = await axios.get(`${API}/customers/${customerId}`, { withCredentials: true });
      setCustomer(response.data.customer);
      setJobs(response.data.jobs);
    } catch (error) {
      toast.error("Hiba az ügyfél betöltésekor");
      navigate("/customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/customers/${customerId}`, { withCredentials: true });
      toast.success("Ügyfél törölve!");
      navigate("/customers");
    } catch (error) {
      toast.error("Hiba az ügyfél törlésekor");
    }
  };

  const startEditing = () => {
    setEditForm({
      name: customer.name || "",
      phone: customer.phone || "",
      car_type: customer.car_type || "",
      plate_number: customer.plate_number || ""
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({ name: "", phone: "", car_type: "", plate_number: "" });
  };

  const handleSave = async () => {
    if (!editForm.name || !editForm.phone || !editForm.plate_number) {
      toast.error("Név, telefon és rendszám kötelező!");
      return;
    }
    
    setSaving(true);
    try {
      await axios.put(`${API}/customers/${customerId}`, editForm, { withCredentials: true });
      toast.success("Ügyfél adatai frissítve!");
      setIsEditing(false);
      fetchCustomer();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a mentéskor");
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Betöltés...</div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="customer-detail-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Link to="/customers">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Manrope']">{customer.name}</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">Ügyfél részletei</p>
        </div>
        {user?.role === "admin" && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={startEditing}
              className="border-slate-700 text-slate-300 hover:text-white flex-1 sm:flex-none"
              data-testid="edit-customer-btn"
            >
              <Edit className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Szerkesztés</span>
              <span className="sm:hidden">Szerk.</span>
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 sm:flex-none"
              data-testid="delete-customer-btn"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Törlés
            </Button>
          </div>
        )}
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="glass-card">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-slate-400">Telefonszám</p>
                <p className="text-white font-medium text-sm sm:text-base truncate">{customer.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Car className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-slate-400">Autó típusa</p>
                <p className="text-white font-medium text-sm sm:text-base truncate">{customer.car_type || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <span className="text-orange-400 font-bold text-sm">ABC</span>
              </div>
              <div>
                <p className="text-xs text-slate-400">Rendszám</p>
                <p className="text-white font-bold font-mono">{customer.plate_number}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Banknote className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Összes költés</p>
                <p className="text-green-400 font-bold">{(customer.total_spent || 0).toLocaleString()} Ft</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job History */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-xl text-white font-['Manrope']">Előzmények</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nincs korábbi munka</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const hasImages = job.images_before && Object.keys(job.images_before).length > 0 || 
                                  job.images_after && Object.keys(job.images_after).length > 0;
                return (
                <div 
                  key={job.job_id}
                  className="bg-slate-950/50 rounded-xl p-4 border border-slate-800"
                  data-testid={`history-job-${job.job_id}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{job.service_name}</span>
                        {getStatusBadge(job.status)}
                      </div>
                      <p className="text-slate-500 text-sm mt-1">
                        {format(new Date(job.date), 'yyyy. MMMM d. HH:mm', { locale: hu })}
                      </p>
                      <p className="text-slate-600 text-xs mt-1">{job.location}</p>
                      {hasImages && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs text-slate-400 hover:text-white mt-2 px-2"
                          onClick={() => setSelectedJobImages(job)}
                        >
                          <Image className="w-3 h-3 mr-1" />
                          Képek megtekintése
                        </Button>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-400">{job.price.toLocaleString()} Ft</p>
                      {job.payment_method && (
                        <p className="text-xs text-slate-500">
                          {job.payment_method === "keszpenz" ? "Készpénz" : "Kártya"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Customer Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Ügyfél törlése</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400">Biztosan törölni szeretnéd ezt az ügyfelet?</p>
          <p className="text-white font-medium">{customer?.name}</p>
          <p className="text-slate-500 text-sm">{customer?.plate_number}</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="border-slate-700">
              Mégse
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Törlés
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit className="w-5 h-5 text-green-400" />
              Ügyfél szerkesztése
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-slate-300">Név *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="bg-slate-950 border-slate-700 text-white"
                placeholder="Ügyfél neve"
                data-testid="edit-customer-name"
              />
            </div>
            <div>
              <Label className="text-slate-300">Telefonszám *</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                className="bg-slate-950 border-slate-700 text-white"
                placeholder="+36 70 123 4567"
                data-testid="edit-customer-phone"
              />
            </div>
            <div>
              <Label className="text-slate-300">Autó típusa</Label>
              <Input
                value={editForm.car_type}
                onChange={(e) => setEditForm({...editForm, car_type: e.target.value})}
                className="bg-slate-950 border-slate-700 text-white"
                placeholder="pl. BMW X5"
                data-testid="edit-customer-car-type"
              />
            </div>
            <div>
              <Label className="text-slate-300">Rendszám *</Label>
              <Input
                value={editForm.plate_number}
                onChange={(e) => setEditForm({...editForm, plate_number: e.target.value.toUpperCase()})}
                className="bg-slate-950 border-slate-700 text-white font-mono uppercase"
                placeholder="ABC-123"
                data-testid="edit-customer-plate"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-6">
            <Button variant="outline" onClick={cancelEditing} className="border-slate-700">
              <X className="w-4 h-4 mr-2" />
              Mégse
            </Button>
            <Button 
              onClick={handleSave} 
              className="bg-green-600 hover:bg-green-500"
              disabled={saving || !editForm.name || !editForm.phone || !editForm.plate_number}
              data-testid="save-customer-btn"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mentés...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Mentés</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Job Images Dialog */}
      <Dialog open={!!selectedJobImages} onOpenChange={() => setSelectedJobImages(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-['Manrope'] flex items-center gap-2">
              <Camera className="w-5 h-5 text-green-400" />
              Képek - {selectedJobImages?.service_name}
              <span className="text-slate-400 text-sm ml-2">
                ({selectedJobImages && format(new Date(selectedJobImages.date), 'yyyy. MM. d.', { locale: hu })})
              </span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedJobImages && (
            <div className="space-y-4 mt-4">
              <p className="text-slate-400 text-sm">Előtte és utána képek összehasonlítása</p>
              
              {IMAGE_COMPARISON_PAIRS.map((pair) => {
                const beforeImage = selectedJobImages.images_before?.[pair.beforeId];
                const afterImage = selectedJobImages.images_after?.[pair.afterId];
                
                if (!beforeImage && !afterImage) return null;
                
                return (
                  <div key={pair.beforeId} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-green-400" />
                      {pair.label}
                    </h4>
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
                            alt={`Előtte - ${pair.label}`} 
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
                            alt={`Utána - ${pair.label}`} 
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
              
              {/* Show message if no images */}
              {IMAGE_COMPARISON_PAIRS.every(pair => 
                !selectedJobImages.images_before?.[pair.beforeId] && !selectedJobImages.images_after?.[pair.afterId]
              ) && (
                <div className="text-center py-8 text-slate-400">
                  <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Ehhez a munkához nem tartoznak képek</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" 
          onClick={() => setFullscreenImage(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30" 
            onClick={() => setFullscreenImage(null)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img 
            src={fullscreenImage} 
            alt="Teljes méret" 
            className="max-w-full max-h-full object-contain" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
};
