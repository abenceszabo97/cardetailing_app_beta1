import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { 
  ArrowLeft, 
  Phone, 
  Car, 
  Banknote,
  Calendar,
  Edit,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

export const CustomerDetail = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    if (!window.confirm("Biztosan törölni szeretnéd ezt az ügyfelet?")) return;
    
    try {
      await axios.delete(`${API}/customers/${customerId}`, { withCredentials: true });
      toast.success("Ügyfél törölve!");
      navigate("/customers");
    } catch (error) {
      toast.error("Hiba az ügyfél törlésekor");
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
    <div className="space-y-6" data-testid="customer-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/customers">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white font-['Manrope']">{customer.name}</h1>
          <p className="text-slate-400 mt-1">Ügyfél részletei</p>
        </div>
        {user?.role === "admin" && (
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            data-testid="delete-customer-btn"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Törlés
          </Button>
        )}
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Telefonszám</p>
                <p className="text-white font-medium">{customer.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Autó típusa</p>
                <p className="text-white font-medium">{customer.car_type || "-"}</p>
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
              {jobs.map((job) => (
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
