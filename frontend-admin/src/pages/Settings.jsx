import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Settings as SettingsIcon,
  Users,
  UserPlus,
  Plus,
  Shield,
  Phone,
  MapPin,
  Trash2,
  Key,
  UserCog,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  Lock,
  FileText,
  ExternalLink,
  Moon,
  Sun,
  Monitor,
  Layout
} from "lucide-react";

// ── Theme / Appearance helpers ────────────────────────────────────────────────
const getStoredTheme = () => localStorage.getItem("xclean_theme") || "dark";
const getStoredCompact = () => localStorage.getItem("xclean_compact") === "true";
const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("xclean_theme", theme);
};
const applyCompact = (compact) => {
  document.documentElement.setAttribute("data-compact", compact ? "true" : "false");
  localStorage.setItem("xclean_compact", compact ? "true" : "false");
};
// Apply on load
applyTheme(getStoredTheme());
applyCompact(getStoredCompact());

// Change Password Form Component
const ChangePasswordForm = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Az új jelszavak nem egyeznek!");
      return;
    }
    
    if (newPassword.length < 4) {
      toast.error("A jelszó legalább 4 karakter legyen!");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        current_password: currentPassword,
        new_password: newPassword
      }, { withCredentials: true });
      
      toast.success("Jelszó sikeresen megváltoztatva!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a jelszó megváltoztatásakor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleChangePassword} className="space-y-4">
      <div>
        <Label className="text-slate-300">Jelenlegi jelszó</Label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="bg-slate-950 border-slate-700 text-white pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <Label className="text-slate-300">Új jelszó</Label>
        <Input
          type={showPassword ? "text" : "password"}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="bg-slate-950 border-slate-700 text-white"
          placeholder="Minimum 4 karakter"
          required
        />
      </div>
      <div>
        <Label className="text-slate-300">Új jelszó megerősítése</Label>
        <Input
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="bg-slate-950 border-slate-700 text-white"
          required
        />
      </div>
      <Button
        type="submit"
        disabled={loading || !currentPassword || !newPassword || !confirmPassword}
        className="w-full bg-yellow-600 hover:bg-yellow-500"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mentés...</>
        ) : (
          <><Lock className="w-4 h-4 mr-2" /> Jelszó megváltoztatása</>
        )}
      </Button>
    </form>
  );
};

export const Settings = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewWorkerOpen, setIsNewWorkerOpen] = useState(false);
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState(null);
  const [deleteWorkerId, setDeleteWorkerId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  
  // Data cleanup state
  const [orphanedData, setOrphanedData] = useState(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  // Számlázz.hu state — one entry per billing entity
  const [szamlazzStatus, setSzamlazzStatus] = useState({ budapest: false, debrecen_private: false, debrecen_company: false });
  const [szamlazzKeys, setSzamlazzKeys] = useState({ budapest: "", debrecen_private: "", debrecen_company: "" });
  const [szamlazzSaving, setSzamlazzSaving] = useState({ budapest: false, debrecen_private: false, debrecen_company: false });
  const [szamlazzVisible, setSzamlazzVisible] = useState({ budapest: false, debrecen_private: false, debrecen_company: false });
  
  const [newWorker, setNewWorker] = useState({
    name: "",
    phone: "",
    location: "Debrecen"
  });

  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    role: "dolgozo",
    location: "Debrecen"
  });

  const fetchData = async () => {
    try {
      const [usersRes, workersRes] = await Promise.all([
        axios.get(`${API}/users`, { withCredentials: true }),
        axios.get(`${API}/workers`, { withCredentials: true })
      ]);
      setUsers(usersRes.data);
      setWorkers(workersRes.data);
    } catch (error) {
      toast.error("Hiba az adatok betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  const fetchSzamlazzStatus = async () => {
    try {
      const res = await axios.get(`${API}/invoices/status`, { withCredentials: true });
      setSzamlazzStatus({
        budapest: res.data.budapest || false,
        debrecen_private: res.data.debrecen_private || false,
        debrecen_company: res.data.debrecen_company || false,
      });
    } catch { /* silent */ }
  };

  const handleSaveSzamlazzKey = async (entity) => {
    if (!szamlazzKeys[entity]?.trim()) {
      toast.error("Kérjük add meg az API kulcsot");
      return;
    }
    setSzamlazzSaving(s => ({ ...s, [entity]: true }));
    try {
      await axios.post(`${API}/invoices/set-api-key`, { entity, api_key: szamlazzKeys[entity] }, { withCredentials: true });
      toast.success("Számlázz.hu API kulcs elmentve!");
      setSzamlazzStatus(s => ({ ...s, [entity]: true }));
      setSzamlazzKeys(s => ({ ...s, [entity]: "" }));
    } catch {
      toast.error("Hiba az API kulcs mentésekor");
    } finally {
      setSzamlazzSaving(s => ({ ...s, [entity]: false }));
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      fetchData();
      fetchSzamlazzStatus();
    }
  }, [user]);

  const handleUpdateRole = async (userId, role) => {
    try {
      await axios.put(`${API}/users/${userId}/role`, { role }, { withCredentials: true });
      toast.success("Szerepkör frissítve!");
      fetchData();
    } catch (error) {
      toast.error("Hiba a szerepkör frissítésekor");
    }
  };

  const handleCreateWorker = async () => {
    try {
      await axios.post(`${API}/workers`, newWorker, { withCredentials: true });
      toast.success("Dolgozó sikeresen létrehozva!");
      setIsNewWorkerOpen(false);
      setNewWorker({ name: "", phone: "", location: "Debrecen" });
      fetchData();
    } catch (error) {
      toast.error("Hiba a dolgozó létrehozásakor");
    }
  };

  const handleDeleteWorker = async (workerId) => {
    try {
      await axios.delete(`${API}/workers/${workerId}`, { withCredentials: true });
      toast.success("Dolgozó törölve!");
      fetchData();
      setDeleteWorkerId(null);
    } catch (error) {
      toast.error("Hiba a dolgozó törlésekor");
    }
  };

  // Data cleanup functions
  const fetchOrphanedData = async () => {
    setCleanupLoading(true);
    try {
      const res = await axios.get(`${API}/stats/orphaned-data`, { withCredentials: true });
      setOrphanedData(res.data);
    } catch (error) {
      toast.error("Hiba az adatok lekérésekor");
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCleanupWorker = async (workerName) => {
    if (!window.confirm(`Biztosan törölni szeretnéd "${workerName}" összes munkáját és statisztikáját?`)) return;
    
    setCleanupLoading(true);
    try {
      const res = await axios.delete(`${API}/stats/cleanup-worker/${encodeURIComponent(workerName)}`, { withCredentials: true });
      toast.success(`${res.data.jobs_deleted} munka törölve!`);
      fetchOrphanedData();
    } catch (error) {
      toast.error("Hiba a törlés során");
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCleanupCustomer = async (customerName) => {
    if (!window.confirm(`Biztosan törölni szeretnéd "${customerName}" összes adatát?`)) return;
    
    setCleanupLoading(true);
    try {
      const res = await axios.delete(`${API}/stats/cleanup-customer/${encodeURIComponent(customerName)}`, { withCredentials: true });
      toast.success(`${res.data.jobs_deleted} munka törölve!`);
      fetchOrphanedData();
    } catch (error) {
      toast.error("Hiba a törlés során");
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCleanupAllOrphaned = async () => {
    if (!window.confirm("Biztosan törölni szeretnéd az összes árva adatot (törölt dolgozók és ügyfelek munkáit)?")) return;
    
    setCleanupLoading(true);
    try {
      const res = await axios.delete(`${API}/stats/cleanup-all-orphaned`, { withCredentials: true });
      toast.success(`${res.data.orphaned_worker_jobs_deleted + res.data.orphaned_customer_jobs_deleted} munka törölve!`);
      setOrphanedData(null);
    } catch (error) {
      toast.error("Hiba a törlés során");
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name) {
      toast.error("Töltsd ki a kötelező mezőket!");
      return;
    }
    try {
      await axios.post(`${API}/auth/create-user`, newUser, { withCredentials: true });
      toast.success("Felhasználó sikeresen létrehozva!");
      setIsNewUserOpen(false);
      setNewUser({ username: "", password: "", name: "", email: "", role: "dolgozo", location: "Debrecen" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a felhasználó létrehozásakor");
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      toast.error("A jelszó legalább 4 karakter legyen!");
      return;
    }
    try {
      await axios.put(`${API}/auth/reset-password/${resetPasswordUserId}`, { new_password: newPassword }, { withCredentials: true });
      toast.success("Jelszó visszaállítva!");
      setResetPasswordUserId(null);
      setNewPassword("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a jelszó visszaállításakor");
    }
  };

  const handleToggleUserActive = async (userId) => {
    try {
      const response = await axios.put(`${API}/auth/toggle-user/${userId}`, {}, { withCredentials: true });
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error("Hiba a felhasználó státusz változtatásakor");
    }
  };

  const handleSeedData = async () => {
    try {
      await axios.post(`${API}/seed`, {}, { withCredentials: true });
      toast.success("Minta adatok betöltve!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Hiba az adatok betöltésekor");
    }
  };

  if (user?.role !== "admin") {
    // Non-admin users can only see their own profile and change password
    return (
      <div className="space-y-4 sm:space-y-6" data-testid="settings-page">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Manrope']">Beállítások</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">Személyes beállítások</p>
        </div>
        
        {/* Profile Card */}
        <Card className="glass-card">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl text-white font-['Manrope'] flex items-center gap-2">
              <UserCog className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              Profil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-700 rounded-full flex items-center justify-center">
                <span className="text-white text-xl sm:text-2xl font-medium">{user?.name?.charAt(0) || 'U'}</span>
              </div>
              <div>
                <p className="text-white font-medium text-base sm:text-lg">{user?.name}</p>
                <p className="text-slate-400 text-sm">@{user?.username || 'n/a'}</p>
                <Badge className="mt-1 bg-blue-500/20 text-blue-300 text-xs">{user?.role === 'admin' ? 'Admin' : 'Dolgozó'}</Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-slate-700">
              <div>
                <span className="text-slate-400 text-xs sm:text-sm">Email</span>
                <p className="text-white text-sm sm:text-base">{user?.email || '-'}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs sm:text-sm">Telephely</span>
                <p className="text-white text-sm sm:text-base">{user?.location || 'Nincs megadva'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Change Password Card */}
        <Card className="glass-card">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl text-white font-['Manrope'] flex items-center gap-2">
              <Key className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              Jelszó megváltoztatása
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="settings-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Manrope']">Beállítások</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">Admin jogosultságú beállítások</p>
        </div>
        <Button onClick={handleSeedData} variant="outline" className="border-slate-700 text-slate-300 hover:text-white w-full sm:w-auto" data-testid="seed-data-btn">
          Minta adatok betöltése
        </Button>
      </div>

      {/* Számlázz.hu Integration */}
      <Card className={`glass-card ${Object.values(szamlazzStatus).some(Boolean) ? 'border-green-500/30' : 'border-amber-500/20'}`}>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl text-white font-['Manrope'] flex items-center gap-2 flex-wrap">
            <FileText className="w-5 h-5 text-amber-400" />
            Számlázz.hu integráció
            {Object.values(szamlazzStatus).every(Boolean) ? (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-normal">✓ Mind beállítva</span>
            ) : Object.values(szamlazzStatus).some(Boolean) ? (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-normal">⚠ Részben beállítva</span>
            ) : (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-normal">Nincs beállítva</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-5">
          <p className="text-slate-400 text-sm">
            Automatikus szabályok: Budapest -> X-CLEAN-AUTÓKOZMETIKA Kft.; Debrecen készpénz -> X-CLEAN-KÁRPIT Kft.; Debrecen kártya/átutalás vagy céges számla -> LB Human Kft.
          </p>
          <a
            href="https://www.szamlazz.hu/szamla/main?page=beallitasok"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-amber-400 text-xs hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Agent kulcs lekérése a Számlázz.hu fiókodból
          </a>

          {/* Budapest */}
          {[
            { entity: "budapest", label: "X-CLEAN-AUTÓKOZMETIKA Kft. API", desc: "Csak budapesti számlákhoz" },
            { entity: "debrecen_private", label: "X-CLEAN-KÁRPIT Kft. API", desc: "Debrecen készpénzes fizetéshez" },
            { entity: "debrecen_company", label: "LB Human Kft. API", desc: "Debrecen kártya/átutalás + debreceni céges számla" },
          ].map(({ entity, label, desc }) => (
            <div key={entity} className="p-3 rounded-lg border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-slate-500 text-xs">{desc}</p>
                </div>
                {szamlazzStatus[entity] ? (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">✓ Beállítva</span>
                ) : (
                  <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">Hiányzik</span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={szamlazzVisible[entity] ? "text" : "password"}
                    value={szamlazzKeys[entity]}
                    onChange={(e) => setSzamlazzKeys(s => ({ ...s, [entity]: e.target.value }))}
                    placeholder={szamlazzStatus[entity] ? "Felülíráshoz add meg az új kulcsot" : "Számlázz.hu agent kulcs"}
                    className="bg-slate-950 border-slate-700 text-white pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setSzamlazzVisible(v => ({ ...v, [entity]: !v[entity] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {szamlazzVisible[entity] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  onClick={() => handleSaveSzamlazzKey(entity)}
                  disabled={szamlazzSaving[entity] || !szamlazzKeys[entity]?.trim()}
                  className="bg-amber-600 hover:bg-amber-500 shrink-0"
                >
                  {szamlazzSaving[entity] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span className="ml-1 hidden sm:inline">Mentés</span>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Users Management */}
      <Card className="glass-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl text-white font-['Manrope'] flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            Felhasználók kezelése
          </CardTitle>
          <Dialog open={isNewUserOpen} onOpenChange={setIsNewUserOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-500" data-testid="new-user-btn">
                <Plus className="w-4 h-4 mr-2" />
                Új felhasználó
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-['Manrope']">Új felhasználó létrehozása</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-slate-300">Felhasználónév *</Label>
                  <Input
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="pelda.felhasznalo"
                    data-testid="new-user-username"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Jelszó *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="bg-slate-950 border-slate-700 text-white pr-10"
                      placeholder="••••••••"
                      data-testid="new-user-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Teljes név *</Label>
                  <Input
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="Kovács Péter"
                    data-testid="new-user-name"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Email</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="pelda@xclean.hu"
                    data-testid="new-user-email"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Szerepkör</Label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser({...newUser, role: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700" data-testid="new-user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="admin" className="text-white">Admin</SelectItem>
                      <SelectItem value="dolgozo" className="text-white">Dolgozó</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleCreateUser}
                  className="w-full bg-green-600 hover:bg-green-500"
                  disabled={!newUser.username || !newUser.password || !newUser.name}
                  data-testid="create-user-submit"
                >
                  Létrehozás
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {users.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nincs felhasználó</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3 p-4">
                {users.map((u) => (
                  <div 
                    key={u.user_id}
                    className="p-4 rounded-xl border border-slate-700 bg-slate-800/50"
                    data-testid={`user-card-${u.user_id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {u.picture ? (
                          <img src={u.picture} alt={u.name} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm">{u.name?.charAt(0) || 'U'}</span>
                          </div>
                        )}
                        <div>
                          <h3 className="text-white font-semibold">{u.name}</h3>
                          <p className="text-slate-400 text-xs font-mono">@{u.username || "n/a"}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={u.active !== false ? "default" : "destructive"}
                        className={`${u.active !== false ? "bg-green-600" : "bg-red-600"} text-xs`}
                      >
                        {u.active !== false ? "Aktív" : "Inaktív"}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-400 mb-3">{u.email || "Nincs email"}</div>
                    <div className="flex items-center justify-between">
                      <Select 
                        value={u.role} 
                        onValueChange={(v) => handleUpdateRole(u.user_id, v)}
                        disabled={u.user_id === user.user_id}
                      >
                        <SelectTrigger className="w-[100px] h-8 bg-slate-950 border-slate-700 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          <SelectItem value="admin" className="text-white">Admin</SelectItem>
                          <SelectItem value="dolgozo" className="text-white">Dolgozó</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-yellow-400" onClick={() => setResetPasswordUserId(u.user_id)}>
                          <Key className="w-4 h-4" />
                        </Button>
                        {u.user_id !== user.user_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`w-8 h-8 ${u.active !== false ? "text-slate-400 hover:text-red-400" : "text-slate-400 hover:text-green-400"}`}
                            onClick={() => handleToggleUserActive(u.user_id)}
                          >
                            {u.active !== false ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Név</TableHead>
                    <TableHead className="text-slate-400">Felhasználónév</TableHead>
                    <TableHead className="text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-400 text-center">Szerepkör</TableHead>
                    <TableHead className="text-slate-400 text-center">Státusz</TableHead>
                    <TableHead className="text-slate-400 w-24">Műveletek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow 
                      key={u.user_id}
                      className="border-slate-800 hover:bg-white/5"
                      data-testid={`user-row-${u.user_id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {u.picture ? (
                            <img src={u.picture} alt={u.name} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">{u.name?.charAt(0) || 'U'}</span>
                            </div>
                          )}
                          <span className="text-white font-medium">{u.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300 font-mono text-sm">{u.username || "-"}</TableCell>
                      <TableCell className="text-slate-300">{u.email || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Select 
                          value={u.role} 
                          onValueChange={(v) => handleUpdateRole(u.user_id, v)}
                          disabled={u.user_id === user.user_id}
                        >
                          <SelectTrigger className="w-[120px] mx-auto bg-slate-950 border-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="admin" className="text-white">Admin</SelectItem>
                            <SelectItem value="dolgozo" className="text-white">Dolgozó</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={u.active !== false ? "default" : "destructive"}
                          className={u.active !== false ? "bg-green-600" : "bg-red-600"}
                        >
                          {u.active !== false ? "Aktív" : "Inaktív"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-yellow-400"
                            onClick={() => setResetPasswordUserId(u.user_id)}
                            title="Jelszó visszaállítás"
                            data-testid={`reset-password-${u.user_id}`}
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                          {u.user_id !== user.user_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={u.active !== false ? "text-slate-400 hover:text-red-400" : "text-slate-400 hover:text-green-400"}
                              onClick={() => handleToggleUserActive(u.user_id)}
                              title={u.active !== false ? "Deaktiválás" : "Aktiválás"}
                              data-testid={`toggle-user-${u.user_id}`}
                            >
                              {u.active !== false ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Workers Management */}
      <Card className="glass-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl text-white font-['Manrope'] flex items-center gap-2">
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            Dolgozók kezelése
          </CardTitle>
          <Dialog open={isNewWorkerOpen} onOpenChange={setIsNewWorkerOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-500 w-full sm:w-auto" data-testid="new-worker-btn">
                <Plus className="w-4 h-4 mr-2" />
                Új dolgozó
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-['Manrope']">Új dolgozó hozzáadása</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-slate-300">Név</Label>
                  <Input
                    value={newWorker.name}
                    onChange={(e) => setNewWorker({...newWorker, name: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="Teljes név"
                    data-testid="new-worker-name"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Telefonszám</Label>
                  <Input
                    value={newWorker.phone}
                    onChange={(e) => setNewWorker({...newWorker, phone: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="+36 30 123 4567"
                    data-testid="new-worker-phone"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Telephely</Label>
                  <Select value={newWorker.location} onValueChange={(v) => setNewWorker({...newWorker, location: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700" data-testid="new-worker-location">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleCreateWorker}
                  className="w-full bg-green-600 hover:bg-green-500"
                  disabled={!newWorker.name}
                  data-testid="create-worker-submit"
                >
                  Létrehozás
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {workers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nincs dolgozó</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3 p-4">
                {workers.map((worker) => (
                  <div 
                    key={worker.worker_id}
                    className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 flex items-center justify-between"
                    data-testid={`worker-card-${worker.worker_id}`}
                  >
                    <div>
                      <h3 className="text-white font-semibold">{worker.name}</h3>
                      <p className="text-slate-400 text-xs flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" /> {worker.phone || "-"}
                      </p>
                      <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs mt-2">
                        <MapPin className="w-3 h-3 mr-1" />
                        {worker.location}
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-8 h-8 text-slate-400 hover:text-red-400"
                      onClick={() => setDeleteWorkerId(worker.worker_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Név</TableHead>
                    <TableHead className="text-slate-400">Telefonszám</TableHead>
                    <TableHead className="text-slate-400">Telephely</TableHead>
                    <TableHead className="text-slate-400 w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((worker) => (
                    <TableRow 
                      key={worker.worker_id}
                      className="border-slate-800 hover:bg-white/5"
                      data-testid={`worker-row-${worker.worker_id}`}
                    >
                      <TableCell className="text-white font-medium">{worker.name}</TableCell>
                      <TableCell className="text-slate-300">
                        <span className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-500" />
                          {worker.phone || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                          <MapPin className="w-3 h-3 mr-1" />
                          {worker.location}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-400 hover:text-red-400"
                          onClick={() => setDeleteWorkerId(worker.worker_id)}
                          data-testid={`delete-worker-${worker.worker_id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Worker Confirmation Dialog */}
      <Dialog open={!!deleteWorkerId} onOpenChange={() => setDeleteWorkerId(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Dolgozó törlése</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400">Biztosan törölni szeretnéd ezt a dolgozót?</p>
          <p className="text-white font-medium">{workers.find(w => w.worker_id === deleteWorkerId)?.name}</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteWorkerId(null)} className="border-slate-700">
              Mégse
            </Button>
            <Button variant="destructive" onClick={() => handleDeleteWorker(deleteWorkerId)} className="bg-red-600 hover:bg-red-700">
              Törlés
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUserId} onOpenChange={() => { setResetPasswordUserId(null); setNewPassword(""); }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-yellow-400 flex items-center gap-2">
              <Key className="w-5 h-5" />
              Jelszó visszaállítás
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-400">
            Új jelszó beállítása: <span className="text-white font-medium">{users.find(u => u.user_id === resetPasswordUserId)?.name}</span>
          </p>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-slate-300">Új jelszó</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white pr-10"
                  placeholder="Minimum 4 karakter"
                  data-testid="reset-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setResetPasswordUserId(null); setNewPassword(""); }} className="border-slate-700">
              Mégse
            </Button>
            <Button onClick={handleResetPassword} className="bg-yellow-600 hover:bg-yellow-500" disabled={!newPassword || newPassword.length < 4}>
              Mentés
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Data Cleanup Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-xl text-white font-['Manrope'] flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" />
            Adattisztítás
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-400 text-sm">
            Itt törölheted a törölt dolgozókhoz és ügyfelekhez tartozó régi munkákat és statisztikákat.
          </p>
          
          <Button 
            onClick={fetchOrphanedData}
            disabled={cleanupLoading}
            variant="outline"
            className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
          >
            {cleanupLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Keresés...</>
            ) : (
              <><Trash2 className="w-4 h-4 mr-2" /> Árva adatok keresése</>
            )}
          </Button>

          {orphanedData && (
            <div className="space-y-4 mt-4 p-4 bg-slate-950/50 rounded-lg border border-slate-700">
              {/* Orphaned Workers */}
              {orphanedData.orphaned_workers?.length > 0 && (
                <div>
                  <h4 className="text-white font-semibold mb-2">
                    Törölt dolgozók munkái ({orphanedData.orphaned_worker_job_count} munka)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {orphanedData.orphaned_workers.map(name => (
                      <Badge 
                        key={name}
                        className="bg-red-500/20 text-red-400 border border-red-500/30 cursor-pointer hover:bg-red-500/30"
                        onClick={() => handleCleanupWorker(name)}
                      >
                        {name} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Orphaned Customers */}
              {orphanedData.orphaned_customers?.length > 0 && (
                <div>
                  <h4 className="text-white font-semibold mb-2">
                    Törölt ügyfelek munkái ({orphanedData.orphaned_customer_job_count} munka)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {orphanedData.orphaned_customers.map(name => (
                      <Badge 
                        key={name}
                        className="bg-orange-500/20 text-orange-400 border border-orange-500/30 cursor-pointer hover:bg-orange-500/30"
                        onClick={() => handleCleanupCustomer(name)}
                      >
                        {name} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* No orphaned data */}
              {orphanedData.orphaned_workers?.length === 0 && orphanedData.orphaned_customers?.length === 0 && (
                <p className="text-green-400 text-center py-4">
                  <Check className="w-5 h-5 inline mr-2" />
                  Nincs árva adat - minden rendben!
                </p>
              )}

              {/* Delete all button */}
              {(orphanedData.orphaned_worker_job_count > 0 || orphanedData.orphaned_customer_job_count > 0) && (
                <Button
                  onClick={handleCleanupAllOrphaned}
                  disabled={cleanupLoading}
                  className="w-full bg-red-600 hover:bg-red-500 mt-4"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Összes árva adat törlése ({orphanedData.orphaned_worker_job_count + orphanedData.orphaned_customer_job_count} munka)
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <AppearanceSettings />
    </div>
  );
};

// ── Appearance Settings Component ─────────────────────────────────────────────
const AppearanceSettings = () => {
  const [theme, setTheme] = useState(getStoredTheme());
  const [compact, setCompact] = useState(getStoredCompact());

  const handleTheme = (t) => {
    applyTheme(t);
    setTheme(t);
  };
  const handleCompact = (c) => {
    applyCompact(c);
    setCompact(c);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl text-white font-['Manrope'] flex items-center gap-2">
          <Monitor className="w-5 h-5 text-purple-400" />
          Megjelenés
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-6">
        {/* Theme */}
        <div>
          <Label className="text-slate-300 mb-3 block">Téma</Label>
          <div className="flex gap-2">
            {[
              { id: "dark", label: "Sötét", icon: Moon },
              { id: "light", label: "Világos", icon: Sun },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTheme(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  theme === id
                    ? "bg-green-500/20 border-green-500/50 text-green-400"
                    : "bg-slate-900/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          {theme === "light" && (
            <p className="text-xs text-amber-400 mt-2">
              ⚠ A világos téma kísérleti — néhány elem elrendezése eltérhet.
            </p>
          )}
        </div>

        {/* Compact mode */}
        <div>
          <Label className="text-slate-300 mb-3 block">Nézet sűrűség</Label>
          <div className="flex gap-2">
            {[
              { id: false, label: "Normál" },
              { id: true, label: "Kompakt" },
            ].map(({ id, label }) => (
              <button
                key={String(id)}
                onClick={() => handleCompact(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  compact === id
                    ? "bg-green-500/20 border-green-500/50 text-green-400"
                    : "bg-slate-900/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
                }`}
              >
                <Layout className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Kompakt nézetben a sorok és kártyák kisebb helyen jelennek meg.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
